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

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = getCell(board, r, c);
      if (cell.kind !== CellKind.Revealed) continue;

      const neigh = neighbors8(board, r, c);
      const flags = [];
      const unknown = [];
      for (const p of neigh) {
        const nc = getCell(board, p.r, p.c);
        if (nc.kind === CellKind.Flag) flags.push(p);
        else if (nc.kind === CellKind.Unknown) unknown.push(p);
      }

      if (unknown.length === 0) continue;

      const remaining = cell.number - flags.length;
      if (remaining < 0) continue;

      if (remaining === 0) {
        for (const p of unknown) {
          const key = `${p.r},${p.c},${ActionKind.RevealSafe}`;
          actions.set(key, {
            kind: ActionKind.RevealSafe,
            r: p.r,
            c: p.c,
            reason: `O ${cell.number} em (${r},${c}) já tem ${flags.length} bandeira(s) adjacente(s).`,
          });
        }
      } else if (remaining === unknown.length) {
        for (const p of unknown) {
          const key = `${p.r},${p.c},${ActionKind.MarkMine}`;
          actions.set(key, {
            kind: ActionKind.MarkMine,
            r: p.r,
            c: p.c,
            reason: `O ${cell.number} em (${r},${c}) precisa de ${remaining} mina(s) e há ${unknown.length} desconhecida(s).`,
          });
        }
      }
    }
  }

  if (actions.size === 0 && Number.isFinite(opts.totalMines)) {
    const totalMines = Math.trunc(opts.totalMines);
    if (totalMines >= 0) {
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

      const remaining = totalMines - flagsCount;
      if (remaining === 0 && unknowns.length > 0) {
        for (const p of unknowns) {
          const key = `${p.r},${p.c},${ActionKind.RevealSafe}`;
          actions.set(key, {
            kind: ActionKind.RevealSafe,
            r: p.r,
            c: p.c,
            reason: `Total de bombas (${totalMines}) já foi atingido pelas bandeiras (${flagsCount}).`,
          });
        }
      } else if (remaining === unknowns.length && unknowns.length > 0) {
        for (const p of unknowns) {
          const key = `${p.r},${p.c},${ActionKind.MarkMine}`;
          actions.set(key, {
            kind: ActionKind.MarkMine,
            r: p.r,
            c: p.c,
            reason: `Restam ${remaining} bomba(s) e há ${unknowns.length} célula(s) fechada(s).`,
          });
        }
      }
    }
  }

  return Object.freeze([...actions.values()]);
}

