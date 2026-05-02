const STORAGE_KEY = "mines-buddy:game:v1";
const MAX_WIDTH = 35;
const MAX_HEIGHT = 40;
const VALID_KINDS = Object.freeze(["closed", "open0", "number", "flag"]);
const MIN_NUMBER = 1;
const MAX_NUMBER = 8;

/**
 * @typedef {{kind:"closed"|"open0"|"number"|"flag", value:number|null}} UiCell
 * @typedef {{width:number,height:number,totalBombs:number,cells:UiCell[][]}} PersistedGame
 */

/** @param {PersistedGame} game */
export function saveGameState(game) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  } catch (err) {
    warn("Falha ao salvar estado do jogo", err);
  }
}

/** @returns {PersistedGame|null} */
export function loadGameState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return isValidPersistedGame(data) ? data : null;
  } catch (err) {
    warn("Falha ao carregar estado do jogo", err);
    return null;
  }
}

export function clearGameState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    warn("Falha ao limpar estado do jogo", err);
  }
}

function warn(message, err) {
  console.warn(`[Mines Buddy] ${message}:`, err);
}

function isValidPersistedGame(x) {
  if (!x || typeof x !== "object") return false;
  if (!isInRange(x.width, 1, MAX_WIDTH)) return false;
  if (!isInRange(x.height, 1, MAX_HEIGHT)) return false;
  if (!Number.isInteger(x.totalBombs) || x.totalBombs < 0) return false;
  if (!Array.isArray(x.cells) || x.cells.length !== x.height) return false;

  for (const row of x.cells) {
    if (!Array.isArray(row) || row.length !== x.width) return false;
    for (const cell of row) {
      if (!isValidCell(cell)) return false;
    }
  }

  return true;
}

function isValidCell(cell) {
  if (!cell || typeof cell !== "object") return false;
  if (!VALID_KINDS.includes(cell.kind)) return false;

  if (cell.kind === "number") {
    return isInRange(cell.value, MIN_NUMBER, MAX_NUMBER);
  }
  return cell.value === null;
}

function isInRange(n, min, max) {
  return Number.isInteger(n) && n >= min && n <= max;
}

