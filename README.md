# Mines Buddy

Helper visual (estética **Jirai Kei**) para montar e analisar tabuleiros de **Campo Minado**.

## Features

- Montagem do tabuleiro por UI (sem texto)
- Solver determinístico + fallback global (bombas restantes)
- Ações visuais:
  - 🎀 marca minas com certeza
  - ✅ destaca casas seguras para você preencher (0-8)
- Persistência automática em `localStorage`
- Acessibilidade:
  - navegação por setas (↑↓←→)
  - foco visível

## Arquitetura

Projeto em **JavaScript Vanilla (ES6+)**, **HTML5** e **CSS3**, com **ES Modules** e separação de responsabilidades:

- `src/core`: lógica pura (tabuleiro + solver determinístico)
- `src/vision`: pipeline de imagem/OCR (placeholder para Tesseract.js/OpenCV.js)
- `src/ui`: DOM + eventos + renderização

## Rodar localmente

Como o projeto usa ES Modules no navegador, abra com um servidor estático (não via `file://`).

Exemplos:

- Python:

```bash
python -m http.server 5173
```

- Node (se tiver):

```bash
npx serve .
```

Depois acesse `http://localhost:5173`.

## Como usar

- Clique em uma célula e selecione: **fechada**, **0**, **1-8** ou **🎀**.
- Atalhos:
  - **0-8**: define o valor
  - **F**: marca 🎀
  - **Backspace/Delete**: volta para fechada
  - **↑↓←→**: navega no grid
- Use **Analisar** para aplicar 🎀 automáticos e marcar ✅.
- **Resetar cache** apaga o estado salvo e volta para o padrão (10×10, 10 bombas).

## Debug (detalhes técnicos)

O app não mostra logs na UI (modo portfólio). Para ver detalhes do solver, abra o **DevTools** do navegador e olhe o **Console**.

## GitHub Pages

Como o `index.html` fica na raiz e usa caminhos relativos (`./src/...`), basta publicar a branch/`/` root no GitHub Pages.

## Créditos

- Site e código: [Amanda Alecrim](https://github.com/AmandaAlecrim)
- Mascote criado no Picrew: https://picrew.me/ja/image_maker/2604520

