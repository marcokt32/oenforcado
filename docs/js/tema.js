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
    ligar() { ovos(); chapeuHero(); },
    desligar() { document.querySelectorAll(".tema-ovos, .tema-chapeu").forEach(e => e.remove()); }
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