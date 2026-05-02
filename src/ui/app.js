import { byId } from "./dom.js";
import { renderBoard, applyCellView } from "./boardView.js";
import { decideNextUiActions, UiActionKind } from "./solverBridge.js";
import { clearGameState, loadGameState, saveGameState } from "./storage.js";
import { createPlayGame } from "./playGame.js";
import { MODAL_CONTENTS } from "./modalContents.js";
import { showAnalyzer, hideAnalyzer } from "./screens.js";
import {
  ANALYZER_CELL,
  BOARD,
  MASCOT,
  MASCOT_MESSAGE,
  RANDOM_GAME,
} from "./constants.js";

const ARROW_KEYS = Object.freeze({
  ArrowUp: { dr: -1, dc: 0 },
  ArrowDown: { dr: 1, dc: 0 },
  ArrowLeft: { dr: 0, dc: -1 },
  ArrowRight: { dr: 0, dc: 1 },
});

/**
 * @typedef {{kind:"closed"|"open0"|"number"|"flag", value:number|null}} UiCell
 * @typedef {{width:number, height:number, cells:UiCell[][]}} GameState
 */

/** @param {Document} doc */
export function createApp(doc) {
  const els = collectElements(doc);

  /** @type {GameState} */
  let gameState = createEmptyState(BOARD.DEFAULT_WIDTH, BOARD.DEFAULT_HEIGHT);
  /** @type {{r:number, c:number}|null} */
  let menuTarget = null;
  /** @type {Set<string>} */
  const safeHints = new Set();
  /** @type {number} */
  let totalBombs = BOARD.DEFAULT_BOMBS;
  /** @type {number|null} */
  let statusTimerId = null;
  /** @type {ReturnType<typeof createPlayGame>|null} */
  let playGame = null;

  function debug(...args) {
    console.log("[Mines Buddy]", ...args);
  }

  function setMascot(hasOptions) {
    const next = hasOptions ? MASCOT.HAPPY_SRC : MASCOT.SAD_SRC;
    if (els.mascotImg.getAttribute("src") !== next) {
      els.mascotImg.setAttribute("src", next);
    }
  }

  function setStatus(text) {
    if (statusTimerId != null) {
      window.clearTimeout(statusTimerId);
      statusTimerId = null;
    }
    els.statusText.textContent = text;
  }

  function setStatusTemporary(text, ms) {
    setStatus(text);
    statusTimerId = window.setTimeout(() => {
      statusTimerId = null;
      setStatus(MASCOT_MESSAGE.INITIAL);
    }, ms);
  }

  function persist() {
    saveGameState({
      width: gameState.width,
      height: gameState.height,
      totalBombs,
      cells: gameState.cells,
    });
  }

  function countFlags() {
    let flags = 0;
    for (const row of gameState.cells) {
      for (const cell of row) if (cell.kind === "flag") flags++;
    }
    return flags;
  }

  function updateBombCounter() {
    const remaining = Math.max(0, totalBombs - countFlags());
    els.bombCounterText.textContent = `Bombas restantes: ${remaining}/${totalBombs}`;
  }

  function celebrateAllBombsFlaggedIfComplete() {
    if (totalBombs <= 0) return false;
    if (countFlags() !== totalBombs) return false;
    setMascot(true);
    setStatus(MASCOT_MESSAGE.CELEBRATION);
    return true;
  }

  function getCellEl(r, c) {
    return /** @type {HTMLElement|null} */ (
      els.board.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`)
    );
  }

  function setCellState(r, c, next) {
    const row = gameState.cells[r];
    if (!row) return;
    const flagsBefore = countFlags();
    row[c] = next;

    const el = getCellEl(r, c);
    if (el) applyCellView(el, next);
    clearSafeHint(r, c);
    updateBombCounter();
    persist();
    if (totalBombs > 0 && flagsBefore < totalBombs) {
      celebrateAllBombsFlaggedIfComplete();
    }
  }

  function keyOf(r, c) {
    return `${r},${c}`;
  }

  function markSafeHint(r, c) {
    const el = getCellEl(r, c);
    if (!el) return;
    safeHints.add(keyOf(r, c));
    el.classList.add("hint-safe");
  }

  function clearSafeHint(r, c) {
    const k = keyOf(r, c);
    if (!safeHints.has(k)) return;
    safeHints.delete(k);
    const el = getCellEl(r, c);
    if (el) el.classList.remove("hint-safe");
  }

  function clearAllHints() {
    if (safeHints.size === 0) return;
    for (const k of safeHints) {
      const [rStr, cStr] = k.split(",");
      const el = getCellEl(Number(rStr), Number(cStr));
      if (el) el.classList.remove("hint-safe");
    }
    safeHints.clear();
  }

  function openMenuAtCell(r, c, cellEl) {
    const wrap = els.board.parentElement;
    const wrapRect = wrap?.getBoundingClientRect();
    if (!wrap || !wrapRect) return;

    const rect = cellEl.getBoundingClientRect();
    const x = rect.left - wrapRect.left + wrap.scrollLeft + 48;
    const y = rect.top - wrapRect.top + wrap.scrollTop - 10;

    menuTarget = { r, c };
    els.cellMenu.style.left = `${Math.min(x, wrapRect.width - 240)}px`;
    els.cellMenu.style.top = `${Math.max(8, y)}px`;
    els.cellMenu.classList.add("is-open");
    els.cellMenu.setAttribute("aria-hidden", "false");
    renderMenuContent();
  }

  function closeMenu() {
    menuTarget = null;
    els.cellMenu.classList.remove("is-open");
    els.cellMenu.setAttribute("aria-hidden", "true");
    els.cellMenu.innerHTML = "";
  }

  function focusCell(r, c) {
    const el = getCellEl(r, c);
    if (!el) return false;
    el.focus();
    return true;
  }

  function focusNextCell(r, c) {
    const cols = gameState.width;
    const rows = gameState.height;
    const nextIdx = r * cols + c + 1;

    if (nextIdx >= rows * cols) {
      getCellEl(r, c)?.blur?.();
      return;
    }

    const nr = Math.floor(nextIdx / cols);
    const nc = nextIdx % cols;
    if (!focusCell(nr, nc)) getCellEl(r, c)?.blur?.();
  }

  function focusRelative(r, c, dr, dc) {
    const nr = Math.max(0, Math.min(gameState.height - 1, r + dr));
    const nc = Math.max(0, Math.min(gameState.width - 1, c + dc));
    if (nr === r && nc === c) return;
    closeMenu();
    focusCell(nr, nc);
  }

  function renderMenuContent() {
    els.cellMenu.innerHTML = "";

    const title = doc.createElement("p");
    title.className = "menuTitle";
    title.textContent = "Definir célula:";
    els.cellMenu.appendChild(title);

    const grid = doc.createElement("div");
    grid.className = "menuGrid";

    const closedBtn = createMenuButton("Fechada", { kind: "closed", value: null });
    closedBtn.classList.add("is-closed");
    grid.appendChild(closedBtn);

    const openBtn = createMenuButton("Vazio/0", { kind: "open0", value: null });
    openBtn.classList.add("is-open0");
    grid.appendChild(openBtn);

    const flagBtn = createMenuButton("Bandeira", { kind: "flag", value: null });
    flagBtn.classList.add("is-flag");
    flagBtn.textContent = "🎀";
    grid.appendChild(flagBtn);

    for (let n = 1; n <= 8; n++) {
      const numberBtn = createMenuButton(String(n), { kind: "number", value: n });
      numberBtn.textContent = String(n);
      grid.appendChild(numberBtn);
    }

    els.cellMenu.appendChild(grid);
  }

  function createMenuButton(label, payload) {
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "menuBtn";
    btn.dataset.action = "setCell";
    btn.dataset.payload = JSON.stringify(payload);
    btn.setAttribute("aria-label", label);
    return btn;
  }

  function applyKeyboardToCell(key, r, c) {
    if (key === "Backspace" || key === "Delete") {
      setCellState(r, c, { kind: "closed", value: null });
      return true;
    }
    if (key === "f" || key === "F") {
      setCellState(r, c, { kind: "flag", value: null });
      return true;
    }
    if (key === "0") {
      setCellState(r, c, { kind: "open0", value: null });
      return true;
    }
    if (key >= "1" && key <= "8") {
      setCellState(r, c, { kind: "number", value: Number(key) });
      return true;
    }
    return false;
  }

  function fitBoardToContainer() {
    const wrap = els.board.parentElement;
    const cols = gameState.width;
    if (!wrap || cols <= 0) return;

    const style = getComputedStyle(els.board);
    const gap = Number.parseFloat(style.getPropertyValue("--cell-gap")) || ANALYZER_CELL.DEFAULT_GAP;
    const available = Math.max(240, wrap.clientWidth - 24);
    const rawSize = Math.floor((available - gap * (cols - 1)) / cols);
    const size = Math.max(ANALYZER_CELL.MIN_SIZE, Math.min(ANALYZER_CELL.MAX_SIZE, rawSize));

    els.board.style.setProperty("--cell-size", `${size}px`);
    els.board.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size, ${ANALYZER_CELL.MAX_SIZE}px))`;
    els.board.style.gridAutoRows = `var(--cell-size, ${ANALYZER_CELL.MAX_SIZE}px)`;
  }

  function reset() {
    closeMenu();
    clearAllHints();
    setStatus("Tabuleiro limpo (células fechadas).");
    setMascot(true);

    gameState = createEmptyState(gameState.width, gameState.height);
    renderBoard(els.board, gameState.width, gameState.height);
    fitBoardToContainer();
    updateBombCounter();
    persist();
  }

  function resetCache() {
    clearGameState();
    closeMenu();
    clearAllHints();

    totalBombs = BOARD.DEFAULT_BOMBS;
    gameState = createEmptyState(BOARD.DEFAULT_WIDTH, BOARD.DEFAULT_HEIGHT);

    els.heightInput.value = String(BOARD.DEFAULT_HEIGHT);
    els.widthInput.value = String(BOARD.DEFAULT_WIDTH);
    els.bombsInput.value = String(BOARD.DEFAULT_BOMBS);

    renderBoard(els.board, gameState.width, gameState.height);
    fitBoardToContainer();
    updateBombCounter();
    persist();

    setMascot(true);
    setStatusTemporary("Cache resetado. Tabuleiro padrão carregado.", 3500);
  }

  function generateBoardFromInputs() {
    const height = parseSize(els.heightInput, BOARD.DEFAULT_HEIGHT, BOARD.MAX_HEIGHT);
    const width = parseSize(els.widthInput, BOARD.DEFAULT_WIDTH, BOARD.MAX_WIDTH);
    const bombs = parseBombs(els.bombsInput, width * height, totalBombs);

    els.heightInput.value = String(height);
    els.widthInput.value = String(width);
    els.bombsInput.value = String(bombs);
    totalBombs = bombs;

    gameState = createEmptyState(width, height);
    renderBoard(els.board, width, height);
    fitBoardToContainer();
    closeMenu();
    clearAllHints();
    updateBombCounter();
    persist();

    setStatus(`Campo gerado: ${height}x${width} com ${totalBombs} bomba(s).`);
    setMascot(true);
  }

  function analyzeAndMark() {
    closeMenu();
    clearAllHints();

    try {
      if (!hasAnyFilledCell(gameState)) {
        setMascot(true);
        setStatus(
          "O tabuleiro ainda está vazio. Preencha algumas células (0-8 e/ou 🎀) e tente analisar novamente.",
        );
        return;
      }

      const decisions = decideNextUiActions({
        width: gameState.width,
        height: gameState.height,
        cells: gameState.cells,
        totalBombs,
      });

      const summary = applyDecisions(decisions);

      if (celebrateAllBombsFlaggedIfComplete()) {
        debug("decisions", decisions);
        return;
      }

      const hasOptions = summary.flagged + summary.hinted > 0;
      setMascot(hasOptions);
      setStatus(
        hasOptions
          ? `🎀 ${summary.flagged} bandeira(s) · ✅ ${summary.hinted} casa(s) segura(s)`
          : "Sem dicas seguras agora. (｡•́︿•̀｡)",
      );
      debug("decisions", decisions);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`Ops… algo deu errado: ${msg}`);
      setMascot(true);
      debug("error", err);
    }
  }

  function applyDecisions(decisions) {
    let flagged = 0;
    let hinted = 0;

    for (const action of decisions) {
      const current = gameState.cells[action.r]?.[action.c];
      if (!current) continue;

      if (action.kind === UiActionKind.Flag) {
        if (current.kind === "closed") {
          setCellState(action.r, action.c, { kind: "flag", value: null });
          flagged++;
        }
        continue;
      }

      if (current.kind === "closed") {
        markSafeHint(action.r, action.c);
        hinted++;
      }
    }

    return { flagged, hinted };
  }

  function setNavLinkActive(btn, active) {
    if (!btn) return;
    btn.classList.toggle("is-active", !!active);
    btn.setAttribute("aria-current", active ? "true" : "false");
  }

  function clearModalNavLinkActives() {
    doc
      .querySelectorAll(".navLink.is-active[data-modal]")
      .forEach((b) => setNavLinkActive(/** @type {HTMLElement} */ (b), false));
  }

  function showAnalyzerScreen() {
    showAnalyzer(doc);
    playGame?.hide();
    setNavLinkActive(els.randomGameBtn, false);
    setMascot(true);
    setStatus(MASCOT_MESSAGE.INITIAL);
  }

  function showPlayScreen() {
    hideAnalyzer(doc);
    closeMenu();
    playGame?.show();
    setNavLinkActive(els.randomGameBtn, true);
  }

  function startRandomGame() {
    if (!playGame) return;
    showPlayScreen();
    playGame.startNewGame(pickRandomGameConfig());
  }

  function openModal(key) {
    const content = MODAL_CONTENTS[key];
    if (!content) return;
    els.modalTitle.textContent = content.title;
    els.modalBody.innerHTML = content.body;
    els.modalOverlay.classList.add("is-open");
    els.modalOverlay.setAttribute("aria-hidden", "false");
    clearModalNavLinkActives();
    const trigger = /** @type {HTMLElement|null} */ (
      doc.querySelector(`.navLink[data-modal="${key}"]`)
    );
    setNavLinkActive(trigger, true);
    setTimeout(() => els.modalClose.focus(), 0);
  }

  function closeModal() {
    if (!els.modalOverlay.classList.contains("is-open")) return;
    els.modalOverlay.classList.remove("is-open");
    els.modalOverlay.setAttribute("aria-hidden", "true");
    els.modalBody.innerHTML = "";
    els.modalTitle.textContent = "";
    clearModalNavLinkActives();
  }

  function goHome() {
    closeModal();
    showAnalyzerScreen();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restoreFromStorageIfAny() {
    const saved = loadGameState();
    if (!saved) return false;

    totalBombs = saved.totalBombs;
    els.heightInput.value = String(saved.height);
    els.widthInput.value = String(saved.width);
    els.bombsInput.value = String(saved.totalBombs);

    gameState = {
      width: saved.width,
      height: saved.height,
      cells: saved.cells,
    };

    renderBoard(els.board, gameState.width, gameState.height);
    fitBoardToContainer();

    for (let r = 0; r < gameState.height; r++) {
      for (let c = 0; c < gameState.width; c++) {
        const cellEl = getCellEl(r, c);
        if (cellEl) applyCellView(cellEl, gameState.cells[r][c]);
      }
    }

    updateBombCounter();
    setStatus("Voltei do cache local. Vamos lá? ♡");
    setMascot(true);
    return true;
  }

  function bindAnalyzerActions() {
    els.generateBtn.addEventListener("click", generateBoardFromInputs);
    els.analyzeBtn.addEventListener("click", analyzeAndMark);
    els.resetBtn.addEventListener("click", reset);
    els.resetCacheBtn.addEventListener("click", resetCache);

    els.heightInput.addEventListener("change", () => persist());
    els.widthInput.addEventListener("change", () => persist());
    els.bombsInput.addEventListener("change", () => {
      const maxCells = gameState.width * gameState.height;
      totalBombs = parseBombs(els.bombsInput, maxCells, totalBombs);
      els.bombsInput.value = String(totalBombs);
      updateBombCounter();
      persist();
    });
  }

  function bindBoardEvents() {
    els.board.addEventListener("click", (ev) => {
      const cellEl = findCellElement(ev.target);
      if (!cellEl) return;
      const { r, c } = readCellCoords(cellEl);
      if (r == null || c == null) return;
      cellEl.focus();
      openMenuAtCell(r, c, cellEl);
    });

    els.board.addEventListener("keydown", (ev) => {
      const cellEl = findCellElement(ev.target);
      if (!cellEl) return;
      const { r, c } = readCellCoords(cellEl);
      if (r == null || c == null) return;

      const arrow = ARROW_KEYS[ev.key];
      if (arrow) {
        ev.preventDefault();
        focusRelative(r, c, arrow.dr, arrow.dc);
        return;
      }

      if (applyKeyboardToCell(ev.key, r, c)) {
        ev.preventDefault();
        closeMenu();
        focusNextCell(r, c);
      }
    });
  }

  function bindCellMenuEvents() {
    els.cellMenu.addEventListener("click", (ev) => {
      const target = /** @type {HTMLElement|null} */ (ev.target);
      const btn = target?.closest?.("button[data-action='setCell']");
      if (!btn || !menuTarget) return;

      const payloadRaw = btn.getAttribute("data-payload") || "{}";
      /** @type {UiCell} */
      const payload = JSON.parse(payloadRaw);

      const { r, c } = menuTarget;
      setCellState(r, c, payload);
      closeMenu();
      focusNextCell(r, c);
    });

    doc.addEventListener("click", (ev) => {
      if (!els.cellMenu.classList.contains("is-open")) return;
      const target = /** @type {HTMLElement|null} */ (ev.target);
      if (!target) return;
      if (target.closest?.("#cellMenu")) return;
      if (target.closest?.(".cell")) return;
      if (target.closest?.(".mascotArea")) return;
      closeMenu();
    });
  }

  function bindNavEvents() {
    els.randomGameBtn.addEventListener("click", startRandomGame);

    doc.querySelectorAll("[data-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-modal");
        if (key) openModal(key);
      });
    });

    const brandLink = doc.querySelector(".topNavBrand");
    brandLink?.addEventListener("click", (ev) => {
      ev.preventDefault();
      goHome();
    });
  }

  function bindModalEvents() {
    els.modalClose.addEventListener("click", closeModal);
    els.modalOverlay.addEventListener("click", (ev) => {
      if (ev.target === els.modalOverlay) closeModal();
    });
    doc.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && els.modalOverlay.classList.contains("is-open")) {
        closeModal();
      }
    });
  }

  return Object.freeze({
    mount() {
      if (!restoreFromStorageIfAny()) {
        renderBoard(els.board, gameState.width, gameState.height);
        fitBoardToContainer();
        updateBombCounter();
        persist();
        setStatus(MASCOT_MESSAGE.INITIAL);
        setMascot(true);
      }

      playGame = createPlayGame(doc, {
        setMascot,
        setStatus,
        setStatusTemporary,
        onNewRandom: startRandomGame,
        onBack: showAnalyzerScreen,
      });

      bindAnalyzerActions();
      bindBoardEvents();
      bindCellMenuEvents();
      bindNavEvents();
      bindModalEvents();

      window.addEventListener("resize", () => fitBoardToContainer());

      debug("App carregado.");
      return this;
    },
  });
}

