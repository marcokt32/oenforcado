(() => {
"use strict";

const MAX_ERROS = 6;
const NOMES = {
  historia: "História", geografia: "Geografia", quimica: "Química", biologia: "Biologia", fisica: "Física",
  cultura: "Cultura geral", musica: "Música", cinema: "Cinema", games: "Games", esporte: "Esportes",
  literatura: "Literatura", politica: "Política", portugues: "Língua portuguesa", matematica: "Matemática",
  tratamento: "Tratamento de água", biblia: "Bíblia"
};
const DIFICULDADES = [
  { id: "facil", nome: "Fácil · até 8 letras" },
  { id: "medio", nome: "Médio · 9 a 12 letras" },
  { id: "dificil", nome: "Difícil · 13+ letras" }
];
const XP_BASE = { facil: 10, medio: 20, dificil: 30 };
const LINHAS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const $ = id => document.getElementById(id);

const normalizar = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
const qtdLetras = p => p.replace(/[^A-Z]/g, "").length;
const faixa = p => { const n = qtdLetras(p); return n <= 8 ? "facil" : n <= 12 ? "medio" : "dificil"; };

const banco = Object.keys(bancoPalavras).flatMap(cat =>
  bancoPalavras[cat].map(x => ({ cat, palavra: normalizar(x.palavra), dica: x.dica }))
).filter(x => qtdLetras(x.palavra) > 0);

const categorias = [{ id: "todas", nome: "Todas as categorias" }].concat(
  Object.keys(NOMES).filter(k => bancoPalavras[k]).map(k => ({ id: k, nome: NOMES[k] }))
);

let alvo = null, certas, erradas, dicaUsada, fim, venceu, est;

function escolher() {
  if (est.diario) {
    const r = Portal.rngDiario("forca");
    const pool = banco.filter(x => faixa(x.palavra) === "medio");
    return pool[Math.floor(r() * pool.length)];
  }
  let pool = banco.filter(x => (est.categoria === "todas" || x.cat === est.categoria) && faixa(x.palavra) === est.dificuldade);
  if (!pool.length) pool = banco.filter(x => est.categoria === "todas" || x.cat === est.categoria);
  let nova;
  do { nova = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && alvo && nova.palavra === alvo.palavra);
  return nova;
}

function renderTeclado() {
  const t = $("teclado");
  t.replaceChildren();
  LINHAS.forEach(linha => {
    const div = document.createElement("div");
    div.className = "teclado-linha";
    for (const l of linha) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "tecla"; b.textContent = l; b.dataset.letra = l;
      b.setAttribute("aria-label", "Letra " + l);
      b.addEventListener("click", () => tentar(l));
      div.appendChild(b);
    }
    t.appendChild(div);
  });
}

function renderPalavra() {
  const el = $("palavra");
  el.replaceChildren();
  alvo.palavra.split(" ").forEach(grupo => {
    const g = document.createElement("span");
    g.className = "forca-grupo";
    for (const ch of grupo) {
      const c = document.createElement("span");
      c.className = "forca-letra";
      if (/[A-Z]/.test(ch)) {
        if (certas.has(ch)) c.textContent = ch;
        else if (fim && !venceu) { c.textContent = ch; c.classList.add("revelada"); }
      } else { c.textContent = ch; c.classList.add("fixa"); }
      g.appendChild(c);
    }
    el.appendChild(g);
  });
}

function atualizarPainel() {
  $("erros").textContent = erradas.size + " / " + MAX_ERROS;
  $("erradas").textContent = erradas.size ? "Erradas: " + [...erradas].join(" ") : "";
  for (let i = 1; i <= MAX_ERROS; i++) $("p" + i).classList.toggle("on", i <= erradas.size);
}

function tentar(l) {
  if (fim || certas.has(l) || erradas.has(l)) return;
  const acertou = alvo.palavra.includes(l);
  (acertou ? certas : erradas).add(l);
  const tecla = document.querySelector(`.tecla[data-letra="${l}"]`);
  if (tecla) { tecla.disabled = true; tecla.classList.add(acertou ? "certa" : "erro"); }
  atualizarPainel();
  renderPalavra();
  $("mensagem").textContent = acertou ? "Boa! Essa letra está na palavra." : "Essa letra não está na palavra.";

  const todasLetras = new Set(alvo.palavra.replace(/[^A-Z]/g, ""));
  if ([...todasLetras].every(c => certas.has(c))) terminar(true);
  else if (erradas.size >= MAX_ERROS) terminar(false);
}

function terminar(ganhou) {
  fim = true; venceu = ganhou;
  renderPalavra();
  document.querySelectorAll(".tecla").forEach(t => { t.disabled = true; });

  const r = $("resultado");
  r.hidden = false;
  r.classList.toggle("perdeu", !ganhou);
  $("resultado-titulo").textContent = ganhou ? "Você acertou!" : "Fim de jogo!";
  $("palavra-final").textContent = "A palavra era " + alvo.palavra + ".";
  $("jogar-novamente").textContent = est.diario && !ganhou ? "Tentar de novo" : "Próxima palavra";
  $("mensagem").textContent = ganhou ? "Parabéns!" : "Não foi dessa vez. Tente outra palavra!";

  let info = null;
  if (ganhou) {
    const xp = XP_BASE[faixa(alvo.palavra)] + (erradas.size === 0 ? 10 : 0) - (dicaUsada ? 5 : 0);
    info = Portal.concluir({ jogo: "forca", xp, diario: est.diario });
    tb.refresh();
  }
  const [, m, d] = Portal.hoje().split("-");
  const titulo = est.diario ? `🪢 Forca · Desafio do dia ${d}/${m}` : `🪢 Forca · ${NOMES[alvo.cat]}`;
  const linha = ganhou
    ? `✅ Acertei com ${erradas.size} ${erradas.size === 1 ? "erro" : "erros"} de ${MAX_ERROS}`
    : "❌ Não consegui desta vez";
  Portal.anexarFim(r, { jogo: "forca", texto: `${titulo}\n${linha}\nConsegue fazer melhor?`, info });
}

function novo() {
  est = tb.estado();
  alvo = escolher();
  certas = new Set(); erradas = new Set(); dicaUsada = false; fim = false; venceu = false;
  $("categoria-atual").textContent = NOMES[alvo.cat] || alvo.cat;
  $("dica-texto").hidden = true;
  $("dica-btn").hidden = false;
  $("resultado").hidden = true;
  $("mensagem").textContent = "Toque nas letras para descobrir a palavra.";
  renderTeclado(); renderPalavra(); atualizarPainel();
}

$("dica-btn").addEventListener("click", () => {
  if (fim) return;
  dicaUsada = true;
  $("dica-texto").textContent = "Dica: " + alvo.dica;
  $("dica-texto").hidden = false;
  $("dica-btn").hidden = true;
});
$("novo-jogo").addEventListener("click", novo);
$("jogar-novamente").addEventListener("click", novo);
document.addEventListener("keydown", e => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const l = normalizar(e.key);
  if (/^[A-Z]$/.test(l)) tentar(l);
});

