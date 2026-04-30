export const CellKind = Object.freeze({
  Unknown: "unknown",
  Revealed: "revealed",
  Flag: "flag",
});

/** @param {{kind:"unknown"|"revealed"|"flag", number?:number|null}} args */
export function createCell({ kind, number = null }) {
  if (!Object.values(CellKind).includes(kind)) {
    throw new Error(`CellKind inválido: ${String(kind)}`);
  }
  if (kind === CellKind.Revealed) {
    if (!Number.isInteger(number) || number < 0 || number > 8) {
      throw new Error(`Número inválido para célula revelada: ${String(number)}`);
    }
  } else if (number !== null) {
    throw new Error("Apenas células reveladas podem ter 'number'.");
  }

  return Object.freeze({ kind, number });
}

