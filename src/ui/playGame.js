import { byId } from "./dom.js";
import { decideNextUiActions, UiActionKind } from "./solverBridge.js";
import { HINT_HIGHLIGHT_MS } from "./constants.js";

const GameStatus = Object.freeze({
  Idle: "idle",
  Playing: "playing",
  Won: "won",
  Lost: "lost",
});

const PLAY_CELL = Object.freeze({
  MIN_SIZE: 20,
  MAX_SIZE: 38,
  DEFAULT_SIZE: 36,
  GAP: 4,
  CONTAINER_PADDING: 24,
  MIN_AVAILABLE: 240,
});

/** Vizinhos pré-computados das 8 direções para flood-fill / contagem. */
const NEIGHBOR_OFFSETS = Object.freeze([
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
]);

const ARROW_KEYS = Object.freeze({
  ArrowUp: { dr: -1, dc: 0 },
  ArrowDown: { dr: 1, dc: 0 },
  ArrowLeft: { dr: 0, dc: -1 },
  ArrowRight: { dr: 0, dc: 1 },
});

const CELL_STATE_CLASSES = Object.freeze([
  "is-closed",
  "is-open",
  "is-open0",
  "is-number",
  "is-bomb",
  "is-flag",
  "is-exploded",
  "n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8",
]);

const TIMER_TICK_MS = 250;
const HINT_COOLDOWN_MS = 3000;

/**
 * @param {Document} doc
 * @param {{
 *   setMascot:(hasOptions:boolean)=>void,
 *   setStatus:(text:string)=>void,
 *   setStatusTemporary:(text:string, ms:number)=>void,
 *   onNewRandom:()=>void,
 *   onBack:()=>void,
 * }} options
 */
