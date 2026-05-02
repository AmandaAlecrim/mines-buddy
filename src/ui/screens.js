/**
 * Helpers para alternar entre as telas do aplicativo (analisador e jogo).
 */

const SCREEN_ANALYZER_ID = "screenAnalyzer";

/** @param {Document} doc */
function getAnalyzerScreen(doc) {
  return doc.getElementById(SCREEN_ANALYZER_ID);
}

/** @param {Document} doc */
export function showAnalyzer(doc) {
  const screen = getAnalyzerScreen(doc);
  if (screen) screen.hidden = false;
}

/** @param {Document} doc */
export function hideAnalyzer(doc) {
  const screen = getAnalyzerScreen(doc);
  if (screen) screen.hidden = true;
}
