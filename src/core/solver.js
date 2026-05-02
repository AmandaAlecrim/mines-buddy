import { CellKind } from "./cell.js";
import { getCell, neighbors8 } from "./board.js";

export const ActionKind = Object.freeze({
  RevealSafe: "reveal_safe",
  MarkMine: "mark_mine",
});

/**
 * @typedef {{kind:"reveal_safe"|"mark_mine", r:number, c:number, reason:string}} SolverAction
 */

/**
 * @param {import("./board.js").Board} board
 * @param {{totalMines?:number}} [opts]
 * @returns {ReadonlyArray<SolverAction>}
 */
export function solveDeterministic(board, opts = {}) {
  /** @type {Map<string, SolverAction>} */
  const actions = new Map();

  collectLocalDeductions(board, actions);

  if (actions.size === 0 && Number.isFinite(opts.totalMines)) {
    collectGlobalDeductions(board, Math.trunc(opts.totalMines), actions);
  }

  return Object.freeze([...actions.values()]);
}

/**
 * Deduções locais: cada número revelado decide sobre seus vizinhos
 * desconhecidos quando todos já estão marcados ou quando todos são bombas.
 */
function collectLocalDeductions(board, actions) {
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = getCell(board, r, c);
      if (cell.kind !== CellKind.Revealed) continue;

      const { flags, unknown } = partitionNeighbors(board, r, c);
      if (unknown.length === 0) continue;

      const remaining = cell.number - flags.length;
      if (remaining < 0) continue;

      if (remaining === 0) {
        addActions(
          actions,
          unknown,
          ActionKind.RevealSafe,
          `O ${cell.number} em (${r},${c}) já tem ${flags.length} bandeira(s) adjacente(s).`,
        );
      } else if (remaining === unknown.length) {
        addActions(
          actions,
          unknown,
          ActionKind.MarkMine,
          `O ${cell.number} em (${r},${c}) precisa de ${remaining} mina(s) e há ${unknown.length} desconhecida(s).`,
        );
      }
    }
  }
}

/**
 * Deduções globais usando o total de minas: se já marcamos todas,
 * o resto é seguro; se as desconhecidas são exatamente as restantes,
 * todas são bombas.
 */
function collectGlobalDeductions(board, totalMines, actions) {
  if (totalMines < 0) return;

  let flagsCount = 0;
  /** @type {Array<{r:number,c:number}>} */
  const unknowns = [];

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = getCell(board, r, c);
      if (cell.kind === CellKind.Flag) flagsCount++;
      else if (cell.kind === CellKind.Unknown) unknowns.push({ r, c });
    }
  }

  if (unknowns.length === 0) return;

  const remaining = totalMines - flagsCount;
  if (remaining === 0) {
    addActions(
      actions,
      unknowns,
      ActionKind.RevealSafe,
      `Total de bombas (${totalMines}) já foi atingido pelas bandeiras (${flagsCount}).`,
    );
  } else if (remaining === unknowns.length) {
    addActions(
      actions,
      unknowns,
      ActionKind.MarkMine,
      `Restam ${remaining} bomba(s) e há ${unknowns.length} célula(s) fechada(s).`,
    );
  }
}

function partitionNeighbors(board, r, c) {
  const flags = [];
  const unknown = [];
  for (const p of neighbors8(board, r, c)) {
    const neighbor = getCell(board, p.r, p.c);
    if (neighbor.kind === CellKind.Flag) flags.push(p);
    else if (neighbor.kind === CellKind.Unknown) unknown.push(p);
  }
  return { flags, unknown };
}

function addActions(actions, positions, kind, reason) {
  for (const p of positions) {
    const key = `${p.r},${p.c},${kind}`;
    actions.set(key, { kind, r: p.r, c: p.c, reason });
  }
}
