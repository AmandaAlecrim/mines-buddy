import { byId } from "./dom.js";
import { renderBoard, applyCellView } from "./boardView.js";
import { decideNextUiActions, UiActionKind } from "./solverBridge.js";
import {
  clearGameState,
  loadGameState,
  resetCellsKeepConfig,
  saveGameState,
} from "./storage.js";

export function createApp(doc) {
  const els = {
    heightInput: /** @type {HTMLInputElement} */ (byId(doc, "heightInput")),
    widthInput: /** @type {HTMLInputElement} */ (byId(doc, "widthInput")),
    bombsInput: /** @type {HTMLInputElement} */ (byId(doc, "bombsInput")),
    generateBtn: /** @type {HTMLButtonElement} */ (byId(doc, "generateBtn")),
    analyzeBtn: /** @type {HTMLButtonElement} */ (byId(doc, "analyzeBtn")),
    resetBtn: /** @type {HTMLButtonElement} */ (byId(doc, "resetBtn")),
    resetCacheBtn: /** @type {HTMLButtonElement} */ (byId(doc, "resetCacheBtn")),
    board: /** @type {HTMLElement} */ (byId(doc, "board")),
    cellMenu: /** @type {HTMLElement} */ (byId(doc, "cellMenu")),
    mascotImg: /** @type {HTMLImageElement} */ (byId(doc, "mascotImg")),
    bombCounterText: /** @type {HTMLElement} */ (byId(doc, "bombCounterText")),
    statusText: /** @type {HTMLElement} */ (byId(doc, "statusText")),
  };

  /** @type {{width:number, height:number, cells:Array<Array<{kind:"closed"|"open0"|"number"|"flag", value:number|null}>>}} */
  let gameState = createEmptyState(10, 10);

  /** @type {{r:number, c:number}|null} */
  let menuTarget = null;

  /** @type {Set<string>} */
  const safeHints = new Set();

  /** @type {number} */
  let totalBombs = 10;

  const MASCOT_DEFAULT_SRC = "./assets/landmine.png";
  const MASCOT_NO_OPTIONS_SRC = "./assets/landmine2.png";

  const INITIAL_STATUS = "Clique em “Analisar” para receber dicas. ˃͈◡˂͈";
  const CELEBRATION_STATUS =
    "Todas as bombas marcadas, mandou muito bem! ♡ (˃͈◡˂͈)";
  /** @type {number|null} */
  let statusTimerId = null;

  function setMascot(hasOptions) {
    const next = hasOptions ? MASCOT_DEFAULT_SRC : MASCOT_NO_OPTIONS_SRC;
    if (els.mascotImg.getAttribute("src") !== next) {
      els.mascotImg.setAttribute("src", next);
    }
  }

  function persist() {
    saveGameState({
      width: gameState.width,
      height: gameState.height,
      totalBombs,
      cells: gameState.cells,
    });
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
      setStatus(INITIAL_STATUS);
    }, ms);
  }

  function debug(...args) {
    console.log("[Mines Buddy]", ...args);
  }

  function countFlags() {
    let flags = 0;
    for (const row of gameState.cells) {
      for (const c of row) if (c.kind === "flag") flags++;
    }
    return flags;
  }

  function updateBombCounter() {
    const flags = countFlags();
    const remaining = Math.max(0, totalBombs - flags);
    els.bombCounterText.textContent = `Bombas restantes: ${remaining}/${totalBombs}`;
  }

  function celebrateAllBombsFlaggedIfComplete() {
    if (totalBombs <= 0) return false;
    if (countFlags() !== totalBombs) return false;
    setMascot(true);
    setStatus(CELEBRATION_STATUS);
    return true;
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

    totalBombs = 10;
    gameState = createEmptyState(10, 10);

    els.heightInput.value = "10";
    els.widthInput.value = "10";
    els.bombsInput.value = "10";

    renderBoard(els.board, gameState.width, gameState.height);
    fitBoardToContainer();
    updateBombCounter();
    persist();

    setMascot(true);
    setStatusTemporary("Cache resetado. Tabuleiro padrão carregado.", 3500);
  }

  function createEmptyState(width, height) {
    const cells = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ kind: "closed", value: null })),
    );
    return { width, height, cells };
  }

  function parseSize(el, fallback) {
    const n = Number(el.value);
    if (!Number.isFinite(n)) return fallback;
    const i = Math.trunc(n);
    return Math.max(1, Math.min(35, i));
  }

  function parseBombs(el, maxCells, fallback) {
    const n = Number(el.value);
    if (!Number.isFinite(n)) return fallback;
    const i = Math.trunc(n);
    return Math.max(0, Math.min(maxCells, i));
  }

  function generateBoardFromInputs() {
    const height = parseSize(els.heightInput, 10);
    const width = parseSize(els.widthInput, 10);
    const maxCells = width * height;
    const bombs = parseBombs(els.bombsInput, maxCells, totalBombs);

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
      const r = Number(rStr);
      const c = Number(cStr);
      const el = getCellEl(r, c);
      if (el) el.classList.remove("hint-safe");
    }
    safeHints.clear();
  }

  function openMenuAtCell(r, c, cellEl) {
    menuTarget = { r, c };
    const rect = cellEl.getBoundingClientRect();
    const wrapRect = els.board.parentElement?.getBoundingClientRect();

    if (!wrapRect) return;

    const x = rect.left - wrapRect.left + els.board.parentElement.scrollLeft + 48;
    const y = rect.top - wrapRect.top + els.board.parentElement.scrollTop - 10;

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
    const idx = r * cols + c;
    const nextIdx = idx + 1;
    if (nextIdx >= rows * cols) {
      const current = getCellEl(r, c);
      current?.blur?.();
      return;
    }
    const nr = Math.floor(nextIdx / cols);
    const nc = nextIdx % cols;
    if (!focusCell(nr, nc)) {
      const current = getCellEl(r, c);
      current?.blur?.();
    }
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

    const title = document.createElement("p");
    title.className = "menuTitle";
    title.textContent = "Definir célula:";
    els.cellMenu.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "menuGrid";

    const btnClosed = mkMenuBtn("Fechada", { kind: "closed", value: null });
    btnClosed.classList.add("is-closed");
    btnClosed.textContent = "";
    grid.appendChild(btnClosed);

    const btnOpen0 = mkMenuBtn("Vazio/0", { kind: "open0", value: null });
    btnOpen0.classList.add("is-open0");
    btnOpen0.textContent = "";
    grid.appendChild(btnOpen0);

    const btnFlag = mkMenuBtn("Bandeira", { kind: "flag", value: null });
    btnFlag.classList.add("is-flag");
    btnFlag.textContent = "🎀";
    grid.appendChild(btnFlag);

    for (let n = 1; n <= 8; n++) {
      const btn = mkMenuBtn(String(n), { kind: "number", value: n });
      btn.textContent = String(n);
      grid.appendChild(btn);
    }

    els.cellMenu.appendChild(grid);
  }

  function mkMenuBtn(label, payload) {
    const btn = document.createElement("button");
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
    if (!wrap) return;

    const cols = gameState.width;
    if (cols <= 0) return;

    const style = getComputedStyle(els.board);
    const gap = Number.parseFloat(style.getPropertyValue("--cell-gap")) || 8;

    const available = Math.max(240, wrap.clientWidth - 24);

    const rawSize = Math.floor((available - gap * (cols - 1)) / cols);
    const clamped = Math.max(22, Math.min(44, rawSize));

    els.board.style.setProperty("--cell-size", `${clamped}px`);
    els.board.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size, 44px))`;
    els.board.style.gridAutoRows = `var(--cell-size, 44px)`;
  }

  function analyzeAndMark() {
    closeMenu();
    clearAllHints();

    try {
      const hasAnyInfo = gameState.cells.some((row) =>
        row.some((c) => c.kind !== "closed"),
      );
      if (!hasAnyInfo) {
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

      let flagged = 0;
      let hinted = 0;

      for (const a of decisions) {
        const current = gameState.cells[a.r]?.[a.c];
        if (!current) continue;

        if (a.kind === UiActionKind.Flag) {
          if (current.kind === "closed") {
            setCellState(a.r, a.c, { kind: "flag", value: null });
            flagged++;
          }
          continue;
        }

        if (current.kind === "closed") {
          markSafeHint(a.r, a.c);
          hinted++;
        }
      }

      if (celebrateAllBombsFlaggedIfComplete()) {
        debug("decisions", decisions);
        return;
      }

      const hasOptions = flagged + hinted > 0;
      setMascot(hasOptions);
      setStatus(
        hasOptions
          ? `🎀 ${flagged} bandeira(s) · ✅ ${hinted} casa(s) segura(s)`
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
        if (!cellEl) continue;
        applyCellView(cellEl, gameState.cells[r][c]);
      }
    }

    updateBombCounter();
    setStatus("Voltei do cache local. Vamos lá? ♡");
    setMascot(true);
    return true;
  }

  return Object.freeze({
    mount() {
      if (!restoreFromStorageIfAny()) {
        renderBoard(els.board, gameState.width, gameState.height);
        fitBoardToContainer();
        updateBombCounter();
        persist();
        setStatus(INITIAL_STATUS);
        setMascot(true);
      }

      els.generateBtn.addEventListener("click", generateBoardFromInputs);
      els.analyzeBtn.addEventListener("click", analyzeAndMark);
      els.resetBtn.addEventListener("click", reset);
      els.resetCacheBtn.addEventListener("click", resetCache);

      window.addEventListener("resize", () => fitBoardToContainer());

      els.board.addEventListener("click", (ev) => {
        const target = /** @type {HTMLElement|null} */ (ev.target);
        const cellEl = target?.closest?.(".cell");
        if (!cellEl) return;

        const r = Number(cellEl.dataset.r);
        const c = Number(cellEl.dataset.c);
        if (!Number.isInteger(r) || !Number.isInteger(c)) return;

        cellEl.focus();
        openMenuAtCell(r, c, /** @type {HTMLElement} */ (cellEl));
      });

      els.board.addEventListener("keydown", (ev) => {
        const target = /** @type {HTMLElement|null} */ (ev.target);
        const cellEl = target?.closest?.(".cell");
        if (!cellEl) return;

        const r = Number(cellEl.dataset.r);
        const c = Number(cellEl.dataset.c);
        if (!Number.isInteger(r) || !Number.isInteger(c)) return;

        if (ev.key === "ArrowUp") {
          ev.preventDefault();
          focusRelative(r, c, -1, 0);
          return;
        }
        if (ev.key === "ArrowDown") {
          ev.preventDefault();
          focusRelative(r, c, 1, 0);
          return;
        }
        if (ev.key === "ArrowLeft") {
          ev.preventDefault();
          focusRelative(r, c, 0, -1);
          return;
        }
        if (ev.key === "ArrowRight") {
          ev.preventDefault();
          focusRelative(r, c, 0, 1);
          return;
        }

        if (applyKeyboardToCell(ev.key, r, c)) {
          ev.preventDefault();
          closeMenu();
          focusNextCell(r, c);
        }
      });

      els.cellMenu.addEventListener("click", (ev) => {
        const target = /** @type {HTMLElement|null} */ (ev.target);
        const btn = target?.closest?.("button[data-action='setCell']");
        if (!btn || !menuTarget) return;

        const payloadRaw = btn.getAttribute("data-payload") || "{}";
        /** @type {{kind:"closed"|"open0"|"number"|"flag", value:number|null}} */
        const payload = JSON.parse(payloadRaw);

        const { r, c } = menuTarget;
        setCellState(r, c, payload);
        closeMenu();
        focusNextCell(r, c);
      });

      els.heightInput.addEventListener("change", () => persist());
      els.widthInput.addEventListener("change", () => persist());
      els.bombsInput.addEventListener("change", () => {
        const maxCells = gameState.width * gameState.height;
        totalBombs = parseBombs(els.bombsInput, maxCells, totalBombs);
        els.bombsInput.value = String(totalBombs);
        updateBombCounter();
        persist();
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

      debug("App carregado.");
      return this;
    },
  });
}

