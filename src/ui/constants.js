/** Limites do tabuleiro do analisador. */
export const BOARD = Object.freeze({
  MIN_DIMENSION: 1,
  MAX_WIDTH: 35,
  MAX_HEIGHT: 40,
  MIN_BOMBS: 0,
  MAX_BOMBS: 999,
  DEFAULT_WIDTH: 10,
  DEFAULT_HEIGHT: 10,
  DEFAULT_BOMBS: 10,
});

/** Configuração de tamanho de célula no analisador (px). */
export const ANALYZER_CELL = Object.freeze({
  MIN_SIZE: 22,
  MAX_SIZE: 44,
  DEFAULT_GAP: 8,
});

/** Configuração da geração de jogo aleatório (jirai expert). */
export const RANDOM_GAME = Object.freeze({
  MIN_HEIGHT: 12,
  MAX_HEIGHT: 16,
  MIN_WIDTH: 16,
  MAX_WIDTH: 30,
  MIN_BOMB_RATIO: 0.16,
  MAX_BOMB_RATIO: 0.21,
  MIN_BOMBS: 10,
  /** Mínimo de células livres ao redor da primeira jogada (3x3). */
  FIRST_CLICK_SAFE_AREA: 9,
});

/** Caminhos das imagens da mascote. */
export const MASCOT = Object.freeze({
  HAPPY_SRC: "./assets/landmine.png",
  SAD_SRC: "./assets/landmine2.png",
});

/** Mensagens fixas exibidas no balão de fala da mascote. */
export const MASCOT_MESSAGE = Object.freeze({
  INITIAL: "Clique em “Analisar” para receber dicas. ˃͈◡˂͈",
  CELEBRATION: "Todas as bombas marcadas, mandou muito bem! ♡ (˃͈◡˂͈)",
});

/** Tempo (ms) que dicas visuais transientes ficam destacadas. */
export const HINT_HIGHLIGHT_MS = 5000;
