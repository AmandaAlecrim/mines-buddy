/**
 * @typedef {object} OcrResult
 * @property {string} boardText
 * @property {ReadonlyArray<string>} warnings
 */

/** @param {ImageBitmap} _bitmap @returns {Promise<OcrResult>} */
export async function ocrMinesweeperBoard(_bitmap) {
  return {
    boardText: "",
    warnings: Object.freeze([
      "OCR ainda não implementado: use a entrada de texto por enquanto.",
    ]),
  };
}