export function createPlayGame(doc, options) {
  const els = collectElements(doc);
  const { setMascot, setStatus: speak, setStatusTemporary: speakTemp } = options;

  let width = 0;
  let height = 0;
  let totalBombs = 0;
  /** @type {Set<string>} */ let bombs = new Set();
  /** @type {Set<string>} */ let revealed = new Set();
  /** @type {Set<string>} */ let flagged = new Set();
  /** @type {number[][]} */ let neighbors = [];
  let status = GameStatus.Idle;
  let firstClickDone = false;
  let timerStart = 0;
  /** @type {number|null} */ let timerInterval = null;
  /** @type {Set<string>} */ const transientHints = new Set();

  function key(r, c) {
    return `${r},${c}`;
  }

  function inBounds(r, c) {
    return r >= 0 && r < height && c >= 0 && c < width;
  }

  function eachNeighbor(r, c, fn) {
    for (const [dr, dc] of NEIGHBOR_OFFSETS) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc)) fn(nr, nc);
    }
  }

  function placeBombs(avoidR, avoidC) {
    bombs = new Set();
    const avoid = new Set([key(avoidR, avoidC)]);
    eachNeighbor(avoidR, avoidC, (nr, nc) => avoid.add(key(nr, nc)));

    const candidates = [];
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const k = key(r, c);
        if (!avoid.has(k)) candidates.push(k);
      }
    }

    const placeCount = Math.min(totalBombs, candidates.length);
    for (let i = 0; i < placeCount; i++) {
      const j = i + Math.floor(Math.random() * (candidates.length - i));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      bombs.add(candidates[i]);
    }

    neighbors = Array.from({ length: height }, () => new Array(width).fill(0));
    for (const bk of bombs) {
      const [r, c] = bk.split(",").map(Number);
      eachNeighbor(r, c, (nr, nc) => {
        if (!bombs.has(key(nr, nc))) neighbors[nr][nc]++;
      });
    }
  }

  function clearTransientHints() {
    if (transientHints.size === 0) return;
    for (const k of transientHints) {
      const [r, c] = k.split(",").map(Number);
      const el = getCellEl(r, c);
      if (el) el.classList.remove("hint-safe", "hint-bomb");
    }
    transientHints.clear();
  }

  function renderBoard() {
    els.board.innerHTML = "";
    els.board.style.gridTemplateColumns = `repeat(${width}, var(--cell-size, ${PLAY_CELL.DEFAULT_SIZE}px))`;
    els.board.style.gridAutoRows = `var(--cell-size, ${PLAY_CELL.DEFAULT_SIZE}px)`;

    const frag = doc.createDocumentFragment();
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        frag.appendChild(createCellButton(r, c));
      }
    }
    els.board.appendChild(frag);
    fitBoard();
  }

  function createCellButton(r, c) {
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "cell is-closed";
    btn.dataset.r = String(r);
    btn.dataset.c = String(c);
    btn.setAttribute("role", "gridcell");
    btn.setAttribute("aria-label", `Célula ${r + 1}, ${c + 1}`);
    return btn;
  }

  function fitBoard() {
    const wrap = els.board.parentElement;
    if (!wrap || width <= 0) return;

    const available = Math.max(
      PLAY_CELL.MIN_AVAILABLE,
      wrap.clientWidth - PLAY_CELL.CONTAINER_PADDING,
    );
    const rawSize = Math.floor((available - PLAY_CELL.GAP * (width - 1)) / width);
    const size = Math.max(PLAY_CELL.MIN_SIZE, Math.min(PLAY_CELL.MAX_SIZE, rawSize));

    els.board.style.setProperty("--cell-size", `${size}px`);
    els.board.style.setProperty("--cell-gap", `${PLAY_CELL.GAP}px`);
    els.board.style.gridTemplateColumns = `repeat(${width}, ${size}px)`;
    els.board.style.gridAutoRows = `${size}px`;
    els.board.style.gap = `${PLAY_CELL.GAP}px`;
  }

  function getCellEl(r, c) {
    return /** @type {HTMLElement|null} */ (
      els.board.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`)
    );
  }

  function applyCellView(r, c) {
    const el = getCellEl(r, c);
    if (!el) return;
    resetCellClasses(el);
    paintCell(el, r, c);
  }

  function resetCellClasses(el) {
    el.classList.remove(...CELL_STATE_CLASSES);
    el.textContent = "";
    el.removeAttribute("aria-pressed");
  }

  function paintCell(el, r, c) {
    const k = key(r, c);
    const labelPrefix = `Linha ${r + 1}, coluna ${c + 1}`;

    if (revealed.has(k)) {
      if (bombs.has(k)) {
        el.classList.add("is-open", "is-bomb");
        el.setAttribute("aria-label", `${labelPrefix}: bomba`);
        return;
      }
      const n = neighbors[r][c];
      if (n === 0) {
        el.classList.add("is-open", "is-open0");
        el.setAttribute("aria-label", `${labelPrefix}: vazio`);
      } else {
        el.classList.add("is-open", "is-number", `n${n}`);
        el.textContent = String(n);
        el.setAttribute("aria-label", `${labelPrefix}: ${n}`);
      }
      return;
    }

    if (flagged.has(k)) {
      el.classList.add("is-flag");
      el.setAttribute("aria-pressed", "true");
      el.setAttribute("aria-label", `${labelPrefix}: bandeira`);
      return;
    }

    el.classList.add("is-closed");
    el.setAttribute("aria-label", `${labelPrefix}: fechada`);
  }

  function updateBombsDisplay() {
    const remaining = Math.max(0, totalBombs - flagged.size);
    els.bombsText.textContent = `${remaining}/${totalBombs}`;
  }

  function setTimerDisplay(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    els.timerText.textContent = `${pad2(m)}:${pad2(s)}`;
  }

  function startTimer() {
    timerStart = Date.now();
    if (timerInterval != null) window.clearInterval(timerInterval);
    timerInterval = window.setInterval(() => {
      const sec = Math.floor((Date.now() - timerStart) / 1000);
      setTimerDisplay(sec);
    }, TIMER_TICK_MS);
  }

  function stopTimer() {
    if (timerInterval != null) {
      window.clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function startNewGame({ height: h, width: w, bombs: requestedBombs }) {
    height = h;
    width = w;
    totalBombs = clampBombsForArea(requestedBombs, h * w);
    bombs = new Set();
    revealed = new Set();
    flagged = new Set();
    neighbors = createZeroGrid(h, w);
    status = GameStatus.Idle;
    firstClickDone = false;
    transientHints.clear();
    stopTimer();
    timerStart = 0;
    setTimerDisplay(0);

    renderBoard();
    updateBombsDisplay();

    setMascot(true);
    speak(
      `Boa sorte! ${h}x${w} com ${totalBombs} bombas. Clique em qualquer célula para começar (a primeira nunca é bomba). Se precisar de ajuda, é só apertar “Pedir dica” que eu te ajudo ♡`,
    );
  }

  function revealAt(r, c) {
    if (isGameOver()) return;
    const k = key(r, c);
    if (flagged.has(k) || revealed.has(k)) return;

    if (!firstClickDone) {
      placeBombs(r, c);
      firstClickDone = true;
      status = GameStatus.Playing;
      startTimer();
    }

    clearTransientHints();

    if (bombs.has(k)) {
      revealed.add(k);
      applyCellView(r, c);
      getCellEl(r, c)?.classList.add("is-exploded");
      explode();
      return;
    }

    floodReveal(k);
    checkWin();
  }

  function floodReveal(startKey) {
    const stack = [startKey];
    while (stack.length > 0) {
      const cur = stack.pop();
      if (revealed.has(cur) || flagged.has(cur)) continue;

      const [cr, cc] = cur.split(",").map(Number);
      revealed.add(cur);
      applyCellView(cr, cc);

      if (neighbors[cr][cc] !== 0) continue;

      eachNeighbor(cr, cc, (nr, nc) => {
        const nk = key(nr, nc);
        if (!revealed.has(nk) && !flagged.has(nk) && !bombs.has(nk)) {
          stack.push(nk);
        }
      });
    }
  }

  function toggleFlag(r, c) {
    if (isGameOver()) return;
    const k = key(r, c);
    if (revealed.has(k)) return;
    if (flagged.has(k)) flagged.delete(k);
    else flagged.add(k);
    applyCellView(r, c);
    updateBombsDisplay();
  }

  function explode() {
    status = GameStatus.Lost;
    stopTimer();
    revealAllBombs();
    setMascot(false);
    speak(
      "Aiii... a bomba estourou! (｡•́︿•̀｡) Clique em “Reiniciar” pra tentar de novo, ou “Novo aleatório” pra outro tabuleiro.",
    );
  }

  function revealAllBombs() {
    for (const bk of bombs) {
      if (revealed.has(bk)) continue;
      revealed.add(bk);
      const [r, c] = bk.split(",").map(Number);
      applyCellView(r, c);
    }
  }

  function checkWin() {
    const safeTotal = width * height - totalBombs;
    let revealedSafe = 0;
    for (const k of revealed) {
      if (!bombs.has(k)) revealedSafe++;
    }
    if (revealedSafe < safeTotal) return;

    status = GameStatus.Won;
    stopTimer();
    flagAllBombs();
    updateBombsDisplay();
    setMascot(true);
    speak(
      "Você venceu! Todas as células seguras foram reveladas. Mandou muito bem ♡ (˃͈◡˂͈)",
    );
  }

  function flagAllBombs() {
    for (const bk of bombs) {
      flagged.add(bk);
      const [r, c] = bk.split(",").map(Number);
      applyCellView(r, c);
    }
  }

  function buildAnalyzerView() {
    const cells = Array.from({ length: height }, () => new Array(width));
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        cells[r][c] = describeCellForSolver(r, c);
      }
    }
    return cells;
  }

  function describeCellForSolver(r, c) {
    const k = key(r, c);

    if (revealed.has(k)) {
      if (bombs.has(k)) return { kind: "flag", value: null };
      const n = neighbors[r][c];
      return n === 0
        ? { kind: "open0", value: null }
        : { kind: "number", value: n };
    }

    if (flagged.has(k)) return { kind: "flag", value: null };
    return { kind: "closed", value: null };
  }

  function highlightHint(r, c, kind) {
    const el = getCellEl(r, c);
    if (!el) return;

    const className = kind === "bomb" ? "hint-bomb" : "hint-safe";
    el.classList.add(className);
    transientHints.add(key(r, c));

    window.setTimeout(() => {
      el.classList.remove(className);
      transientHints.delete(key(r, c));
    }, HINT_HIGHLIGHT_MS);
  }

  function requestHint() {
    if (isGameOver()) {
      speakTemp("Esse jogo já acabou. Que tal um novo? ♡", HINT_COOLDOWN_MS);
      return;
    }

    if (!firstClickDone) {
      setMascot(true);
      speak(
        "Comece por qualquer célula, eu gosto do meio! A primeira jogada nunca conterá uma bomba ♡",
      );
      return;
    }

    const decisions = computeHintDecisions();
    if (!decisions) return;

    if (suggestSafeMove(decisions)) return;
    if (suggestBombFlag(decisions)) return;

    setMascot(false);
    speak("Sem jogadas seguras óbvias agora. Pode ser hora de chutar... (｡•́︿•̀｡)");
  }

  function computeHintDecisions() {
    try {
      return decideNextUiActions({
        width,
        height,
        cells: buildAnalyzerView(),
        totalBombs,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      speak(`Não consegui pensar agora: ${msg}`);
      return null;
    }
  }

  function suggestSafeMove(decisions) {
    const safe = decisions.find(
      (a) =>
        a.kind === UiActionKind.Safe &&
        !revealed.has(key(a.r, a.c)) &&
        !flagged.has(key(a.r, a.c)),
    );
    if (!safe) return false;
    highlightHint(safe.r, safe.c, "safe");
    setMascot(true);
    speak(`Olha aí! A célula linha ${safe.r + 1}, coluna ${safe.c + 1} é segura ♡`);
    return true;
  }

  function suggestBombFlag(decisions) {
    const flag = decisions.find(
      (a) =>
        a.kind === UiActionKind.Flag &&
        !flagged.has(key(a.r, a.c)) &&
        !revealed.has(key(a.r, a.c)),
    );
    if (!flag) return false;
    highlightHint(flag.r, flag.c, "bomb");
    setMascot(true);
    speak(
      `Cuidado! Linha ${flag.r + 1}, coluna ${flag.c + 1} é bomba certa, marque com 🎀.`,
    );
    return true;
  }

  function isGameOver() {
    return status === GameStatus.Won || status === GameStatus.Lost;
  }

  function show() {
    els.screen.hidden = false;
  }

  function hide() {
    els.screen.hidden = true;
    stopTimer();
    clearTransientHints();
  }

  function isVisible() {
    return !els.screen.hidden;
  }

  function bindBoardEvents() {
    els.board.addEventListener("click", (ev) => {
      const coords = readCellCoordsFrom(ev.target);
      if (coords) revealAt(coords.r, coords.c);
    });

    els.board.addEventListener("contextmenu", (ev) => {
      const coords = readCellCoordsFrom(ev.target);
      if (!coords) return;
      ev.preventDefault();
      toggleFlag(coords.r, coords.c);
    });

    els.board.addEventListener("keydown", (ev) => {
      const coords = readCellCoordsFrom(ev.target);
      if (!coords) return;
      handleBoardKey(ev, coords.r, coords.c);
    });
  }

  function handleBoardKey(ev, r, c) {
    if (ev.key === "f" || ev.key === "F") {
      ev.preventDefault();
      toggleFlag(r, c);
      return;
    }

    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      revealAt(r, c);
      return;
    }

    const arrow = ARROW_KEYS[ev.key];
    if (!arrow) return;

    ev.preventDefault();
    const nr = Math.max(0, Math.min(height - 1, r + arrow.dr));
    const nc = Math.max(0, Math.min(width - 1, c + arrow.dc));
    getCellEl(nr, nc)?.focus();
  }

  function bindActionButtons() {
    els.hintBtn.addEventListener("click", requestHint);
    els.restartBtn.addEventListener("click", () => {
      if (height > 0 && width > 0 && totalBombs >= 0) {
        startNewGame({ height, width, bombs: totalBombs });
      }
    });
    els.newRandomBtn.addEventListener("click", () => options.onNewRandom?.());
    els.backBtn.addEventListener("click", () => options.onBack?.());
  }

  function bindEvents() {
    bindBoardEvents();
    bindActionButtons();
    window.addEventListener("resize", () => {
      if (isVisible()) fitBoard();
    });
  }

  bindEvents();

  return Object.freeze({
    show,
    hide,
    isVisible,
    startNewGame,
  });
}

/** @param {Document} doc */
function collectElements(doc) {
  return {
    screen: byId(doc, "screenPlay"),
    board: byId(doc, "playBoard"),
    bombsText: byId(doc, "playBombsRemainingText"),
    timerText: byId(doc, "playTimerText"),
    hintBtn: /** @type {HTMLButtonElement} */ (byId(doc, "playHintBtn")),
    restartBtn: /** @type {HTMLButtonElement} */ (byId(doc, "playRestartBtn")),
    newRandomBtn: /** @type {HTMLButtonElement} */ (byId(doc, "playNewRandomBtn")),
    backBtn: /** @type {HTMLButtonElement} */ (byId(doc, "backToAnalyzerBtn")),
  };
}

/** Garante uma área 3x3 segura ao redor da primeira jogada. */
function clampBombsForArea(requested, totalCells) {
  const SAFE_AREA = 9;
  const max = Math.max(0, totalCells - SAFE_AREA);
  return Math.min(requested, max);
}

function createZeroGrid(rows, cols) {
  return Array.from({ length: rows }, () => new Array(cols).fill(0));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** @param {EventTarget|null} target */
function readCellCoordsFrom(target) {
  const el = /** @type {HTMLElement|null} */ (target);
  const cellEl = /** @type {HTMLElement|null} */ (el?.closest?.(".cell"));
  if (!cellEl) return null;
  const r = Number(cellEl.dataset.r);
  const c = Number(cellEl.dataset.c);
  if (!Number.isInteger(r) || !Number.isInteger(c)) return null;
  return { r, c };
}
