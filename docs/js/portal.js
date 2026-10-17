// Núcleo compartilhado dos jogos: cabeçalho, login (Google), XP único, desafio do dia,
// filtros (categoria/dificuldade), ranking e compartilhamento.
(() => {
"use strict";

const JOGOS = [
  { id: "forca", nome: "Jogo da forca", url: "/forca.html" },
  { id: "caca", nome: "Caça-palavras", url: "/caca-palavras.html" },
  { id: "termo", nome: "Termo", url: "/termo.html" },
  { id: "anagrama", nome: "Anagrama", url: "/anagrama.html" }
];
const KEY = "portal_v2";
const BONUS_DIARIO = 50;
const SITE = "https://oenforcado.com";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- Estado local (vale sem login) ---------- */
function base() { return { xp: 0, jogos: {}, diarios: {}, streak: { atual: 0, melhor: 0, ultimo: null }, prefs: {} }; }
function ler() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && typeof d === "object") return Object.assign(base(), d); } catch (e) {}
  const novo = base();
  try { // aproveita o XP antigo da forca
    const l = JSON.parse(localStorage.getItem("pontuacoesJogoForca"));
    if (l && l.ranking && l.ranking.xp > 0) novo.xp = Math.floor(l.ranking.xp);
  } catch (e) {}
  return novo;
}
function salvar(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }

/* ---------- Data e sorteio do desafio do dia ---------- */
function hoje() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()); }
function diaAnterior(dia) { return new Date(new Date(dia + "T12:00:00Z").getTime() - 864e5).toISOString().slice(0, 10); }
function hash(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const rngDiario = jogo => rng(hash(jogo + ":" + hoje()));
const diarioConcluido = jogo => !!(ler().diarios[hoje()] || {})[jogo];

/* ---------- Auth (Google) e ranking ---------- */
const auth = firebase.auth();
auth.languageCode = "pt";
let authPronto = false;

const nomeConta = u => ((u.displayName || "Jogador").split(" ")[0] || "Jogador").slice(0, 20);
const avatarConta = u => "img/avatars/avatar" + ((hash(u.uid) % 6) + 1) + ".png";

async function entrar() {
  const provedor = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provedor);
    if (typeof gtag === "function") gtag("event", "login", { method: "google" });
  } catch (e) {
    if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") return;
    if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
      try { await auth.signInWithRedirect(provedor); return; } catch (_) {}
      toast("Não foi possível abrir o login neste navegador. Tente no Chrome ou no Safari.");
      return;
    }
    console.error("Erro no login:", e.code, e);
    toast("Não foi possível entrar (" + (e.code || "erro") + ").");
  }
}

async function sair() {
  await auth.signOut();
  const d = ler(); d.xp = 0; d.jogos = {}; salvar(d); // o XP fica guardado na conta
  fecharMenu(); renderAcoes();
  toast("Você saiu da conta.");
}

async function sincronizarConta(u) {
  const ref = db.ref("ranking/" + u.uid);
  const remoto = (await ref.once("value")).val();
  const d = ler();
  const xp = Math.max(d.xp, (remoto && remoto.xp) || 0);
  d.xp = xp; salvar(d);
  const dados = { nome: nomeConta(u), avatar: avatarConta(u), xp, atualizado: Date.now() };
  if (!remoto || remoto.xp !== xp || remoto.nome !== dados.nome || remoto.avatar !== dados.avatar) await ref.update(dados);
}

function enviarXP(xp) {
  const u = auth.currentUser;
  if (!u) return;
  db.ref("ranking/" + u.uid).update({ nome: nomeConta(u), avatar: avatarConta(u), xp, atualizado: Date.now() }).catch(() => {});
}

/* ---------- Avisos (notificações push) — opcional, só para quem está logado ---------- */
const VAPID_KEY = "BG6tmpS6lsZ4iRMR5YJypbiWSZ-IzHKTi2b-4nix9EQR5LinxnsjNtkrs0A0rsEBxdt8-dqd2TRljeZ2RRUInJQ";
const FLAG_NOTIF = "portal_notif";
let notifOk = false;

