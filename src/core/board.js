import { CellKind, createCell } from "./cell.js";

/** @param {{rows:number, cols:number, grid:ReadonlyArray<ReadonlyArray<{kind:string, number:number|null}>>}} args */
export function createBoard({ rows, cols, grid }) {
  if (!Number.isInteger(rows) || rows <= 0) throw new Error("rows inválido");
  if (!Number.isInteger(cols) || cols <= 0) throw new Error("cols inválido");
  if (!Array.isArray(grid) || grid.length !== rows) throw new Error("grid inválido");

  const frozenGrid = grid.map((row) => {
    if (!Array.isArray(row) || row.length !== cols) throw new Error("grid inválido");
    return Object.freeze(row.map((c) => createCell(c)));
  });

  return Object.freeze({
    rows,
    cols,
    grid: Object.freeze(frozenGrid),
  });
}

export function inBounds(board, r, c) {
  return r >= 0 && c >= 0 && r < board.rows && c < board.cols;
}

export function getCell(board, r, c) {
  if (!inBounds(board, r, c)) throw new Error("Fora do tabuleiro");
  return board.grid[r][c];
}

export function neighbors8(board, r, c) {
  /** @type {Array<{r:number,c:number}>} */
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (inBounds(board, rr, cc)) out.push({ r: rr, c: cc });
    }
  }
  return out;
}

export function boardFromText(text) {
  const lines = String(text)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) throw new Error("Tabuleiro vazio");
  const cols = lines[0].length;
  if (cols === 0) throw new Error("Tabuleiro inválido");
  for (const l of lines) {
    if (l.length !== cols) throw new Error("Linhas com tamanhos diferentes");
  }

  const grid = lines.map((line) =>
    [...line].map((ch) => {
      if (ch === ".") return { kind: CellKind.Unknown, number: null };
      if (ch === "F" || ch === "f") return { kind: CellKind.Flag, number: null };
      if (ch >= "0" && ch <= "8") return { kind: CellKind.Revealed, number: Number(ch) };
      throw new Error(`Caractere inválido no tabuleiro: '${ch}'`);
    }),
  );

  return createBoard({ rows: grid.length, cols, grid });
}

export function boardToText(board) {
  return board.grid
    .map((row) =>
      row
        .map((c) => {
          if (c.kind === CellKind.Unknown) return ".";
          if (c.kind === CellKind.Flag) return "F";
          return String(c.number);
        })
        .join(""),
    )
    .join("\n");
}

