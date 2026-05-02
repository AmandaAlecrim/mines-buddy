/**
 * Conteúdo dos modais informativos do menu superior.
 * @typedef {{title: string, body: string}} ModalContent
 * @type {Readonly<Record<string, ModalContent>>}
 */
export const MODAL_CONTENTS = Object.freeze({
  whatIs: {
    title: "O que é Campo Minado?",
    body: `
      <p>
        <strong>Campo Minado</strong> é um clássico jogo de lógica em
        tabuleiro: uma grade onde algumas células escondem bombas e as
        demais mostram um número de <strong>0</strong> a <strong>8</strong>
        indicando quantas bombas existem nas até oito células vizinhas.
      </p>
      <p>
        Seu objetivo é <strong>abrir todas as células sem bomba</strong>
        sem detonar nenhuma. Ele acompanha o Windows desde os anos 90 e
        continua sendo um excelente exercício de raciocínio dedutivo.
      </p>
    `,
  },

  howToPlay: {
    title: "Como jogar?",
    body: `
      <ul>
        <li>Clique em uma célula para revelá-la.</li>
        <li>Se aparecer um <strong>0</strong>, a região vazia ao redor
            é aberta automaticamente.</li>
        <li>Use os números para deduzir onde estão as bombas: um
            <strong>1</strong>, por exemplo, indica que existe exatamente
            uma bomba nas células vizinhas fechadas.</li>
        <li>Marque com bandeira (🎀) as células que você tem certeza que
            escondem bombas, para não clicar nelas por acidente.</li>
        <li>Você <strong>vence</strong> quando todas as células sem bomba
            estiverem abertas.</li>
        <li>Você <strong>perde</strong> se clicar em uma bomba.</li>
      </ul>
    `,
  },

  howToUse: {
    title: "Como usar o Mines Buddy?",
    body: `
      <p>
        O Mines Buddy é um <strong>ajudante visual</strong>: você reproduz
        aqui o tabuleiro do jogo real e ele indica quais células são
        seguras ou definitivamente bombas.
      </p>
      <ul>
        <li>Configure <strong>altura</strong>, <strong>largura</strong> e
            o <strong>total de bombas</strong> do tabuleiro real e clique
            em <strong>Gerar</strong>.</li>
        <li>Para cada célula que você já abriu no jogo, clique nela aqui
            e escolha o número (<code>0</code> a <code>8</code>) ou marque
            com bandeira (🎀) as bombas conhecidas.</li>
        <li>Atalhos de teclado: <code>0</code> a <code>8</code> definem
            números, <code>F</code> coloca bandeira, <code>Backspace</code>
            fecha a célula novamente. As setas movem o foco.</li>
        <li>Clique em <strong>Analisar</strong> e o Mines Buddy vai
            colocar 🎀 nas células com bomba certa e destacar em rosa as
            células com certeza seguras.</li>
        <li>O contador no topo mostra quantas bombas ainda faltam ser
            marcadas.</li>
        <li><strong>Limpar</strong> reinicia as células mantendo as
            dimensões; <strong>Resetar cache</strong> apaga todo o estado
            salvo no navegador.</li>
        <li>Use <strong>gerar jogo aleatório</strong> para criar um
            tabuleiro com tamanho e bombas sorteados.</li>
      </ul>
    `,
  },
});