// Cada categoria com página própria leva para a URL dela; as demais voltam para /forca.html
const PAGINAS = {
  todas: "forca", biblia: "jogo-da-forca-biblica", geografia: "jogo-da-forca-de-geografia", historia: "jogo-da-forca-de-historia",
  portugues: "jogo-da-forca-de-portugues", matematica: "jogo-da-forca-de-matematica", cinema: "jogo-da-forca-de-filmes",
  musica: "jogo-da-forca-de-musica", games: "jogo-da-forca-de-games", esporte: "jogo-da-forca-de-esportes"
};
const slugAtual = () => location.pathname.replace(/^\/|\.html$/g, "") || "index";
let categoriaAtual = null;
function aoMudar(e) {
  if (!e.diario && categoriaAtual && e.categoria !== categoriaAtual) {
    const destino = PAGINAS[e.categoria] || "forca";
    if (destino !== slugAtual()) { location.href = "/" + destino + ".html"; return; }
  }
  categoriaAtual = e.categoria;
  novo();
}

const tb = Portal.toolbar($("toolbar"), { jogo: "forca", categorias, dificuldades: DIFICULDADES, dificuldadePadrao: "medio", categoriaInicial: document.body.dataset.categoria, onChange: aoMudar });
categoriaAtual = tb.estado().categoria;
novo();
})();
