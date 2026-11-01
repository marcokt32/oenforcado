(() => {
"use strict";
// Jogo da memória: vire duas cartas por vez e encontre todos os pares com o mínimo de jogadas.
// No desafio do dia, o tabuleiro (símbolos e posições) é o mesmo para todos os jogadores.
const SIMBOLOS = [
  { s: "🍎", n: "maçã" }, { s: "🍌", n: "banana" }, { s: "🍇", n: "uvas" }, { s: "🍓", n: "morango" },
  { s: "🍒", n: "cerejas" }, { s: "🍉", n: "melancia" }, { s: "🍍", n: "abacaxi" }, { s: "🥝", n: "kiwi" },
  { s: "🍋", n: "limão" }, { s: "🥕", n: "cenoura" }, { s: "🍄", n: "cogumelo" }, { s: "🌽", n: "milho" },
  { s: "🐶", n: "cachorro" }, { s: "🐱", n: "gato" }, { s: "🐼", n: "panda" }, { s: "🦊", n: "raposa" },
  { s: "🐸", n: "sapo" }, { s: "🐙", n: "polvo" }, { s: "🦋", n: "borboleta" }, { s: "🐝", n: "abelha" },
  { s: "⭐", n: "estrela" }, { s: "🌈", n: "arco-íris" }, { s: "🎈", n: "balão" }, { s: "🎲", n: "dado" }
];
const DIFICULDADES = [
  { id: "facil", nome: "Fácil · 6 pares" },
  { id: "medio", nome: "Médio · 12 pares" },
  { id: "dificil", nome: "Difícil · 18 pares" }
];
const CFG = {
  facil: { pares: 6, cols: 4 },    // 12 cartas (4 × 3)
  medio: { pares: 12, cols: 6 },   // 24 cartas (6 × 4)
  dificil: { pares: 18, cols: 6 }  // 36 cartas (6 × 6)
};
const XP_BASE = { facil: 15, medio: 30, dificil: 45 };
const NOME_NIVEL = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };
const ESPERA = 900; // tempo que um par errado fica à vista (ms)
const $ = id => document.getElementById(id);

// estado[i]: 0 = virada para baixo, 1 = virada (aguardando), 2 = par encontrado
let est, nivel, pares, cols, cartas, estado, abertas, bloqueio, jogadas, achados, venceu, iniciado, t0, timer, espera;
const botoes = [];

function embaralhar(lista, r) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatarTempo(seg) { return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`; }

function montarTabuleiro() {
  const t = $("tabuleiro");
  t.replaceChildren(); botoes.length = 0;
  t.style.setProperty("--cols", cols);
  cartas.forEach((_, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "mem-carta";
    b.innerHTML = `<span class="mem-inner"><span class="mem-face mem-costas" aria-hidden="true">?</span><span class="mem-face mem-frente" aria-hidden="true">${cartas[i].s}</span></span>`;
    b.addEventListener("click", () => clicar(i));
    t.appendChild(b); botoes.push(b);
  });
}

function atualizar() {
  botoes.forEach((b, i) => {
    const e = estado[i];
    b.classList.toggle("virada", e !== 0);
    b.classList.toggle("achada", e === 2);
    b.setAttribute("aria-label", `Carta ${i + 1}` + (e === 0 ? ", virada para baixo" : `, ${cartas[i].n}` + (e === 2 ? ", par encontrado" : "")));
  });
  $("pares").textContent = `${achados} / ${pares}`;
  $("jogadas").textContent = jogadas;
}

function clicar(i) {
  if (venceu || bloqueio || estado[i] !== 0) return;
  if (!iniciado) {
    iniciado = true; t0 = Date.now();
    timer = setInterval(() => { if (!venceu) $("tempo").textContent = formatarTempo(Math.round((Date.now() - t0) / 1000)); }, 1000);
  }
  estado[i] = 1; abertas.push(i);
  if (abertas.length < 2) { atualizar(); $("mensagem").textContent = "Agora escolha a segunda carta."; return; }

  jogadas++;
  const [a, b] = abertas;
  if (cartas[a].s === cartas[b].s) {
    estado[a] = estado[b] = 2; abertas = []; achados++;
    atualizar();
    if (achados === pares) terminar();
    else $("mensagem").textContent = `Par encontrado: ${cartas[a].n}!`;
  } else {
    bloqueio = true; atualizar();
    $("mensagem").textContent = "Não foi dessa vez. Memorize as posições.";
    espera = setTimeout(() => {
      estado[a] = estado[b] = 0; abertas = []; bloqueio = false;
      atualizar();
    }, ESPERA);
  }
}

function terminar() {
  venceu = true; clearInterval(timer);
  const seg = Math.round((Date.now() - t0) / 1000);
  $("tempo").textContent = formatarTempo(seg);
  const erros = jogadas - pares; // o mínimo possível é uma jogada por par
  const xp = Math.max(5, XP_BASE[nivel] - Math.floor(erros / 2));
  $("mensagem").textContent = erros === 0 ? "Partida perfeita: nenhum erro!" : "Todos os pares encontrados!";
  const info = Portal.concluir({ jogo: "memoria", xp, diario: est.diario });
  tb.refresh();
  const r = $("resultado");
  r.hidden = false;
  $("resultado-titulo").textContent = erros === 0 ? "Partida perfeita!" : "Você achou todos os pares!";
  $("resultado-detalhe").textContent = `Tempo: ${formatarTempo(seg)} · ${jogadas} ${jogadas === 1 ? "jogada" : "jogadas"}`;
  const [, m, d] = Portal.hoje().split("-");
  const titulo = est.diario ? `🃏 Jogo da memória · Desafio do dia ${d}/${m}` : `🃏 Jogo da memória · ${NOME_NIVEL[nivel]} ${pares} pares`;
  const linha = `✅ Terminei em ${formatarTempo(seg)} com ${jogadas} jogadas` + (erros === 0 ? " (perfeito!)" : "");
  Portal.anexarFim(r, { jogo: "memoria", texto: `${titulo}\n${linha}\nConsegue com menos jogadas?`, info });
}

function novo() {
  est = tb.estado();
  clearInterval(timer); clearTimeout(espera);
  let r = Math.random;
  if (est.diario) { r = Portal.rngDiario("memoria"); nivel = "medio"; }
  else nivel = est.dificuldade;
  const cfg = CFG[nivel];
  pares = cfg.pares; cols = cfg.cols;
  const escolhidos = embaralhar(SIMBOLOS, r).slice(0, pares);
  cartas = embaralhar(escolhidos.flatMap(s => [s, s]), r);
  estado = cartas.map(() => 0);
  abertas = []; bloqueio = false; jogadas = 0; achados = 0; venceu = false; iniciado = false;
  $("tempo").textContent = "0:00";
  $("resultado").hidden = true;
  $("resultado").querySelectorAll(".pm-extra").forEach(e => e.remove());
  $("nivel-atual").textContent = est.diario ? "Desafio do dia" : `${NOME_NIVEL[nivel]} · ${pares} pares`;
  $("mensagem").textContent = "Toque numa carta para começar.";
  montarTabuleiro(); atualizar();
}

$("novo-jogo").addEventListener("click", novo);
$("jogar-novamente").addEventListener("click", novo);

const tb = Portal.toolbar($("toolbar"), { jogo: "memoria", dificuldades: DIFICULDADES, dificuldadePadrao: "facil", onChange: novo });
novo();
})();
