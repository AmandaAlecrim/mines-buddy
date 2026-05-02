# Mines Buddy

Companion visual para Campo Minado, com estética **Jirai Kei**. Tem dois modos:

1. **Ajudante** - você reproduz o tabuleiro do jogo real (em qualquer site/app) e o Mines Buddy aponta quais células são bombas garantidas e quais são seguras.
2. **Jogar** - uma partida aleatória de Campo Minado dentro do próprio site, com mascote dando dicas quando você pedir.

## Funcionalidades

### Modo Ajudante

- Montagem do tabuleiro célula a célula via UI (sem texto/colar).
- Solver dedutivo + fallback global (usa a contagem total de bombas).
- Marcação automática de bombas certas (🎀) e destaque rosa em células seguras.
- Persistência automática em `localStorage` (volta no mesmo estado depois de fechar).
- Ferramenta **balde de tinta** 🪣: a partir de uma célula fechada, preenche com `0` toda a área de células fechadas conectadas (8 direções). Disponível no menu da célula ou via atalho `B`.
- Atalhos:
  - `1` a `8` definem o número da célula; `0` ou `Espaço` marcam como vazio (open0).
  - `F` coloca/remove bandeira (🎀).
  - `B` aciona o balde de tinta (preenche a área conectada com `0`).
  - `Backspace` / `Delete` fecham a célula.
  - `↑↓←→` movem o foco no grid.
  - O foco **não pula** após preencher: a célula atual continua selecionada para ajustes rápidos.
  - Os atalhos também funcionam só com o **mouse parado em cima** da célula, sem precisar clicar para focar.

### Modo Jogar

- Partida real de Campo Minado, gerada com tamanho (12×16 a 16×30) e densidade (16% a 21%) sorteados.
- Primeira jogada nunca é bomba e tem uma área 3×3 segura ao redor (geração após o primeiro clique).
- Clique esquerdo revela, clique direito (ou `F`) marca/desmarca bandeira.
- Flood-fill automático em zeros, contador de bombas e cronômetro.
- Detecção de vitória (todas as células sem bomba reveladas) e derrota (a célula que detonou ganha um halo).
- **Botão "Pedir dica"**: usa o mesmo solver dedutivo do modo Ajudante para sugerir uma jogada segura ou apontar uma bomba certa, com fala da mascote.
- Botões "Reiniciar" (mesmo tabuleiro) e "Novo aleatório" (sorteia outro).
- Atalhos no grid: `Enter` / `Espaço` revela, `F` alterna bandeira, `↑↓←→` movem o foco.

### Menu superior

- Título "Mines Buddy" funciona como link de início (volta para o modo Ajudante).
- Abas com modais informativos: **o que é Campo Minado?**, **como jogar?**, **como usar o Mines Buddy?**.
- Aba **gerar jogo aleatório** abre o modo Jogar.
- O botão da aba/modal ativo recebe destaque ♡ que some quando a tela/modal fecha.

### Acessibilidade

- Foco visível em todos os controles.
- `aria-label`, `aria-live` e `aria-current` nos elementos relevantes.
- Modal fecha com `Esc` e clique no overlay.
- Navegação por setas no grid em ambos os modos.
- No modo Ajudante, atalhos via teclado funcionam tanto com a célula focada quanto apenas com o mouse posicionado sobre ela, sem deslocar o foco automaticamente.

## Arquitetura

JavaScript Vanilla (ES6+), HTML5 e CSS3, com ES Modules. Sem bundler.

```
src/
├── main.js               # ponto de entrada (createApp().mount())
├── core/                 # lógica pura, sem DOM
│   ├── cell.js           # tipo de célula e validação
│   ├── board.js          # criação/leitura do tabuleiro
│   ├── solver.js         # dedução determinística + fallback global
│   └── index.js          # barrel
└── ui/                   # DOM + eventos + render
    ├── app.js            # controlador do modo Ajudante e troca de telas
    ├── playGame.js       # modo Jogar (estado, render, dica, vitória/derrota)
    ├── boardView.js      # render do grid do Ajudante
    ├── solverBridge.js   # adapta o estado da UI para o solver puro
    ├── storage.js        # localStorage (modo Ajudante)
    ├── modalContents.js  # textos dos modais informativos
    ├── screens.js        # alternância entre telas
    ├── constants.js      # limites do tabuleiro, mascote, dicas
    └── dom.js            # helpers de DOM
```

A pasta `src/core` não toca em DOM e pode ser usada em qualquer ambiente (Node, worker, testes).

## Rodar localmente

ES Modules exigem servidor estático (não funcionam via `file://`):

```bash
python -m http.server 5173
```

ou:

```bash
npx serve .
```

Depois acesse `http://localhost:5173`.

## GitHub Pages

Tudo é estático e usa caminhos relativos (`./src/...`, `./assets/...`), então é só publicar:

1. **Settings → Pages**
2. **Source**: `Deploy from a branch`
3. Escolher a branch e a pasta `/` (raiz)

Em ~1 minuto fica disponível em `https://<usuário>.github.io/mines-buddy/`.

## Tipografia

- **Pinyon Script** (Google Fonts) — título da marca, vibe gothic lolita / vitoriana.
- **Zen Maru Gothic** — restante do site, traços arredondados que combinam com o tema kawaii.

## Créditos

- Site e código: [Amanda Alecrim](https://github.com/AmandaAlecrim)
- Mascote criado no Picrew: <https://picrew.me/ja/image_maker/2604520>