/** @param {Document} doc */
function collectElements(doc) {
  return {
    heightInput: /** @type {HTMLInputElement} */ (byId(doc, "heightInput")),
    widthInput: /** @type {HTMLInputElement} */ (byId(doc, "widthInput")),
    bombsInput: /** @type {HTMLInputElement} */ (byId(doc, "bombsInput")),
    generateBtn: /** @type {HTMLButtonElement} */ (byId(doc, "generateBtn")),
    analyzeBtn: /** @type {HTMLButtonElement} */ (byId(doc, "analyzeBtn")),
    resetBtn: /** @type {HTMLButtonElement} */ (byId(doc, "resetBtn")),
    resetCacheBtn: /** @type {HTMLButtonElement} */ (byId(doc, "resetCacheBtn")),
    randomGameBtn: /** @type {HTMLButtonElement} */ (byId(doc, "randomGameBtn")),
    modalOverlay: /** @type {HTMLElement} */ (byId(doc, "modalOverlay")),
    modalClose: /** @type {HTMLButtonElement} */ (byId(doc, "modalClose")),
    modalTitle: /** @type {HTMLElement} */ (byId(doc, "modalTitle")),
    modalBody: /** @type {HTMLElement} */ (byId(doc, "modalBody")),
    board: /** @type {HTMLElement} */ (byId(doc, "board")),
    cellMenu: /** @type {HTMLElement} */ (byId(doc, "cellMenu")),
    mascotImg: /** @type {HTMLImageElement} */ (byId(doc, "mascotImg")),
    bombCounterText: /** @type {HTMLElement} */ (byId(doc, "bombCounterText")),
    statusText: /** @type {HTMLElement} */ (byId(doc, "statusText")),
  };
}

