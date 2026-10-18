// Menu "sanduíche" para telas pequenas, com os jogos agrupados por categoria.
// Para adicionar um jogo ou categoria (ex.: Palavras cruzadas, Lógica grega), edite CATEGORIAS abaixo
// (e a lista JOGOS em js/portal.js, usada pelo menu do desktop).
(() => {
"use strict";

const CATEGORIAS = [
  { id: "palavras", nome: "Palavras", icone: "🔤", jogos: [
    { nome: "Jogo da forca", url: "/forca.html", id: "forca" },
    { nome: "Anagrama", url: "/anagrama.html", id: "anagrama" },
    { nome: "Termo", url: "/termo.html", id: "termo" },
    { nome: "Caça-palavras", url: "/caca-palavras.html", id: "caca" }
  ] },
  { id: "logica", nome: "Lógica", icone: "🧩", jogos: [
    { nome: "Kyudoku", url: "/kyudoku.html", id: "kyudoku" },
    { nome: "Lógica grega", url: "/logica-grega.html", id: "logicagrega" }
  ] }
];

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Jogo atual: pelo atributo data-jogo (páginas por categoria) ou pelo endereço da página
function jogoAtualUrl(path, dataJogo) {
  const p = (path || "").replace(/\/$/, "").replace(/\.html$/, "");
  for (const c of CATEGORIAS) for (const j of c.jogos) {
    if (j.url.replace(".html", "") === p || j.id === dataJogo) return j.url;
  }
  return "";
}

// HTML do menu (função pura, fácil de testar)
function montarDrawerHTML(atualUrl, temPortal) {
  const atual = CATEGORIAS.find(c => c.jogos.some(j => j.url === atualUrl));
  const cats = CATEGORIAS.map(c => {
    const aberta = atual && atual.id === c.id;
    return `<div class="pm-cat">` +
      `<button type="button" class="pm-cat-btn" aria-expanded="${aberta ? "true" : "false"}" aria-controls="pm-cat-${c.id}"><span>${c.icone} ${esc(c.nome)}</span><span class="pm-chevron" aria-hidden="true">▾</span></button>` +
      `<ul class="pm-cat-lista" id="pm-cat-${c.id}"${aberta ? "" : " hidden"}>` +
      c.jogos.map(j => `<li><a href="${j.url}"${j.url === atualUrl ? ' aria-current="page"' : ""}>${esc(j.nome)}</a></li>`).join("") +
      `</ul></div>`;
  }).join("");
  const rapido = temPortal
    ? `<div class="pm-drawer-rapido"><button type="button" class="pm-drawer-diario" data-pm="diario">📅 Desafio do dia</button><button type="button" class="pm-drawer-rank" data-pm="ranking">🏆 Ranking</button></div>`
    : "";
  return `<div class="pm-drawer-head"><strong>Menu</strong><button type="button" class="pm-drawer-x" aria-label="Fechar menu">✕</button></div>` +
    `<div class="pm-drawer-body">${rapido}<a class="pm-drawer-link" href="/">🏠 Início</a>${cats}<a class="pm-drawer-link" href="/sobre.html">ℹ️ Sobre o projeto</a></div>`;
}

if (typeof document === "undefined") { module.exports = { montarDrawerHTML, jogoAtualUrl, CATEGORIAS }; return; }

const $ = id => document.getElementById(id);
let ultimoFoco = null;

function garantirBotao() {
  if ($("pm-burger")) return;
  const header = document.querySelector(".site-header, .portal-header");
  if (!header) return;
  const b = document.createElement("button");
  b.type = "button"; b.id = "pm-burger"; b.className = "pm-burger";
  b.setAttribute("aria-label", "Abrir menu"); b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-controls", "pm-drawer");
  b.innerHTML = "<span></span><span></span><span></span>";
  header.appendChild(b);
}

function criarDrawer() {
  let d = $("pm-drawer");
  if (d) { d.innerHTML = montarDrawerHTML(jogoAtualUrl(location.pathname, document.body.dataset.jogo), !!window.Portal); return d; }
  const ov = document.createElement("div"); ov.id = "pm-drawer-overlay"; ov.className = "pm-drawer-overlay";
  d = document.createElement("aside"); d.id = "pm-drawer"; d.className = "pm-drawer";
  d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", "Menu principal");
  d.innerHTML = montarDrawerHTML(jogoAtualUrl(location.pathname, document.body.dataset.jogo), !!window.Portal);
  document.body.appendChild(ov); document.body.appendChild(d);
  ov.addEventListener("click", fechar);
  return d;
}

function abrir() {
  const d = criarDrawer(), b = $("pm-burger");
  ultimoFoco = document.activeElement;
  d.classList.add("aberto"); $("pm-drawer-overlay").classList.add("aberto");
  document.documentElement.classList.add("pm-menu-aberto");
  if (b) { b.setAttribute("aria-expanded", "true"); b.setAttribute("aria-label", "Fechar menu"); }
  const x = d.querySelector(".pm-drawer-x"); if (x) x.focus();
}

function fechar() {
  const d = $("pm-drawer"), b = $("pm-burger");
  if (!d || !d.classList.contains("aberto")) return;
  d.classList.remove("aberto"); $("pm-drawer-overlay").classList.remove("aberto");
  document.documentElement.classList.remove("pm-menu-aberto");
  if (b) { b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-label", "Abrir menu"); }
  if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
}

document.addEventListener("click", e => {
  if (e.target.closest("#pm-burger")) {
    const d = $("pm-drawer");
    if (d && d.classList.contains("aberto")) fechar(); else abrir();
    return;
  }
  const d = $("pm-drawer");
  if (!d || !d.contains(e.target)) return;
  if (e.target.closest(".pm-drawer-x")) { fechar(); return; }
  const cat = e.target.closest(".pm-cat-btn");
  if (cat) {
    const aberto = cat.getAttribute("aria-expanded") === "true";
    cat.setAttribute("aria-expanded", aberto ? "false" : "true");
    const lista = $(cat.getAttribute("aria-controls")); if (lista) lista.hidden = aberto;
    return;
  }
  if (e.target.closest("a, [data-pm]")) fechar(); // navegou ou acionou desafio/ranking
});

document.addEventListener("keydown", e => {
  const d = $("pm-drawer");
  if (!d || !d.classList.contains("aberto")) return;
  if (e.key === "Escape") { fechar(); return; }
  if (e.key === "Tab") { // mantém o foco dentro do menu
    const f = Array.from(d.querySelectorAll("button, a[href]")).filter(el => el.offsetParent !== null);
    if (!f.length) return;
    const primeiro = f[0], ultimo = f[f.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  }
});

window.addEventListener("resize", () => { if (window.innerWidth > 860) fechar(); });
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", garantirBotao); else garantirBotao();
})();
