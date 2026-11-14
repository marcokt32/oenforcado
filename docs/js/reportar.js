/* ============================================================
   reportar.js  v1.0.1  (14/11/2026)
   - v1.0.1: atalho "Reportar um problema" no menu lateral do celular; foco volta ao botão do menu
   "Reportar um problema": bugs, erros e sugestões dos jogadores.
   - Grava em Firebase Realtime Database, nó "reportes" (plano gratuito).
   - Carregado em segundo plano pelo portal.js (não pesa no INP).
   - Cria o link "Reportar um problema" no rodapé (coluna Institucional).
   - Anexa dados técnicos (página, navegador, tela, versões dos scripts,
     últimos erros de JavaScript). O jogador vê tudo antes de enviar.
   Uso manual: Reportar.abrir();
   ============================================================ */
(() => {
  "use strict";
  if (window.Reportar) return;

  const MIN_TEXTO = 10, MAX_TEXTO = 1000, MAX_CTX = 2800;
  const ESPERA_MS = 60000;   // intervalo mínimo entre dois relatos
  const MAX_DIA = 5;         // relatos por dia, por aparelho
  const CHAVE = "rep_hist";
  const TIPOS = [
    { id: "bug", nome: "🐞 Bug ou erro" },
    { id: "sugestao", nome: "💡 Sugestão" },
    { id: "outro", nome: "💬 Outro assunto" }
  ];
  const $ = id => document.getElementById(id);

  /* ---------- Últimos erros de JavaScript (ficam só na memória) ---------- */
  const erros = [];
  function guardarErro(msg, origem) {
    erros.push({ m: String(msg || "").slice(0, 160), o: String(origem || "").slice(0, 80), t: new Date().toISOString().slice(11, 19) });
    if (erros.length > 5) erros.shift();
  }
  window.addEventListener("error", e => {
    guardarErro(e.message, ((e.filename || "").split("/").pop().split("?")[0]) + ":" + (e.lineno || 0));
  });
  window.addEventListener("unhandledrejection", e => {
    const r = e.reason;
    guardarErro("Promise: " + (r && r.message ? r.message : r), "");
  });

  /* ---------- Limite de envios (contra cliques repetidos e spam simples) ---------- */
  function historico() {
    try { return (JSON.parse(localStorage.getItem(CHAVE)) || []).filter(t => Date.now() - t < 864e5); } catch (e) { return []; }
  }
  function registrarEnvio() {
    const h = historico(); h.push(Date.now());
    try { localStorage.setItem(CHAVE, JSON.stringify(h)); } catch (e) { /* armazenamento bloqueado */ }
  }
  function bloqueio() {
    const h = historico();
    if (h.length && Date.now() - h[h.length - 1] < ESPERA_MS) return "Aguarde um minuto antes de enviar outro relato.";
    if (h.length >= MAX_DIA) return "Você já enviou vários relatos hoje. Obrigado! Tente de novo amanhã.";
    return "";
  }

  /* ---------- Dados técnicos anexados ---------- */
  const jogoAtual = () => (document.body && document.body.dataset.jogo) || location.pathname.replace(/^\/|\.html$/g, "") || "inicio";

  function versoes() { // útil para descobrir quem está com arquivo antigo em cache
    const v = {};
    document.querySelectorAll("script[src]").forEach(s => {
      try {
        const u = new URL(s.src, location.href);
        if (u.origin !== location.origin) return;
        v[u.pathname.split("/").pop().replace(/\.js$/, "")] = u.searchParams.get("v") || "-";
      } catch (e) { /* ignora */ }
    });
    return v;
  }

  function contexto() {
    return {
      url: location.pathname + location.search,
      ua: navigator.userAgent,
      tela: innerWidth + "x" + innerHeight + "@" + (window.devicePixelRatio || 1),
      idioma: navigator.language,
      online: navigator.onLine,
      tema: document.documentElement.dataset.tema || "",
      som: window.Sons ? (Sons.mudo() ? "off" : "on") : "n/a",
      sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
      v: versoes(),
      erros: erros.slice()
    };
  }

  function contextoTexto() { // cabe no limite de 3000 caracteres das regras do banco
    const c = contexto();
    let s = JSON.stringify(c);
    while (s.length > MAX_CTX && c.erros.length) { c.erros.shift(); s = JSON.stringify(c); }
    if (s.length > MAX_CTX) { c.ua = c.ua.slice(0, 120); delete c.v; s = JSON.stringify(c).slice(0, MAX_CTX); }
    return s;
  }

  /* ---------- Interface ---------- */
  const CSS =
    ".rep-modal{width:min(100%,460px)}" +
    ".rep-modal textarea,.rep-modal select{width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0a2540;font:inherit;font-size:1rem;box-shadow:inset 0 2px 4px rgba(10,37,64,.10),0 1px 0 #fff}" +
    ".rep-modal select{min-height:44px;padding:0 12px}" +
    ".rep-modal textarea{min-height:110px;resize:vertical;line-height:1.5}" +
    ".rep-modal textarea:focus,.rep-modal select:focus{outline:3px solid #1f6feb2a;border-color:#1f6feb}" +
    ".rep-cont{justify-self:end;color:#526176;font-size:.78rem;font-weight:600}" +
    ".rep-nota{margin:0 0 12px;color:#526176;font-size:.82rem;line-height:1.45}" +
    ".rep-det{margin:0 0 12px;color:#526176;font-size:.85rem}" +
    ".rep-det summary{cursor:pointer;font-weight:700}" +
    ".rep-det pre{max-height:140px;overflow:auto;margin:8px 0 0;padding:10px;border-radius:10px;background:#f6f8fc;font-size:.72rem;white-space:pre-wrap;word-break:break-all}" +
    ".rep-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}" +
    ".rep-ok{display:grid;gap:12px;justify-items:center;padding:10px 0 4px;text-align:center}" +
    ".rep-ok h2{margin:0}.rep-ok p{margin:0;color:#526176;line-height:1.55}.rep-ok .pm-perfil-salvar{min-width:140px;min-height:44px;border-radius:10px;font:inherit;font-weight:750;cursor:pointer}";

  let overlay = null, ref = null, ultimoFoco = null;

  function injetarEstilo() {
    if ($("rep-style")) return;
    const s = document.createElement("style");
    s.id = "rep-style"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function aviso(texto) {
    const a = $("rep-aviso");
    if (!a) return;
    a.textContent = texto; a.hidden = !texto;
  }

  function teclas(e) {
    if (!overlay) return;
    if (e.key === "Escape") { fechar(); return; }
    if (e.key === "Tab") { // mantém o foco dentro do formulário
      const f = Array.from(overlay.querySelectorAll("button, input, select, textarea, summary")).filter(x => !x.disabled && x.offsetParent !== null && x.tabIndex >= 0);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }

  function fechar() {
    if (!overlay) return;
    overlay.remove(); overlay = null; ref = null;
    document.removeEventListener("keydown", teclas);
    if (ultimoFoco && ultimoFoco.focus) { try { ultimoFoco.focus(); } catch (e) { /* elemento removido */ } }
  }

  function abrir(origem) {
    fechar();
    injetarEstilo();
    ultimoFoco = origem || document.activeElement;
    // o menu lateral fecha ao tocar no link: devolve o foco ao botão do menu
    if (ultimoFoco && ultimoFoco.closest && ultimoFoco.closest("#pm-drawer")) ultimoFoco = $("pm-burger");
    const opcoes = TIPOS.map(t => `<option value="${t.id}">${t.nome}</option>`).join("");
    overlay = document.createElement("div");
    overlay.id = "pm-reportar"; overlay.className = "pm-overlay";
    overlay.innerHTML =
      `<div class="pm-modal rep-modal" role="dialog" aria-modal="true" aria-labelledby="rep-t">` +
      `<button type="button" class="pm-fechar" aria-label="Fechar">✕</button>` +
      `<h2 id="rep-t">🐞 Reportar um problema</h2>` +
      `<form id="rep-form" novalidate>` +
      `<label class="pm-perfil-campo">O que você quer relatar?<select id="rep-tipo">${opcoes}</select></label>` +
      `<label class="pm-perfil-campo">Descreva o que aconteceu<textarea id="rep-texto" rows="5" maxlength="${MAX_TEXTO}" data-clarity-mask="True" placeholder="Ex.: no Termo, ao apertar Enter com a palavra completa, nada acontece."></textarea><span class="rep-cont" id="rep-cont">0 / ${MAX_TEXTO}</span></label>` +
      `<label class="pm-perfil-campo">E-mail para resposta (opcional)<input id="rep-email" type="email" maxlength="120" autocomplete="email" data-clarity-mask="True"></label>` +
      `<div class="rep-hp" aria-hidden="true"><label>Não preencha<input id="rep-site" tabindex="-1" autocomplete="off"></label></div>` +
      `<p class="rep-nota">Não escreva senhas nem dados pessoais sensíveis. Junto com o relato enviamos informações técnicas (página, navegador, tela e erros recentes) para ajudar a achar o problema.</p>` +
      `<details class="rep-det"><summary>Ver o que será enviado junto</summary><pre id="rep-ctx"></pre></details>` +
      `<p class="pm-perfil-aviso" id="rep-aviso" role="alert" hidden></p>` +
      `<div class="pm-perfil-acoes"><button type="button" class="pm-perfil-cancelar" data-rep="cancelar">Cancelar</button><button type="submit" class="pm-perfil-salvar" id="rep-enviar">Enviar</button></div>` +
      `</form></div>`;
    document.body.appendChild(overlay);
    $("rep-ctx").textContent = JSON.stringify(contexto(), null, 1);

    const texto = $("rep-texto");
    texto.addEventListener("input", () => { $("rep-cont").textContent = texto.value.length + " / " + MAX_TEXTO; });
    overlay.addEventListener("click", e => {
      if (e.target === overlay) { if (!texto.value.trim()) fechar(); return; } // não perde um texto longo por um clique fora
      if (e.target.closest(".pm-fechar") || e.target.closest("[data-rep='cancelar']")) fechar();
    });
    $("rep-form").addEventListener("submit", e => { e.preventDefault(); enviar(); });
    document.addEventListener("keydown", teclas);
    texto.focus();
  }

  function agradecer() {
    const m = overlay && overlay.querySelector(".rep-modal");
    if (!m) return;
    m.innerHTML =
      `<div class="rep-ok"><div style="font-size:2.6rem;line-height:1" aria-hidden="true">🙏</div>` +
      `<h2 id="rep-t">Obrigado pelo relato!</h2>` +
      `<p>Recebemos sua mensagem e vamos analisar. Isso ajuda a melhorar o site para todo mundo.</p>` +
      `<button type="button" class="pm-perfil-salvar" data-rep="cancelar">Fechar</button></div>`;
    const b = m.querySelector("button"); if (b) b.focus();
  }

  async function enviar() {
    const tipo = $("rep-tipo").value;
    const texto = $("rep-texto").value.trim();
    const email = $("rep-email").value.trim();

    if (texto.length < MIN_TEXTO) { aviso(`Conte um pouco mais (mínimo de ${MIN_TEXTO} letras) para conseguirmos entender.`); $("rep-texto").focus(); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { aviso("Esse e-mail não parece válido. Corrija ou deixe em branco."); $("rep-email").focus(); return; }
    if ($("rep-site").value) { agradecer(); return; } // campo-isca preenchido: é robô, finge que enviou
    const b = bloqueio();
    if (b) { aviso(b); return; }
    if (!window.firebase || !firebase.database) { aviso("O envio ainda está carregando. Tente de novo em instantes."); return; }

    aviso("");
    const btn = $("rep-enviar");
    btn.disabled = true; btn.textContent = "Enviando…";
    try {
      // a mesma chave é reaproveitada se a pessoa tentar de novo (evita duplicar o relato)
      ref = ref || firebase.database().ref("reportes").push();
      const dados = { tipo, texto, jogo: jogoAtual(), ctx: contextoTexto(), ts: firebase.database.ServerValue.TIMESTAMP };
      if (email) dados.email = email;
      const u = firebase.auth && firebase.auth().currentUser;
      if (u) dados.uid = u.uid;
      await Promise.race([ref.set(dados), new Promise((_, rej) => setTimeout(() => rej(new Error("tempo esgotado")), 8000))]);
      registrarEnvio();
      if (typeof gtag === "function") gtag("event", "report_submit", { tipo, jogo: dados.jogo });
      if (typeof clarity === "function") { clarity("set", "reporte", tipo); clarity("event", "reportou_problema"); } // facilita achar a gravação da sessão
      agradecer();
    } catch (e) {
      console.error("Erro ao enviar o relato:", e);
      btn.disabled = false; btn.textContent = "Tentar de novo";
      aviso("Não foi possível enviar agora (" + (e && (e.code || e.message) || "erro") + "). Verifique sua conexão e tente de novo.");
    }
  }

  /* ---------- Link no rodapé ---------- */
  function injetarLink() {
    const nav = document.querySelector('nav[aria-label="Institucional"]');
    if (!nav || nav.querySelector("[data-rep-abrir]")) return;
    const a = document.createElement("a");
    a.href = "#"; a.setAttribute("role", "button"); a.setAttribute("data-rep-abrir", ""); a.textContent = "Reportar um problema";
    nav.appendChild(a);
  }
  document.addEventListener("click", e => {
    const alvo = e.target.closest ? e.target.closest("[data-rep-abrir]") : null;
    if (alvo) { e.preventDefault(); abrir(alvo); }
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injetarLink); else injetarLink();

  /* ---------- Atalho no menu lateral (celular) ---------- */
  // O menu.js recria o conteúdo do menu a cada abertura, então o link é acrescentado logo depois do toque no botão do menu.
  function injetarNoMenu() {
    const corpo = document.querySelector("#pm-drawer .pm-drawer-body");
    if (!corpo || corpo.querySelector("[data-rep-abrir]")) return;
    const a = document.createElement("a");
    a.href = "#"; a.className = "pm-drawer-link"; a.setAttribute("data-rep-abrir", ""); a.textContent = "🐞 Reportar um problema";
    corpo.appendChild(a);
  }
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest("#pm-burger")) setTimeout(injetarNoMenu, 0); });
  injetarNoMenu();

  window.Reportar = { abrir };
})();