function createEmptyState(width, height) {
  const cells = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ kind: "closed", value: null })),
  );
  return { width, height, cells };
}

function parseSize(el, fallback, max) {
  const raw = Number(el.value);
  if (!Number.isFinite(raw)) return fallback;
  return clamp(Math.trunc(raw), BOARD.MIN_DIMENSION, max);
}

function parseBombs(el, maxCells, fallback) {
  const raw = Number(el.value);
  if (!Number.isFinite(raw)) return fallback;
  return clamp(Math.trunc(raw), BOARD.MIN_BOMBS, Math.min(BOARD.MAX_BOMBS, maxCells));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** @returns {{height:number, width:number, bombs:number}} */
function pickRandomGameConfig() {
  const height = randomInt(RANDOM_GAME.MIN_HEIGHT, RANDOM_GAME.MAX_HEIGHT);
  const width = randomInt(RANDOM_GAME.MIN_WIDTH, RANDOM_GAME.MAX_WIDTH);
  const total = height * width;
  const ratioRange = RANDOM_GAME.MAX_BOMB_RATIO - RANDOM_GAME.MIN_BOMB_RATIO;
  const ratio = RANDOM_GAME.MIN_BOMB_RATIO + Math.random() * ratioRange;
  const safeMax = total - RANDOM_GAME.FIRST_CLICK_SAFE_AREA;
  const bombs = clamp(Math.round(total * ratio), RANDOM_GAME.MIN_BOMBS, safeMax);
  return { height, width, bombs };
}

/** @param {{cells: UiCell[][]}} state */
function hasAnyFilledCell(state) {
  return state.cells.some((row) => row.some((c) => c.kind !== "closed"));
}

/** @param {EventTarget|null} target */
function findCellElement(target) {
  const el = /** @type {HTMLElement|null} */ (target);
  return /** @type {HTMLElement|null} */ (el?.closest?.(".cell")) ?? null;
}

/** @param {HTMLElement} cellEl */
function readCellCoords(cellEl) {
  const r = Number(cellEl.dataset.r);
  const c = Number(cellEl.dataset.c);
  if (!Number.isInteger(r) || !Number.isInteger(c)) {
    return { r: null, c: null };
  }
  return { r, c };
}