const notifAtivas = () => localStorage.getItem(FLAG_NOTIF) === "1" && "Notification" in window && Notification.permission === "granted";

async function registrarToken(u, pedirPermissao) {
  if (pedirPermissao && Notification.permission !== "granted") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { toast("Sem permissão do navegador, os avisos não foram ativados."); return false; }
  }
  if (Notification.permission !== "granted") return false;
  const registro = await navigator.serviceWorker.ready;
  const token = await firebase.messaging().getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: registro });
  if (!token) return false;
  await db.ref("tokens/" + u.uid).set(token);
  localStorage.setItem(FLAG_NOTIF, "1");
  return true;
}

async function alternarNotificacoes() {
  const u = auth.currentUser;
  if (!u) { toast("Entre com o Google para ativar os avisos."); return; }
  try {
    if (notifAtivas()) {
      try { await firebase.messaging().deleteToken(); } catch (e) {}
      await db.ref("tokens/" + u.uid).remove();
      localStorage.removeItem(FLAG_NOTIF);
      toast("Avisos desativados.");
    } else if (await registrarToken(u, true)) {
      toast("Avisos ativados! Você será lembrado do desafio do dia.");
    }
  } catch (e) {
    console.error("Erro nas notificações:", e);
    toast("Não foi possível alterar os avisos agora.");
  }
  renderAcoes();
}

function iniciarNotificacoes() {
  try {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !firebase.messaging) return;
    Promise.resolve(firebase.messaging.isSupported()).then(ok => {
      notifOk = !!ok;
      if (!ok) return;
      firebase.messaging().onMessage(m => { const n = (m && m.notification) || {}; toast((n.title ? n.title + ": " : "") + (n.body || "")); });
      renderAcoes();
    }).catch(() => {});
  } catch (e) {}
}

/* ---------- XP e desafio do dia ---------- */
function concluir({ jogo, xp, diario }) {
  const d = ler(), dia = hoje();
  let ganho = Math.max(0, Math.round(xp)), bonus = 0, repetido = false;

  if (diario) {
    d.diarios[dia] = d.diarios[dia] || {};
    if (d.diarios[dia][jogo]) { ganho = 0; repetido = true; }
    else {
      d.diarios[dia][jogo] = true; bonus = BONUS_DIARIO;
      if (d.streak.ultimo !== dia) {
        d.streak.atual = d.streak.ultimo === diaAnterior(dia) ? d.streak.atual + 1 : 1;
        d.streak.melhor = Math.max(d.streak.melhor, d.streak.atual);
        d.streak.ultimo = dia;
      }
    }
  }
  ganho += bonus;
  d.xp += ganho;
  const j = d.jogos[jogo] = d.jogos[jogo] || { xp: 0, partidas: 0 };
  j.xp += ganho; j.partidas++;
  salvar(d);
  enviarXP(d.xp);
  if (typeof gtag === "function") gtag("event", "level_end", { level_name: jogo, success: true, daily: !!diario });
  return { ganho, bonus, repetido, total: d.xp, streak: d.streak.atual };
}

/* ---------- Filtros: categoria / dificuldade / desafio do dia ---------- */
function criarBotaoDiario(jogo, onToggle) {
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "button pm-diario";
  const ctl = { el: btn, ativo: false, refresh() {
    const feito = diarioConcluido(jogo);
    btn.classList.toggle("ativo", ctl.ativo);
    btn.textContent = ctl.ativo ? "↩ Voltar ao jogo livre" : "📅 Desafio do dia" + (feito ? " ✅" : "");
  } };
  btn.addEventListener("click", () => { ctl.ativo = !ctl.ativo; ctl.refresh(); onToggle(ctl.ativo); });
  ctl.refresh();
  return ctl;
}

