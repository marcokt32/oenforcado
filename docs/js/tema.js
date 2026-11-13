(() => {
"use strict";
// Temas de datas comemorativas. Fica no <head> (script síncrono) para o tema já valer na primeira pintura.
// Para criar outro tema: adicione um item em TEMAS, um bloco em DECORACOES (se tiver enfeites animados)
// e as regras dele em css/tema.css, sempre começando com html[data-tema="id"].
//
// Datas fixas:  de/ate em MM-DD (pode virar o ano).
// Datas móveis: "janela(ano)" devolve [de, ate] em AAAA-MM-DD (usa a Páscoa como referência).
//
// Pré-visualizar fora da data:  ?tema=carnaval  (vale até fechar a aba)
// Voltar ao normal na prévia:   ?tema=nenhum

/* Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher), em ms UTC */
function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(ano, mes - 1, dia);
}
/* n-ésimo domingo de um mês (mes 1-12), em ms UTC */
const domingoDoMes = (ano, mes, n) => {
  const d1 = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay(); // 0 = domingo
  return Date.UTC(ano, mes - 1, 1 + ((7 - d1) % 7) + 7 * (n - 1));
};
const iso = ms => new Date(ms).toISOString().slice(0, 10);
const somar = (ms, n) => ms + n * 864e5;

const TEMAS = [
  { id: "natal", nome: "Natal", icone: "🎄", de: "12-01", ate: "12-26" },    // período em MM-DD, inclusive
  { id: "anonovo", nome: "Ano Novo", icone: "🎆", de: "12-27", ate: "01-02" }, // pode virar o ano (27/12 a 02/01)
  // Carnaval: da sexta anterior (52 dias antes da Páscoa) até a Quarta-feira de Cinzas (46 dias antes)
  { id: "carnaval", nome: "Carnaval", icone: "🎭", janela: ano => { const p = pascoa(ano); return [iso(somar(p, -52)), iso(somar(p, -46))]; } },
  { id: "mulheres", nome: "Dia da Mulher", icone: "🌷", de: "03-04", ate: "03-08" },
  // Páscoa: duas semanas antes até a segunda-feira depois do domingo
  { id: "pascoa", nome: "Páscoa", icone: "🐰", janela: ano => { const p = pascoa(ano); return [iso(somar(p, -14)), iso(somar(p, 1))]; } },
  { id: "namorados", nome: "Dia dos Namorados", icone: "💘", de: "06-12", ate: "06-12" },
  // Festa Junina: junho inteiro, exceto o dia 12 (que o tema acima, vindo primeiro na lista, ocupa)
  { id: "junina", nome: "Festa Junina", icone: "🌽", de: "06-01", ate: "06-30" },
  // Dia das Mães: 2º domingo de maio. A semana inteira (segunda a domingo)
  { id: "maes", nome: "Dia das Mães", icone: "🌸", janela: ano => { const d = domingoDoMes(ano, 5, 2); return [iso(somar(d, -6)), iso(d)]; } },
  // Dia dos Pais (Brasil): 2º domingo de agosto. A semana inteira (segunda a domingo)
  { id: "pais", nome: "Dia dos Pais", icone: "👔", janela: ano => { const d = domingoDoMes(ano, 8, 2); return [iso(somar(d, -6)), iso(d)]; } },
  // Independência: Semana da Pátria (1 a 7 de setembro)
  { id: "independencia", nome: "Independência", icone: "🥁", de: "09-01", ate: "09-07" },
  // Dia dos Professores: semana que termina em 15/10
  { id: "professores", nome: "Dia dos Professores", icone: "🍎", de: "10-11", ate: "10-15" },
  // Proclamação da República: só o dia 15/11. Vem ANTES da Consciência Negra na lista,
  // então ganha o dia 15 (a Consciência Negra continua nos outros dias, de 14 a 20/11)
  { id: "republica", nome: "Proclamação da República", icone: "🏛️", de: "11-15", ate: "11-15" },
  // Consciência Negra: semana que termina em 20/11
  { id: "consciencia", nome: "Consciência Negra", icone: "✊🏿", de: "11-14", ate: "11-20" }
];

const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const noPeriodo = (md, t) => t.de <= t.ate ? (md >= t.de && md <= t.ate) : (md >= t.de || md <= t.ate);
const ativo = (t, dia) => {
  if (t.janela) { const [de, ate] = t.janela(Number(dia.slice(0, 4))); return dia >= de && dia <= ate; }
  return noPeriodo(dia.slice(5), t);
};

let pedido = null, desligado = false;
try {
  const q = new URLSearchParams(location.search).get("tema");
  if (q) { sessionStorage.setItem("tema_pedido", q); if (q !== "nenhum") localStorage.removeItem("tema_off"); }
  pedido = sessionStorage.getItem("tema_pedido");
  desligado = localStorage.getItem("tema_off") === "1"; // a pessoa desligou o tema no botão
} catch (e) { /* armazenamento bloqueado: segue com o padrão */ }

const tema = pedido === "nenhum" ? null
  : (TEMAS.find(t => t.id === pedido) || TEMAS.find(t => ativo(t, hoje())) || null);
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
function chapeuHero() { // enfeite na logo grande da página inicial (gorro, chapéu, plumas, orelhas...)
  const arte = document.querySelector(".hero-art");
  if (!arte || arte.querySelector(".tema-chapeu")) return;
  const c = document.createElement("span");
  c.className = "tema-chapeu"; c.setAttribute("aria-hidden", "true");
  arte.appendChild(c);
}

/* Confete (Ano Novo e Carnaval): cores diferentes em cada tema */
const CORES_FESTA = ["#ffc83d", "#ff5fa2", "#4aa8ff", "#9b6bff", "#35c56f", "#ffffff"];
const CORES_CARNAVAL = ["#ffd400", "#22c55e", "#a24bf0", "#ff3d9a", "#2fb8ff", "#ff7a1a"];
const CORES_BRASIL = ["#0f8f3f", "#ffdf00", "#1a3f8f", "#3fc06b", "#ffe94d"];
let timerFogos = null;

function confete(cores = CORES_FESTA) {
  if (reduzido()) return;
  const caixa = document.createElement("div");
  caixa.className = "tema-confete"; caixa.setAttribute("aria-hidden", "true");
  const total = innerWidth < 700 ? 16 : 30;
  for (let i = 0; i < total; i++) {
    const c = document.createElement("i");
    c.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
    c.style.setProperty("--w", (5 + Math.random() * 4).toFixed(1) + "px");
    c.style.setProperty("--h", (9 + Math.random() * 6).toFixed(1) + "px");
    c.style.setProperty("--c", cores[Math.floor(Math.random() * cores.length)]);
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

/* Páscoa: ovos coloridos caindo devagar */
const OVOS = [["#ffd1e3", "#ff8fbf"], ["#e3d6ff", "#a98bff"], ["#fff1b8", "#ffd24d"], ["#cdf5e6", "#5fd3b0"], ["#d6ecff", "#7bbcff"]];
function ovos() {
  if (reduzido()) return;
  const caixa = document.createElement("div");
  caixa.className = "tema-ovos"; caixa.setAttribute("aria-hidden", "true");
  const total = innerWidth < 700 ? 10 : 18;
  for (let i = 0; i < total; i++) {
    const o = document.createElement("i");
    const cor = OVOS[Math.floor(Math.random() * OVOS.length)];
    o.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
    o.style.setProperty("--s", (14 + Math.random() * 10).toFixed(0) + "px");
    o.style.setProperty("--d", (11 + Math.random() * 9).toFixed(1) + "s");
    o.style.setProperty("--a", "-" + (Math.random() * 20).toFixed(1) + "s");
    o.style.setProperty("--w", (Math.random() * 60 - 30).toFixed(0) + "px");
    o.style.setProperty("--c1", cor[0]);
    o.style.setProperty("--c2", cor[1]);
    caixa.appendChild(o);
  }
  document.body.appendChild(caixa);
}

/* Páscoa: coelho no canto inferior direito.
   Sobe da borda, olha para o jogador, olha para o jogo, saca uma cenoura, morde e vai embora.
   A animação dura 14 s (variável --t no CSS) e se repete a cada 2 a 3 minutos.
   Prévia rápida (repete a cada 12 s):  ?tema=pascoa&coelho=teste */
const COELHO_SVG =
  '<svg viewBox="0 0 140 150" focusable="false" aria-hidden="true">' +
  '<defs>' +
  '<linearGradient id="cn-pelo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#eadcf7"/></linearGradient>' +
  '<linearGradient id="cn-rosa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd3e6"/><stop offset="1" stop-color="#ff9fcb"/></linearGradient>' +
  '<linearGradient id="cn-lar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb85e"/><stop offset="1" stop-color="#f26a10"/></linearGradient>' +
  '</defs>' +
  /* corpo e pata esquerda */
  '<ellipse cx="62" cy="148" rx="40" ry="38" fill="url(#cn-pelo)" stroke="#cdb5e8" stroke-width="1.6"/>' +
  '<ellipse cx="62" cy="152" rx="22" ry="22" fill="#fff" opacity=".8"/>' +
  '<ellipse cx="38" cy="133" rx="9" ry="7.5" fill="url(#cn-pelo)" stroke="#cdb5e8" stroke-width="1.4"/>' +
  /* cabeça */
  '<g class="cn-cabeca"><g class="cn-mastiga">' +
  '<g class="cn-orelha e"><ellipse cx="48" cy="42" rx="10.5" ry="29" transform="rotate(-8 48 42)" fill="url(#cn-pelo)" stroke="#cdb5e8" stroke-width="1.6"/><ellipse cx="48" cy="45" rx="5" ry="21" transform="rotate(-8 48 45)" fill="url(#cn-rosa)"/></g>' +
  '<g class="cn-orelha d"><ellipse cx="76" cy="42" rx="10.5" ry="29" transform="rotate(8 76 42)" fill="url(#cn-pelo)" stroke="#cdb5e8" stroke-width="1.6"/><ellipse cx="76" cy="45" rx="5" ry="21" transform="rotate(8 76 45)" fill="url(#cn-rosa)"/></g>' +
  '<ellipse cx="62" cy="92" rx="31" ry="26" fill="url(#cn-pelo)" stroke="#cdb5e8" stroke-width="1.6"/>' +
  '<ellipse cx="53" cy="77" rx="13" ry="5.5" fill="#fff" opacity=".8"/>' +
  '<circle class="cn-bochecha b1" cx="43" cy="99" r="5.5" fill="#ffb3d5" opacity=".7"/>' +
  '<circle class="cn-bochecha b2" cx="81" cy="99" r="5.5" fill="#ffb3d5" opacity=".7"/>' +
  '<g class="cn-olho o1"><circle cx="51" cy="90" r="6.6" fill="#fff" stroke="#cdb5e8" stroke-width=".8"/><g class="cn-pupila"><circle cx="51" cy="90.4" r="3.7" fill="#0a2540"/><circle cx="49.8" cy="89" r="1.2" fill="#fff"/></g></g>' +
  '<g class="cn-olho o2"><circle cx="73" cy="90" r="6.6" fill="#fff" stroke="#cdb5e8" stroke-width=".8"/><g class="cn-pupila"><circle cx="73" cy="90.4" r="3.7" fill="#0a2540"/><circle cx="71.8" cy="89" r="1.2" fill="#fff"/></g></g>' +
  '<path d="M40 98L28 95M40 101L28 103M84 98L96 95M84 101L96 103" stroke="#cdb5e8" stroke-width="1.2" stroke-linecap="round" fill="none"/>' +
  '<ellipse cx="62" cy="98" rx="3.2" ry="2.4" fill="#ff7fb3"/>' +
  '<g class="cn-boca"><path d="M62 100.4v2.6M62 103q-3.6 3.4-7 .2M62 103q3.6 3.4 7 .2" fill="none" stroke="#b5476f" stroke-width="1.6" stroke-linecap="round"/></g>' +
  '</g></g>' +
  /* migalhas */
  '<g class="cn-migalhas" fill="#ff8a2a">' +
  '<circle cx="54" cy="104" r="1.9" style="--dx:-12px;--dy:16px"/><circle cx="58" cy="106" r="1.5" style="--dx:-4px;--dy:22px"/>' +
  '<circle cx="66" cy="106" r="1.7" style="--dx:8px;--dy:20px"/><circle cx="70" cy="103" r="1.4" style="--dx:15px;--dy:13px"/>' +
  '</g>' +
  /* cenoura + pata direita */
  '<g class="cn-cenoura"><g transform="translate(85 114) rotate(28)">' +
  '<path d="M33 0Q42-11 56-9Q50-1 33 0Z" fill="#3fc06b"/><path d="M33 0Q44 2 57 9Q44 11 33 0Z" fill="#22a559"/><path d="M33 0Q46-3 58 0Q46 4 33 0Z" fill="#56d884"/>' +
  '<path class="cn-c0" fill="url(#cn-lar)" d="M-28 0L24-9Q34-9 34 0Q34 9 24 9Z"/>' +
  '<path class="cn-c1" fill="url(#cn-lar)" d="M-12-2.8L24-9Q34-9 34 0Q34 9 24 9L-12 2.8Q-16 1.4-12 0Q-16-1.4-12-2.8Z"/>' +
  '<path class="cn-c2" fill="url(#cn-lar)" d="M2-5.2L24-9Q34-9 34 0Q34 9 24 9L2 5.2Q-3 2.6 2 0Q-3-2.6 2-5.2Z"/>' +
  '<path d="M8-3.5l3 1.2M20 3l3-1.2M13 5l3 1" stroke="#d9540a" stroke-width="1.2" stroke-linecap="round" opacity=".5" fill="none"/>' +
  '<ellipse cx="17" cy="0" rx="8.5" ry="8" fill="url(#cn-pelo)" stroke="#cdb5e8" stroke-width="1.4"/>' +
  '<path d="M13-4.5v3.5M17.5-5.5v4M22-4.5v3.5" stroke="#cdb5e8" stroke-width="1.1" stroke-linecap="round" fill="none"/>' +
  '</g></g>' +
  '</svg>';

let timerCoelho = null, coelhoLigado = false;
function coelho() {
  if (reduzido()) return;
  coelhoLigado = true;
  let teste = false;
  try { teste = new URLSearchParams(location.search).get("coelho") === "teste"; } catch (e) { /* sem prévia */ }
  const agendar = ms => { clearTimeout(timerCoelho); timerCoelho = setTimeout(tentar, ms); };
  const proximo = () => teste ? 12000 : 120000 + Math.random() * 60000;
  function tentar() {
    if (!coelhoLigado) return;
    // espera a aba ficar visível e o aviso de cookies sumir (ele cobre o canto inferior)
    if (document.hidden || document.querySelector("#cookie-banner:not([hidden])")) { agendar(3000); return; }
    if (document.querySelector(".tema-coelho")) return;
    const c = document.createElement("div");
    c.className = "tema-coelho"; c.setAttribute("aria-hidden", "true");
    c.innerHTML = COELHO_SVG;
    c.addEventListener("animationend", e => {
      if (e.target !== c) return;
      c.remove();
      if (coelhoLigado) agendar(proximo());
    });
    document.body.appendChild(c);
  }
  agendar(teste ? 800 : 4000);
}
function tirarCoelho() {
  coelhoLigado = false; clearTimeout(timerCoelho);
  document.querySelectorAll(".tema-coelho").forEach(e => e.remove());
}

/* Dia da Mulher: pétalas caindo */
const PETALAS = [["#f3d9ff", "#c59bf0"], ["#ffd9ec", "#ff9fcb"], ["#ffffff", "#e6d4f7"], ["#d4f5e4", "#7fd6ad"], ["#e8d9ff", "#a97be8"]];
function petalas() {
  if (reduzido()) return;
  const caixa = document.createElement("div");
  caixa.className = "tema-petalas"; caixa.setAttribute("aria-hidden", "true");
  const total = innerWidth < 700 ? 12 : 22;
  for (let i = 0; i < total; i++) {
    const p = document.createElement("i");
    const cor = PETALAS[Math.floor(Math.random() * PETALAS.length)];
    p.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
    p.style.setProperty("--s", (10 + Math.random() * 9).toFixed(0) + "px");
    p.style.setProperty("--d", (10 + Math.random() * 9).toFixed(1) + "s");
    p.style.setProperty("--a", "-" + (Math.random() * 19).toFixed(1) + "s");
    p.style.setProperty("--w", (Math.random() * 90 - 45).toFixed(0) + "px");
    p.style.setProperty("--c1", cor[0]);
    p.style.setProperty("--c2", cor[1]);
    caixa.appendChild(p);
  }
  document.body.appendChild(caixa);
}

/* Dia dos Namorados: corações subindo */
const CORES_CORACAO = ["#ff4d7d", "#ff8fb1", "#e0245e", "#ffb3c7", "#ff6b9a"];
function coracoes() {
  if (reduzido()) return;
  const caixa = document.createElement("div");
  caixa.className = "tema-coracoes"; caixa.setAttribute("aria-hidden", "true");
  const total = innerWidth < 700 ? 10 : 18;
  for (let i = 0; i < total; i++) {
    const c = document.createElement("i");
    c.textContent = "♥";
    c.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
    c.style.setProperty("--s", (12 + Math.random() * 14).toFixed(0) + "px");
    c.style.setProperty("--d", (9 + Math.random() * 8).toFixed(1) + "s");
    c.style.setProperty("--a", "-" + (Math.random() * 17).toFixed(1) + "s");
    c.style.setProperty("--w", (Math.random() * 60 - 30).toFixed(0) + "px");
    c.style.setProperty("--c", CORES_CORACAO[Math.floor(Math.random() * CORES_CORACAO.length)]);
    caixa.appendChild(c);
  }
  document.body.appendChild(caixa);
}

/* Dia das Mães: flores caindo (as cores vêm do CSS, por posição) */
function flores() {
  if (reduzido()) return;
  const caixa = document.createElement("div");
  caixa.className = "tema-flores"; caixa.setAttribute("aria-hidden", "true");
  const total = innerWidth < 700 ? 10 : 18;
  for (let i = 0; i < total; i++) {
    const f = document.createElement("i");
    f.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
    f.style.setProperty("--s", (16 + Math.random() * 12).toFixed(0) + "px");
    f.style.setProperty("--d", (11 + Math.random() * 9).toFixed(1) + "s");
    f.style.setProperty("--a", "-" + (Math.random() * 20).toFixed(1) + "s");
    f.style.setProperty("--w", (Math.random() * 80 - 40).toFixed(0) + "px");
    caixa.appendChild(f);
  }
  document.body.appendChild(caixa);
}

/* Dia dos Pais: gravatas caindo */
const GRAVATAS = [["#2f6fc4", "#1d4e89"], ["#f08a1c", "#c46a08"], ["#7fa9e8", "#2f6fc4"], ["#2a9d8f", "#1a6f66"]];
function gravatas() {
  if (reduzido()) return;
  const caixa = document.createElement("div");
  caixa.className = "tema-gravatas"; caixa.setAttribute("aria-hidden", "true");
  const total = innerWidth < 700 ? 8 : 14;
  for (let i = 0; i < total; i++) {
    const g = document.createElement("i");
    const cor = GRAVATAS[Math.floor(Math.random() * GRAVATAS.length)];
    g.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
    g.style.setProperty("--s", (10 + Math.random() * 7).toFixed(0) + "px");
    g.style.setProperty("--d", (11 + Math.random() * 9).toFixed(1) + "s");
    g.style.setProperty("--a", "-" + (Math.random() * 20).toFixed(1) + "s");
    g.style.setProperty("--w", (Math.random() * 70 - 35).toFixed(0) + "px");
    g.style.setProperty("--c1", cor[0]);
    g.style.setProperty("--c2", cor[1]);
    caixa.appendChild(g);
  }
  document.body.appendChild(caixa);
}

/* Consciência Negra: estrelas nas cores pan-africanas, caindo devagar (discreto) */
const ESTRELAS = [["#ffd24d", "#f7b500"], ["#ffd24d", "#f7b500"], ["#e8574a", "#b32a1b"], ["#4cc17f", "#1f8a4c"]];
function estrelas(paleta = ESTRELAS) {
  if (reduzido()) return;
  const caixa = document.createElement("div");
  caixa.className = "tema-estrelas"; caixa.setAttribute("aria-hidden", "true");
  const total = innerWidth < 700 ? 9 : 16;
  for (let i = 0; i < total; i++) {
    const e = document.createElement("i");
    const cor = paleta[Math.floor(Math.random() * paleta.length)];
    e.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
    e.style.setProperty("--s", (9 + Math.random() * 8).toFixed(0) + "px");
    e.style.setProperty("--d", (13 + Math.random() * 9).toFixed(1) + "s");
    e.style.setProperty("--a", "-" + (Math.random() * 22).toFixed(1) + "s");
    e.style.setProperty("--w", (Math.random() * 50 - 25).toFixed(0) + "px");
    e.style.setProperty("--c1", cor[0]);
    e.style.setProperty("--c2", cor[1]);
    caixa.appendChild(e);
  }
  document.body.appendChild(caixa);
}

/* Proclamação da República: estrelas azuis, amarelas e verdes */
const ESTRELAS_REPUBLICA = [["#ffe35a", "#f2b705"], ["#ffe35a", "#f2b705"], ["#5b86e0", "#1c479f"], ["#3fb872", "#12803a"]];

/* Dia dos Professores: letras e números coloridos caindo */
const LETRAS = "ABCDEFGHIJKLMNOPRSTUVZ0123456789+=?".split("");
const CORES_LETRAS = ["#e8574a", "#f2b705", "#3a7bd5", "#2fa36b", "#8e5bd6"];
function letras() {
  if (reduzido()) return;
  const caixa = document.createElement("div");
  caixa.className = "tema-letras"; caixa.setAttribute("aria-hidden", "true");
  const total = innerWidth < 700 ? 10 : 18;
  for (let i = 0; i < total; i++) {
    const l = document.createElement("i");
    l.textContent = LETRAS[Math.floor(Math.random() * LETRAS.length)];
    l.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
    l.style.setProperty("--s", (16 + Math.random() * 12).toFixed(0) + "px");
    l.style.setProperty("--d", (11 + Math.random() * 9).toFixed(1) + "s");
    l.style.setProperty("--a", "-" + (Math.random() * 20).toFixed(1) + "s");
    l.style.setProperty("--w", (Math.random() * 70 - 35).toFixed(0) + "px");
    l.style.setProperty("--c", CORES_LETRAS[Math.floor(Math.random() * CORES_LETRAS.length)]);
    caixa.appendChild(l);
  }
  document.body.appendChild(caixa);
}

/* Festa Junina: fagulhas de fogueira subindo */
function fagulhas() {
  if (reduzido()) return;
  const caixa = document.createElement("div");
  caixa.className = "tema-fagulhas"; caixa.setAttribute("aria-hidden", "true");
  const total = innerWidth < 700 ? 14 : 26;
  for (let i = 0; i < total; i++) {
    const f = document.createElement("i");
    f.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
    f.style.setProperty("--s", (3 + Math.random() * 4).toFixed(1) + "px");
    f.style.setProperty("--d", (7 + Math.random() * 7).toFixed(1) + "s");
    f.style.setProperty("--a", "-" + (Math.random() * 14).toFixed(1) + "s");
    f.style.setProperty("--w", (Math.random() * 70 - 35).toFixed(0) + "px");
    caixa.appendChild(f);
  }
  document.body.appendChild(caixa);
}

/* ---------- Faixa de felicitação, abaixo da logo do banner (página inicial) ----------
   Para mudar um texto, edite MENSAGENS. Prévia de um dia específico: ?tema=natal&data=12-25 */
const MENSAGENS = {
  natal: md => md === "12-25" ? "Feliz Natal!" : "Boas festas!",
  anonovo: (md, ano) => md === "01-01" ? "Feliz Ano Novo " + ano + "!" : "Boas festas!",
  carnaval: () => "Muita folia nesse Carnaval!",
  mulheres: () => "Feliz Dia da Mulher!",
  pascoa: () => "Feliz Páscoa!",
  namorados: () => "Feliz Dia dos Namorados!",
  junina: () => "Feliz Festa Junina!",
  maes: () => "Feliz Dia das Mães!",
  pais: () => "Feliz Dia dos Pais!",
  independencia: md => md === "09-07" ? "Viva a Independência do Brasil!" : "Semana da Pátria!",
  professores: () => "Feliz Dia dos Professores!",
  republica: () => "Proclamação da República!",
  consciencia: md => md === "11-20" ? "Dia da Consciência Negra!" : "Semana da Consciência Negra"
};
function faixaHero() {
  const arte = document.querySelector(".hero-art");
  if (!arte || arte.querySelector(".tema-faixa") || !MENSAGENS[tema.id]) return;
  let dia = hoje();
  try {
    const t = new URLSearchParams(location.search).get("data");
    if (/^\d\d-\d\d$/.test(t || "")) dia = dia.slice(0, 4) + "-" + t;
  } catch (e) { /* sem prévia */ }
  const f = document.createElement("span");
  f.className = "tema-faixa";
  f.textContent = MENSAGENS[tema.id](dia.slice(5), dia.slice(0, 4));
  arte.appendChild(f);
}
const tirarFaixa = () => document.querySelectorAll(".tema-faixa").forEach(e => e.remove());

const DECORACOES = {
  natal: {
    ligar() { neve(); chapeuHero(); },
    desligar() { document.querySelectorAll(".tema-neve, .tema-chapeu").forEach(e => e.remove()); }
  },
  anonovo: {
    ligar() { confete(); fogos(); chapeuHero(); },
    desligar() {
      clearInterval(timerFogos);
      document.querySelectorAll(".tema-confete, .tema-fogos, .tema-chapeu").forEach(e => e.remove());
    }
  },
  carnaval: {
    ligar() { confete(CORES_CARNAVAL); chapeuHero(); },
    desligar() { document.querySelectorAll(".tema-confete, .tema-chapeu").forEach(e => e.remove()); }
  },
  pascoa: {
    ligar() { ovos(); coelho(); chapeuHero(); },
    desligar() { tirarCoelho(); document.querySelectorAll(".tema-ovos, .tema-chapeu").forEach(e => e.remove()); }
  },
  mulheres: {
    ligar() { petalas(); chapeuHero(); },
    desligar() { document.querySelectorAll(".tema-petalas, .tema-chapeu").forEach(e => e.remove()); }
  },
  namorados: {
    ligar() { coracoes(); chapeuHero(); },
    desligar() { document.querySelectorAll(".tema-coracoes, .tema-chapeu").forEach(e => e.remove()); }
  },
  junina: {
    ligar() { fagulhas(); chapeuHero(); },
    desligar() { document.querySelectorAll(".tema-fagulhas, .tema-chapeu").forEach(e => e.remove()); }
  },
  maes: {
    ligar() { flores(); chapeuHero(); },
    desligar() { document.querySelectorAll(".tema-flores, .tema-chapeu").forEach(e => e.remove()); }
  },
  pais: {
    ligar() { gravatas(); chapeuHero(); },
    desligar() { document.querySelectorAll(".tema-gravatas, .tema-chapeu").forEach(e => e.remove()); }
  },
  independencia: {
    ligar() { confete(CORES_BRASIL); chapeuHero(); },
    desligar() { document.querySelectorAll(".tema-confete, .tema-chapeu").forEach(e => e.remove()); }
  },
  professores: {
    ligar() { letras(); chapeuHero(); },
    desligar() { document.querySelectorAll(".tema-letras, .tema-chapeu").forEach(e => e.remove()); }
  },
  republica: {
    ligar() { estrelas(ESTRELAS_REPUBLICA); chapeuHero(); },
    desligar() { document.querySelectorAll(".tema-estrelas, .tema-chapeu").forEach(e => e.remove()); }
  },
  consciencia: {
    ligar() { estrelas(); chapeuHero(); },
    desligar() { document.querySelectorAll(".tema-estrelas, .tema-chapeu").forEach(e => e.remove()); }
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
      delete html.dataset.tema; DECORACOES[tema.id].desligar(); tirarFaixa();
      try { localStorage.setItem("tema_off", "1"); } catch (e) {}
    } else {
      html.dataset.tema = tema.id; DECORACOES[tema.id].ligar(); faixaHero();
      try { localStorage.removeItem("tema_off"); } catch (e) {}
    }
    atualizar();
  });
  atualizar();
  document.body.appendChild(b);
}

function iniciar() {
  criarBotao();
  if (html.dataset.tema) { DECORACOES[tema.id].ligar(); faixaHero(); }
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();