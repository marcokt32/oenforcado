(() => {
"use strict";
// Temas de datas comemorativas. Fica no <head> (script síncrono) para o tema já valer na primeira pintura.
// Para criar outro tema: adicione um item em TEMAS, um bloco em DECORACOES (se tiver enfeites animados)
// e as regras dele em css/tema.css, sempre começando com html[data-tema="id"].
//
// Pré-visualizar fora da data:  ?tema=natal   (vale até fechar a aba)
// Voltar ao normal na prévia:   ?tema=nenhum
const TEMAS = [
  { id: "natal", nome: "Natal", icone: "🎄", de: "12-01", ate: "12-26" },    // período em MM-DD, inclusive
  { id: "anonovo", nome: "Ano Novo", icone: "🎆", de: "12-27", ate: "01-02" }  // pode virar o ano (27/12 a 02/01)
];

const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const noPeriodo = (md, t) => t.de <= t.ate ? (md >= t.de && md <= t.ate) : (md >= t.de || md <= t.ate);

let pedido = null, desligado = false;
try {
  const q = new URLSearchParams(location.search).get("tema");
  if (q) { sessionStorage.setItem("tema_pedido", q); if (q !== "nenhum") localStorage.removeItem("tema_off"); }
  pedido = sessionStorage.getItem("tema_pedido");
  desligado = localStorage.getItem("tema_off") === "1"; // a pessoa desligou o tema no botão
} catch (e) { /* armazenamento bloqueado: segue com o padrão */ }

const tema = pedido === "nenhum" ? null
  : (TEMAS.find(t => t.id === pedido) || TEMAS.find(t => noPeriodo(hoje().slice(5), t)) || null);
if (!tema) return;

const html = document.documentElement;
if (!desligado) html.dataset.tema = tema.id;

/* ---------- Enfeites animados de cada tema ---------- */
const reduzido = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

function neve() {
  if (reduzido()) return;
  const caixa = document.createElement("div");
  caixa.className = "tema-neve"; caixa.setAttribute("aria-hidden", "true");
  const total = innerWidth < 700 ? 16 : 30;
  for (let i = 0; i < total; i++) {
    const f = document.createElement("i");
    f.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
    f.style.setProperty("--s", (4 + Math.random() * 6).toFixed(1) + "px");
    f.style.setProperty("--d", (9 + Math.random() * 9).toFixed(1) + "s");
    f.style.setProperty("--a", "-" + (Math.random() * 18).toFixed(1) + "s");
    f.style.setProperty("--w", (Math.random() * 60 - 30).toFixed(0) + "px");
    caixa.appendChild(f);
  }
  document.body.appendChild(caixa);
}
function chapeuHero() { // gorro de Papai Noel na logo grande da página inicial
  const arte = document.querySelector(".hero-art");
  if (!arte || arte.querySelector(".tema-chapeu")) return;
  const c = document.createElement("span");
  c.className = "tema-chapeu"; c.setAttribute("aria-hidden", "true");
  arte.appendChild(c);
}

/* Ano Novo: confete caindo, fogos de artifício (fora das páginas de jogo) e o ano novo no banner */
const CORES_FESTA = ["#ffc83d", "#ff5fa2", "#4aa8ff", "#9b6bff", "#35c56f", "#ffffff"];
let timerFogos = null;

function confete() {
  if (reduzido()) return;
  const caixa = document.createElement("div");
  caixa.className = "tema-confete"; caixa.setAttribute("aria-hidden", "true");
  const total = innerWidth < 700 ? 16 : 30;
  for (let i = 0; i < total; i++) {
    const c = document.createElement("i");
    c.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
    c.style.setProperty("--w", (5 + Math.random() * 4).toFixed(1) + "px");
    c.style.setProperty("--h", (9 + Math.random() * 6).toFixed(1) + "px");
    c.style.setProperty("--c", CORES_FESTA[Math.floor(Math.random() * CORES_FESTA.length)]);
    c.style.setProperty("--d", (8 + Math.random() * 7).toFixed(1) + "s");
    c.style.setProperty("--a", "-" + (Math.random() * 15).toFixed(1) + "s");
    c.style.setProperty("--dx", (Math.random() * 80 - 40).toFixed(0) + "px");
    caixa.appendChild(c);
  }
  document.body.appendChild(caixa);
}

function fogos() {
  if (reduzido() || document.body.dataset.jogo) return; // nas páginas de jogo, só o confete discreto
  const caixa = document.createElement("div");
  caixa.className = "tema-fogos"; caixa.setAttribute("aria-hidden", "true");
  document.body.appendChild(caixa);
  const estourar = () => {
    if (document.hidden) return;
    const f = document.createElement("div");
    f.className = "tema-fogo";
    f.style.left = (10 + Math.random() * 80).toFixed(0) + "%";
    f.style.top = (10 + Math.random() * 30).toFixed(0) + "%";
    f.style.setProperty("--c", CORES_FESTA[Math.floor(Math.random() * 5)]);
    for (let i = 0; i < 14; i++) {
      const p = document.createElement("i");
      p.style.setProperty("--a", (i * 360 / 14).toFixed(0) + "deg");
      f.appendChild(p);
    }
    caixa.appendChild(f);
    setTimeout(() => f.remove(), 1400);
  };
  estourar();
  timerFogos = setInterval(estourar, 2600);
}

function anoNoBanner() { // selo dourado com o ano que está chegando
  const arte = document.querySelector(".hero-art");
  if (!arte || arte.querySelector(".tema-ano")) return;
  const [a, m] = hoje().split("-").map(Number);
  const s = document.createElement("span");
  s.className = "tema-ano"; s.setAttribute("aria-hidden", "true");
  s.textContent = m >= 7 ? a + 1 : a;
  arte.appendChild(s);
}

const DECORACOES = {
  natal: {
    ligar() { neve(); chapeuHero(); },
    desligar() { document.querySelectorAll(".tema-neve, .tema-chapeu").forEach(e => e.remove()); }
  },
  anonovo: {
    ligar() { confete(); fogos(); chapeuHero(); anoNoBanner(); },
    desligar() {
      clearInterval(timerFogos);
      document.querySelectorAll(".tema-confete, .tema-fogos, .tema-chapeu, .tema-ano").forEach(e => e.remove());
    }
  }
};

/* ---------- Botão para ligar/desligar (acessibilidade e preferência) ---------- */
function criarBotao() {
  const b = document.createElement("button");
  b.type = "button"; b.className = "tema-botao"; b.textContent = tema.icone;
  const atualizar = () => {
    const ligado = !!html.dataset.tema;
    b.setAttribute("aria-pressed", ligado ? "true" : "false");
    b.title = ligado ? `Desativar o tema de ${tema.nome}` : `Ativar o tema de ${tema.nome}`;
    b.setAttribute("aria-label", b.title);
  };
  b.addEventListener("click", () => {
    if (html.dataset.tema) {
      delete html.dataset.tema; DECORACOES[tema.id].desligar();
      try { localStorage.setItem("tema_off", "1"); } catch (e) {}
    } else {
      html.dataset.tema = tema.id; DECORACOES[tema.id].ligar();
      try { localStorage.removeItem("tema_off"); } catch (e) {}
    }
    atualizar();
  });
  atualizar();
  document.body.appendChild(b);
}

function iniciar() {
  criarBotao();
  if (html.dataset.tema) DECORACOES[tema.id].ligar();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