function toolbar(el, cfg) {
  const { jogo, categorias, dificuldades, onChange } = cfg;
  const prefs = ler().prefs[jogo] || {};
  const valido = (lista, v) => lista && lista.some(x => x.id === v);
  const st = {
    categoria: categorias ? (valido(categorias, cfg.categoriaInicial) ? cfg.categoriaInicial : valido(categorias, prefs.categoria) ? prefs.categoria : categorias[0].id) : null,
    dificuldade: dificuldades ? (valido(dificuldades, prefs.dificuldade) ? prefs.dificuldade : (cfg.dificuldadePadrao || dificuldades[0].id)) : null,
    diario: false
  };
  const opcoes = (lista, atual) => lista.map(o => `<option value="${esc(o.id)}"${o.id === atual ? " selected" : ""}>${esc(o.nome)}</option>`).join("");
  el.className = "game-toolbar";
  el.innerHTML =
    (categorias ? `<label>Categoria<select id="pm-cat">${opcoes(categorias, st.categoria)}</select></label>` : "") +
    (dificuldades ? `<label>Dificuldade<select id="pm-dif">${opcoes(dificuldades, st.dificuldade)}</select></label>` : "") +
    `<p class="pm-info" id="pm-info" hidden></p>`;
  const selCat = $("pm-cat"), selDif = $("pm-dif"), info = $("pm-info");

  const salvarPrefs = () => { const d = ler(); d.prefs[jogo] = { categoria: st.categoria, dificuldade: st.dificuldade }; salvar(d); };
  const atualizar = () => {
    if (selCat) selCat.disabled = st.diario;
    if (selDif) selDif.disabled = st.diario;
    info.hidden = !st.diario;
    if (st.diario) {
      const [a, m, dd] = hoje().split("-");
      info.textContent = diarioConcluido(jogo)
        ? "Você já concluiu o desafio de hoje. Jogar de novo não rende XP."
        : `Desafio de ${dd}/${m}: o mesmo para todos os jogadores. Concluir vale +${BONUS_DIARIO} XP e mantém sua sequência.`;
    }
  };
  const mudou = () => { atualizar(); onChange(ctl.estado()); };
  const diario = criarBotaoDiario(jogo, ativo => { st.diario = ativo; mudou(); });
  el.insertBefore(diario.el, info);

  if (selCat) selCat.addEventListener("change", () => { st.categoria = selCat.value; salvarPrefs(); mudou(); });
  if (selDif) selDif.addEventListener("change", () => { st.dificuldade = selDif.value; salvarPrefs(); mudou(); });

  const ctl = {
    estado: () => ({ categoria: st.categoria, dificuldade: st.dificuldade, diario: st.diario }),
    refresh: () => { diario.refresh(); atualizar(); }
  };
  return ctl;
}

