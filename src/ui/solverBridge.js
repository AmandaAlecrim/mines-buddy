import { createBoard, CellKind, solveDeterministic, ActionKind } from "../core/index.js";

export const UiActionKind = Object.freeze({
  Flag: "FLAG",
  Safe: "SAFE",
});

/**
 * @typedef {{kind:"FLAG"|"SAFE", r:number, c:number, reason:string}} UiSolverAction
 */

/**
 * @param {object} args
 * @param {number} args.width
 * @param {number} args.height
 * @param {Array<Array<{kind:"closed"|"open0"|"number"|"flag", value:number|null}>>} args.cells
 * @param {number} [args.totalBombs]
 * @returns {ReadonlyArray<UiSolverAction>}
 */
export function decideNextUiActions({ width, height, cells, totalBombs }) {
  const grid = cells.map((row) =>
    row.map((cell) => {
      if (cell.kind === "closed") return { kind: CellKind.Unknown, number: null };
      if (cell.kind === "flag") return { kind: CellKind.Flag, number: null };
      if (cell.kind === "open0") return { kind: CellKind.Revealed, number: 0 };
      return { kind: CellKind.Revealed, number: cell.value };
    }),
  );

  const board = createBoard({ rows: height, cols: width, grid });
  const actions = solveDeterministic(board, { totalMines: totalBombs });

  return Object.freeze(
    actions.map((a) => ({
      kind: a.kind === ActionKind.MarkMine ? UiActionKind.Flag : UiActionKind.Safe,
      r: a.r,
      c: a.c,
      reason: a.reason,
    })),
  );
}

