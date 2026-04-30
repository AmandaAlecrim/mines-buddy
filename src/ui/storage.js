const STORAGE_KEY = "mines-buddy:game:v1";

/**
 * @typedef {{kind:"closed"|"open0"|"number"|"flag", value:number|null}} UiCell
 * @typedef {{width:number,height:number,totalBombs:number,cells:Array<Array<UiCell>>}} PersistedGame
 */

/**
 * @param {PersistedGame} game
 */
export function saveGameState(game) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  } catch {}
}

/**
 * @returns {PersistedGame|null}
 */
export function loadGameState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!isValidPersistedGame(data)) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearGameState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/** @param {PersistedGame} game @returns {PersistedGame} */
export function resetCellsKeepConfig(game) {
  const cells = Array.from({ length: game.height }, () =>
    Array.from({ length: game.width }, () => ({ kind: "closed", value: null })),
  );
  return {
    width: game.width,
    height: game.height,
    totalBombs: game.totalBombs,
    cells,
  };
}

function isValidPersistedGame(x) {
  if (!x || typeof x !== "object") return false;
  if (!Number.isInteger(x.width) || x.width < 1 || x.width > 35) return false;
  if (!Number.isInteger(x.height) || x.height < 1 || x.height > 40) return false;
  if (!Number.isInteger(x.totalBombs) || x.totalBombs < 0) return false;
  if (!Array.isArray(x.cells) || x.cells.length !== x.height) return false;

  for (const row of x.cells) {
    if (!Array.isArray(row) || row.length !== x.width) return false;
    for (const c of row) {
      if (!c || typeof c !== "object") return false;
      if (!["closed", "open0", "number", "flag"].includes(c.kind)) return false;
      if (c.kind === "number") {
        if (!Number.isInteger(c.value) || c.value < 1 || c.value > 8) return false;
      } else {
        if (c.value !== null) return false;
      }
    }
  }

  return true;
}