/* ---------- Fim de partida: XP + botão único de compartilhar ---------- */
async function compartilhar(jogoId, texto, btn) {
  const jogo = JOGOS.find(j => j.id === jogoId) || JOGOS[0];
  const url = SITE + jogo.url + "?utm_source=compartilhar";
  if (typeof gtag === "function") gtag("event", "share", { method: navigator.share ? "nativo" : "copiar", content_type: "game_result", item_id: jogoId });
  if (navigator.share) {
    try { await navigator.share({ title: "O Enforcado", text: texto, url }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  try {
    await navigator.clipboard.writeText(texto + "\n" + url);
    if (btn) { const o = btn.textContent; btn.textContent = "✅ Copiado!"; setTimeout(() => { btn.textContent = o; }, 2000); }
  } catch (e) { window.prompt("Copie o texto abaixo:", texto + "\n" + url); }
}

function anexarFim(container, { jogo, texto, info }) {
  container.querySelectorAll(".pm-extra").forEach(e => e.remove());
  const div = document.createElement("div");
  div.className = "pm-extra";
  let msg = "";
  if (info) {
    if (info.repetido) msg = "Desafio de hoje já concluído antes: sem XP desta vez.";
    else {
      msg = `+${info.ganho} XP` + (info.bonus ? ` (inclui +${info.bonus} do desafio do dia)` : "") + ` · Total: ${info.total} XP`;
      if (info.bonus && info.streak > 0) msg += ` · 🔥 ${info.streak} ${info.streak === 1 ? "dia" : "dias"} seguidos`;
    }
    if (!auth.currentUser) msg += `<br><button type="button" class="link" data-pm="login">Entre com o Google</button> para salvar seu XP e aparecer no ranking.`;
  }
  div.innerHTML = (msg ? `<p class="pm-xp">${msg}</p>` : "") + `<button type="button" class="pm-share">📤 Compartilhar</button>`;
  div.querySelector(".pm-share").addEventListener("click", e => compartilhar(jogo, texto, e.currentTarget));
  container.appendChild(div);
  if (info && !info.repetido && info.ganho > 0) toast(`+${info.ganho} XP`);
}

/* ---------- Cabeçalho (igual em todos os jogos) ---------- */
function montarHeader() {
  const h = document.querySelector(".site-header");
  if (!h) return;
  const atual = location.pathname.replace(/\/$/, "");
  const links = JOGOS.map(j => {
    const ativo = atual === j.url || atual === j.url.replace(".html", "") || document.body.dataset.jogo === j.id;
    return `<a href="${j.url}"${ativo ? ' aria-current="page"' : ""}>${esc(j.nome)}</a>`;
  }).join("");
  h.innerHTML =
    `<a class="brand" href="/" aria-label="O Enforcado - página inicial"><img src="img/hung.png" alt="" width="42" height="42"><span>O Enforcado</span></a>` +
    `<nav aria-label="Navegação principal">${links}</nav><div class="header-actions" id="pm-acoes"></div>`;
  renderAcoes();
}

function renderAcoes() {
  const el = $("pm-acoes");
  if (!el) return;
  const u = auth.currentUser;
  let html = `<button type="button" class="pm-icon" data-pm="ranking" aria-label="Ranking global" title="Ranking global">🏆</button>`;
  if (!authPronto) { el.innerHTML = html; return; }
  if (u) {
    const foto = u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc((nomeConta(u)[0] || "J").toUpperCase());
    const d = ler();
    html += `<button type="button" class="pm-avatar" data-pm="menu" aria-label="Minha conta" aria-haspopup="true">${foto}</button>` +
      `<div class="pm-menu" id="pm-menu" hidden><strong>${esc(u.displayName || "Jogador")}</strong>` +
      `<span>⭐ ${d.xp} XP no total</span><span>🔥 Sequência: ${d.streak.atual} ${d.streak.atual === 1 ? "dia" : "dias"}</span>` +
      `<button type="button" data-pm="ranking">🏆 Ver ranking</button>` +
      (notifOk ? `<button type="button" data-pm="notificacoes">${notifAtivas() ? "🔕 Desativar avisos" : "🔔 Avisar do desafio do dia"}</button>` : "") +
      `<button type="button" data-pm="sair">Sair da conta</button></div>`;
  } else {
    html += `<button type="button" class="pm-login" data-pm="login"><span class="g">G</span> Entrar</button>`;
  }
  el.innerHTML = html;
}
function fecharMenu() { const m = $("pm-menu"); if (m) m.hidden = true; }

/* ---------- Ranking ---------- */
function fecharRanking() { const o = $("pm-ranking"); if (o) o.remove(); }

function abrirRanking() {
  fecharMenu(); fecharRanking();
  const o = document.createElement("div");
  o.id = "pm-ranking"; o.className = "pm-overlay";
  o.innerHTML = `<div class="pm-modal" role="dialog" aria-modal="true" aria-label="Ranking global"><button type="button" class="pm-fechar" aria-label="Fechar">✕</button>` +
    `<h2>🏆 Ranking global</h2><div id="pm-top"><p class="pm-vazio">Carregando...</p></div><div id="pm-eu"></div><div id="pm-conta"></div></div>`;
  document.body.appendChild(o);
  o.addEventListener("click", e => { if (e.target === o || e.target.closest(".pm-fechar")) fecharRanking(); });

  const u = auth.currentUser;
  $("pm-conta").innerHTML = u ? "" :
    `<div class="pm-cta"><p>Entre com o Google para salvar seu XP e aparecer no ranking.</p><button type="button" class="pm-login" data-pm="login"><span class="g">G</span> Continuar com Google</button></div>`;

  db.ref("ranking").orderByChild("xp").limitToLast(10).once("value").then(snap => {
    const lista = [];
    snap.forEach(c => { lista.push({ id: c.key, ...c.val() }); });
    lista.sort((a, b) => (b.xp || 0) - (a.xp || 0));
    $("pm-top").innerHTML = lista.length ? lista.map((p, i) =>
      `<div class="pm-linha${u && p.id === u.uid ? " eu" : ""}"><span>${i + 1}º</span><img src="${esc(p.avatar)}" alt=""><span>${esc(p.nome)}</span><b>${Number(p.xp) || 0}</b></div>`).join("")
      : `<p class="pm-vazio">Ninguém no ranking ainda. Seja o primeiro!</p>`;
  }).catch(() => { $("pm-top").innerHTML = `<p class="pm-vazio">Não foi possível carregar o ranking agora.</p>`; });

  if (u) {
    db.ref("ranking/" + u.uid).once("value").then(s => {
      const eu = s.val(); if (!eu) return;
      return db.ref("ranking").orderByChild("xp").startAt((eu.xp || 0) + 1).limitToFirst(101).once("value").then(acima => {
        const n = acima.numChildren();
        $("pm-eu").innerHTML = `<p class="pm-sub">SUA POSIÇÃO</p><div class="pm-linha eu"><span>${n > 100 ? "100+" : n + 1}º</span><img src="${esc(eu.avatar)}" alt=""><span>${esc(eu.nome)}</span><b>${Number(eu.xp) || 0}</b></div>`;
      });
    }).catch(() => {});
  }
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(texto, ms = 3500) {
  let t = $("pm-toast");
  if (!t) { t = document.createElement("div"); t.id = "pm-toast"; t.className = "pm-toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = texto; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

/* ---------- Eventos globais ---------- */
document.addEventListener("click", e => {
  const a = e.target.closest("[data-pm]");
  if (a) {
    const acao = a.dataset.pm;
    if (acao === "login") entrar();
    else if (acao === "ranking") abrirRanking();
    else if (acao === "sair") sair();
    else if (acao === "notificacoes") alternarNotificacoes();
    else if (acao === "menu") { const m = $("pm-menu"); if (m) m.hidden = !m.hidden; }
    return;
  }
  if (!e.target.closest(".pm-menu")) fecharMenu();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") { fecharRanking(); fecharMenu(); } });

auth.onAuthStateChanged(async u => {
  if (u) { try { await sincronizarConta(u); } catch (e) { console.error("Erro ao sincronizar conta:", e); } }
  authPronto = true;
  if (u && notifAtivas()) registrarToken(u, false).catch(() => {});
  renderAcoes();
  if ($("pm-ranking")) abrirRanking();
});

/* ---------- Aviso de cookies e service worker ---------- */
function iniciarCookies() {
  const b = $("cookie-banner"), ok = $("aceitar-cookies");
  if (!b || !ok) return;
  b.hidden = !!localStorage.getItem("cookiesAceitos");
  ok.addEventListener("click", () => { localStorage.setItem("cookiesAceitos", "true"); b.hidden = true; });
}
function iniciar() { montarHeader(); iniciarCookies(); iniciarNotificacoes(); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));

window.Portal = { toolbar, criarBotaoDiario, concluir, anexarFim, compartilhar, rngDiario, diarioConcluido, hoje, toast, abrirRanking };
})();
