// Núcleo compartilhado dos jogos: cabeçalho, login (Google), XP único, desafio do dia,
// filtros (categoria/dificuldade), ranking e compartilhamento.
// Atualizado em 15/11/2026 (v1.0.24)
//  - v1.0.24: banner da loja parceira (Closet Real) acima do rodapé, em todas as páginas (função montarBanner)
//  - v1.0.22: bloco "Também no celular" com os apps Android (js/apps-android.js, carregado aqui)
//  - v1.0.21: link "Notícias" no cabeçalho; imagens do cabeçalho/avatares com caminho absoluto (funcionam em /noticias/)
//  - v1.0.20: limite de dicas no Kyudoku (2/3/4 por dificuldade)
//  - v1.0.19: limite de dicas no Damas (3 por partida)
//  - v1.0.18: limite de dicas por dificuldade (MAX_DICAS aceita número ou {facil,medio,dificil}); Lógica grega: 2/3/4
//  - v1.0.17: carrega reportar.js v1.0.1 (atalho no menu do celular)
//  - v1.0.16: formulário "Reportar um problema" (js/reportar.js), carregado em segundo plano depois da página
//  - v1.0.15: efeitos sonoros (js/sons.js, carregado aqui); fanfarra de vitória/derrota em anexarFim; Portal.anexarFim aceita som:false
//  - v1.0.14: Campo minado adicionado ao menu
//  - v1.0.14: Damas adicionado ao menu (sem desafio do dia: fica fora das sugestões de desafio)
//  - v1.0.14: desempenho (INP): firebase-messaging carregado sob demanda; analytics/Firebase adiados após a jogada; espaço reservado para login (CLS)
//  - v1.0.11: limite de dicas por partida (MAX_DICAS / Portal.maxDicas)
//  - v1.0.12: desafio do dia concluído não pode ser jogado de novo; pop-up com "modo livre" ou "próximo desafio"
//  - v1.0.13: corrige ReferenceError na toolbar (diario usado antes de ser criado); remove código morto (diariosAtivos)
(() => {
  "use strict";

  // "cat" liga cada jogo a uma categoria do menu (mantenha igual a CATEGORIAS em js/menu.js, usado no celular)
  const JOGOS = [
    { id: "forca", nome: "Jogo da forca", url: "/forca.html", cat: "palavras" },
    { id: "anagrama", nome: "Anagrama", url: "/anagrama.html", cat: "palavras" },
    { id: "termo", nome: "Termo", url: "/termo.html", cat: "palavras" },
    { id: "caca", nome: "Caça-palavras", url: "/caca-palavras.html", cat: "palavras" },
    { id: "kyudoku", nome: "Kyudoku", url: "/kyudoku.html", cat: "logica" },
    { id: "logicagrega", nome: "Lógica grega", url: "/logica-grega.html", cat: "logica" },
    { id: "damas", nome: "Damas", url: "/damas.html", cat: "logica", diario: false }, // diario:false = não participa do desafio do dia
    { id: "campominado", nome: "Campo minado", url: "/campo-minado.html", cat: "logica" },
    { id: "memoria", nome: "Jogo da memória", url: "/memoria.html", cat: "puzzle" },
    { id: "deslizante", nome: "Quebra-cabeça deslizante", url: "/deslizante.html", cat: "puzzle" }
  ];
  const JOGOS_DIARIO = JOGOS.filter(j => j.diario !== false); // jogos que têm desafio do dia
  const CATEGORIAS = [
    { id: "palavras", nome: "Palavras", icone: "🔤" },
    { id: "logica", nome: "Lógica", icone: "🧩" },
    { id: "puzzle", nome: "Puzzle", icone: "🃏" }
  ];
  const KEY = "portal_v2";
  const BONUS_DIARIO = 50;
  // Atualizado em 07/11/2026 (v1.0.11): limite de dicas por partida, um valor por jogo.
  // Jogo que não está na tabela não tem dicas. A forca já limita a 1 dica por palavra no próprio jogo.
  // O valor pode ser um número (igual para todos os níveis) ou { facil, medio, dificil }.
  const MAX_DICAS = { caca: 3, forca: 1, damas: 3, logicagrega: { facil: 2, medio: 3, dificil: 4 }, kyudoku: { facil: 2, medio: 3, dificil: 4 } };
  const SITE = "https://oenforcado.com";

  const $ = id => document.getElementById(id);
  // v1.0.14: roda depois que o navegador pintou a resposta da jogada (melhora o INP)
  const adiar = fn => setTimeout(fn, 0);
  // v1.0.14: o firebase-messaging (só usado nos avisos) é baixado sob demanda. Se o HTML ainda o carrega, usa o que já existe.
  let msgPromessa = null;
  function carregarMessaging() {
    if (window.firebase && firebase.messaging) return Promise.resolve(firebase.messaging);
    if (!msgPromessa) msgPromessa = new Promise((ok, erro) => {
      const s = document.createElement("script");
      s.src = "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js";
      s.onload = () => ok(firebase.messaging);
      s.onerror = () => { msgPromessa = null; erro(new Error("messaging indisponível")); };
      document.head.appendChild(s);
    });
    return msgPromessa;
  }
  const mensagens = async () => { await carregarMessaging(); return firebase.messaging(); };
  // v1.0.15: efeitos sonoros. O sons.js é carregado aqui para valer em todas as páginas sem mexer nos HTMLs.
  if (!window.Sons) { const sc = document.createElement("script"); sc.src = "/js/sons.js?v=1.0.0"; sc.async = true; document.head.appendChild(sc); }
  // v1.0.22: bloco "Também no celular" (js/apps-android.js). Para trocar os apps, edite a lista APPS naquele arquivo.
  if (!window.AppsAndroid) { const ap = document.createElement("script"); ap.src = "/js/apps-android.js?v=1.0.1"; ap.async = true; document.head.appendChild(ap); }
  // v1.0.16: "Reportar um problema" (js/reportar.js). Só é baixado depois que a página terminou de carregar, para não pesar no INP.
  const carregarReportar = () => { if (window.Reportar) return; const sc = document.createElement("script"); sc.src = "/js/reportar.js?v=1.0.1"; sc.async = true; document.head.appendChild(sc); };
  const agendarReportar = () => { if (window.requestIdleCallback) requestIdleCallback(carregarReportar, { timeout: 4000 }); else setTimeout(carregarReportar, 2000); };
  if (document.readyState === "complete") agendarReportar(); else window.addEventListener("load", agendarReportar);
  // v1.0.21: avatar guardado como "img/..." (relativo) precisa de "/" para funcionar em subpastas como /noticias/
  const srcImg = s => /^(https?:|\/)/.test(s || "") ? s : "/" + (s || "");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Estado local (vale sem login) ---------- */
  function base() { return { xp: 0, jogos: {}, diarios: {}, streak: { atual: 0, melhor: 0, ultimo: null }, prefs: {} }; }
  function ler() {
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && typeof d === "object") return Object.assign(base(), d); } catch (e) { }
    const novo = base();
    try { // aproveita o XP antigo da forca
      const l = JSON.parse(localStorage.getItem("pontuacoesJogoForca"));
      if (l && l.ranking && l.ranking.xp > 0) novo.xp = Math.floor(l.ranking.xp);
    } catch (e) { }
    return novo;
  }
  function salvar(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { } }

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

  // Perfil público (nome e avatar do ranking): vale o que a pessoa escolheu; sem escolha, o padrão (1º nome do Google + avatar do site)
  function perfilAtual(u) {
    const p = ler().perfil;
    return { nome: (p && p.nome) || nomeConta(u), avatar: (p && p.avatar) || avatarConta(u) };
  }

  async function entrar() {
    const provedor = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provedor);
      if (typeof gtag === "function") gtag("event", "login", { method: "google" });
      if (typeof clarity === "function") clarity("event", "login_google");
    } catch (e) {
      if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") return;
      if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
        try { await auth.signInWithRedirect(provedor); return; } catch (_) { }
        toast("Não foi possível abrir o login neste navegador. Tente no Chrome ou no Safari.");
        return;
      }
      console.error("Erro no login:", e.code, e);
      toast("Não foi possível entrar (" + (e.code || "erro") + ").");
    }
  }

  async function sair() {
    const u = auth.currentUser;
    // Ao sair, este aparelho deixa de receber os avisos da conta (o token é removido antes do signOut, que exige login)
    if (u && localStorage.getItem(FLAG_NOTIF) === "1" && "Notification" in window && Notification.permission === "granted") {
      try {
        const m = await mensagens();
        const token = await m.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: await navigator.serviceWorker.ready });
        if (token) await db.ref("tokens/" + u.uid + "/" + token).remove();
        await m.deleteToken();
      } catch (e) { console.error("Erro ao remover o token ao sair:", e); }
    }
    localStorage.removeItem(FLAG_NOTIF);
    await auth.signOut();
    const d = ler(); d.xp = 0; d.jogos = {}; d.perfil = null; salvar(d); // o XP e o perfil ficam guardados na conta
    fecharMenu(); renderAcoes();
    toast("Você saiu da conta.");
  }

  async function sincronizarConta(u) {
    const ref = db.ref("ranking/" + u.uid);
    const remoto = (await ref.once("value")).val();
    const d = ler();
    const xp = Math.max(d.xp, (remoto && remoto.xp) || 0);
    d.xp = xp;
    // o perfil salvo na conta tem prioridade sobre o padrão do Google
    d.perfil = remoto && remoto.nome && remoto.avatar ? { nome: remoto.nome, avatar: remoto.avatar } : null;
    salvar(d);
    const perfil = perfilAtual(u);
    const dados = { nome: perfil.nome, avatar: perfil.avatar, xp, atualizado: firebase.database.ServerValue.TIMESTAMP };
    if (!remoto || remoto.xp !== xp || remoto.nome !== dados.nome || remoto.avatar !== dados.avatar) await ref.update(dados);
  }

  function enviarXP(xp) {
    const u = auth.currentUser;
    if (!u) return;
    const perfil = perfilAtual(u);
    db.ref("ranking/" + u.uid).update({ nome: perfil.nome, avatar: perfil.avatar, xp, atualizado: firebase.database.ServerValue.TIMESTAMP }).catch(() => { });
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
    const token = await (await mensagens()).getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: registro });
    if (!token || /[.$#\[\]\/]/.test(token)) return false;
    // Um token por aparelho: tokens/{uid}/{token}, para que vários aparelhos da mesma conta recebam os avisos
    await db.ref("tokens/" + u.uid + "/" + token).set(Date.now());
    localStorage.setItem(FLAG_NOTIF, "1");
    return true;
  }

  async function alternarNotificacoes() {
    const u = auth.currentUser;
    if (!u) { toast("Entre com o Google para ativar os avisos."); return; }
    try {
      if (notifAtivas()) {
        let token = null;
        try { token = await (await mensagens()).getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: await navigator.serviceWorker.ready }); } catch (e) { }
        try { await (await mensagens()).deleteToken(); } catch (e) { }
        if (token) await db.ref("tokens/" + u.uid + "/" + token).remove(); // só este aparelho
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
      // v1.0.14: sem baixar o messaging agora. Só checa o suporte básico para mostrar o botão de avisos no menu.
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
      notifOk = true;
      renderAcoes();
      // Quem já ativou os avisos recebe as mensagens com o site aberto: carrega o messaging quando o navegador estiver ocioso
      if (notifAtivas()) {
        const ligar = () => carregarMessaging().then(() => firebase.messaging.isSupported()).then(ok => {
          if (!ok) return;
          firebase.messaging().onMessage(m => { const n = (m && m.notification) || {}; toast((n.title ? n.title + ": " : "") + (n.body || "")); });
        }).catch(() => { });
        if (window.requestIdleCallback) requestIdleCallback(ligar, { timeout: 4000 }); else setTimeout(ligar, 3000);
      }
    } catch (e) { }
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
    // v1.0.14: rede e medições saem da tarefa da última jogada, para a tela responder primeiro
    const xpTotal = d.xp;
    adiar(() => {
      enviarXP(xpTotal);
      if (typeof gtag === "function") gtag("event", "level_end", { level_name: jogo, success: true, daily: !!diario });
      if (typeof clarity === "function") {
        clarity("set", "jogo", jogo);
        clarity("set", "modo", diario ? "diario" : "livre");
        clarity("event", "partida_concluida");
      }
    });
    return { ganho, bonus, repetido, total: d.xp, streak: d.streak.atual };
  }

  /* ---------- Desafio do dia: atalhos e navegação entre jogos ---------- */
  function jogoAtualId() {
    if (document.body.dataset.jogo) return document.body.dataset.jogo;
    const path = location.pathname.replace(/\.html$/, "");
    const j = JOGOS.find(x => x.url.replace(".html", "") === path);
    return j ? j.id : null;
  }
  // A primeira visão de uma página de jogo é o desafio do dia. Exceções: o desafio de hoje já foi feito neste jogo,
  // a pessoa escolheu "Voltar ao jogo livre" nesta sessão, ou é uma página de categoria/tema (que mantém o foco dela).
  // ?desafio=dia força o desafio em qualquer página, exceto se já foi concluído hoje.
  // Atualizado em 07/11/2026 (v1.0.12)
  function modoDiarioInicial(jogo) {
    // Desafio já concluído hoje: nunca abre em modo diário, nem com ?desafio=dia (nesse caso mostra o aviso)
    if (diarioConcluido(jogo)) {
      try { if (new URLSearchParams(location.search).get("desafio") === "dia") setTimeout(() => abrirDiarioConcluido(jogo), 400); } catch (e) { }
      return false;
    }
    try { if (new URLSearchParams(location.search).get("desafio") === "dia") return true; } catch (e) { }
    if (document.body.dataset.categoria || document.body.dataset.tema) return false;
    try { if (sessionStorage.getItem("portal_livre_" + jogo) === "1") return false; } catch (e) { }
    return true;
  }
  function irParaDiario() {
    const atual = jogoAtualId();
    const alvo = (atual && !diarioConcluido(atual)) ? JOGOS_DIARIO.find(j => j.id === atual)
      : JOGOS_DIARIO.find(j => j.id !== atual && !diarioConcluido(j.id));
    if (!alvo) { toast("Você já concluiu todos os desafios de hoje! 🎉"); return; }
    try { sessionStorage.removeItem("portal_livre_" + alvo.id); } catch (e) { }
    if (alvo.id === atual) {
      const b = document.querySelector(".pm-diario");
      if (b && !b.classList.contains("ativo")) b.click();
      if (b) b.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      location.href = alvo.url + "?desafio=dia";
    }
  }

  /* ---------- Desafio do dia: botão, bloqueio após concluir e aviso (v1.0.12, 07/11/2026) ---------- */
  const controlesDiario = {}; // id do jogo -> controle do botão do desafio do dia

  function criarBotaoDiario(jogo, onToggle) {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "button pm-diario";
    const ctl = {
      el: btn, ativo: modoDiarioInicial(jogo), aoSincronizar: null, refresh() {
        const feito = diarioConcluido(jogo);
        btn.classList.toggle("ativo", ctl.ativo);
        btn.textContent = ctl.ativo ? "↩ Voltar ao jogo livre" : "📅 Desafio do dia" + (feito ? " ✅" : "");
      },
      // Sai do modo diário sem reiniciar o jogo (chamado ao concluir o desafio)
      encerrar() {
        ctl.ativo = false;
        try { sessionStorage.setItem("portal_livre_" + jogo, "1"); } catch (e) { }
        ctl.refresh();
        if (ctl.aoSincronizar) ctl.aoSincronizar(false);
      }
    };
    controlesDiario[jogo] = ctl;
    btn.addEventListener("click", () => {
      // Desafio de hoje já concluído: não deixa jogar de novo, mostra o aviso
      if (!ctl.ativo && diarioConcluido(jogo)) { abrirDiarioConcluido(jogo); return; }
      ctl.ativo = !ctl.ativo; ctl.refresh();
      try { sessionStorage.setItem("portal_livre_" + jogo, ctl.ativo ? "0" : "1"); } catch (e) { }
      onToggle(ctl.ativo);
    });
    ctl.refresh();
    return ctl;
  }

  function fecharAvisoDiario() { const o = $("pm-diario-ok"); if (o) o.remove(); }

  // Aviso: desafio de hoje já concluído. Opções: próximo desafio do dia ou modo livre.
  function abrirDiarioConcluido(jogo) {
    fecharAvisoDiario();
    const prox = JOGOS_DIARIO.find(j => j.id !== jogo && !diarioConcluido(j.id));
    const o = document.createElement("div");
    o.id = "pm-diario-ok"; o.className = "pm-overlay";
    o.innerHTML = `<div class="pm-modal pm-win" role="dialog" aria-modal="true" aria-labelledby="pm-dok-t">` +
      `<button type="button" class="pm-fechar" aria-label="Fechar">✕</button>` +
      `<div class="pm-win-emoji" aria-hidden="true">✅</div><h2 id="pm-dok-t">Desafio de hoje concluído</h2>` +
      `<p class="pm-win-detalhe">O desafio do dia deste jogo só rende XP uma vez por dia. O próximo libera amanhã.</p>` +
      (prox ? `<a class="pm-next" href="${prox.url}?desafio=dia">📅 Próximo desafio do dia: ${esc(prox.nome)} →</a>`
        : `<p class="pm-xp">🎉 Você concluiu todos os desafios de hoje!</p>`) +
      `<button type="button" class="pm-win-nova" data-acao="livre">🎮 Jogar modo livre</button></div>`;
    document.body.appendChild(o);
    o.addEventListener("click", e => { if (e.target === o || e.target.closest(".pm-fechar") || e.target.closest("[data-acao='livre']")) fecharAvisoDiario(); });
    const foco = o.querySelector(".pm-next") || o.querySelector(".pm-win-nova");
    if (foco) foco.focus();
  }

  /* ---------- Filtros: categoria / dificuldade / desafio do dia ---------- */
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
    // v1.0.13: precisa vir DEPOIS de criar o "diario" (antes causava ReferenceError e quebrava a toolbar)
    diario.aoSincronizar = ativo => { st.diario = ativo; atualizar(); };
    el.insertBefore(diario.el, info);
    st.diario = diario.ativo;
    atualizar();

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
    adiar(() => {
      if (typeof clarity === "function") clarity("event", "compartilhar");
      if (typeof gtag === "function") gtag("event", "share", { method: navigator.share ? "nativo" : "copiar", content_type: "game_result", item_id: jogoId });
    });
    if (navigator.share) {
      try { await navigator.share({ title: "O Enforcado", text: texto, url }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(texto + "\n" + url);
      if (btn) { const o = btn.textContent; btn.textContent = "✅ Copiado!"; setTimeout(() => { btn.textContent = o; }, 2000); }
    } catch (e) { window.prompt("Copie o texto abaixo:", texto + "\n" + url); }
  }

  function linkDiario(jogo, acabouDiario) {
    const link = rotulo => { const j = rotulo.jogo; return `<a class="pm-next" href="${j.url}?desafio=dia">${rotulo.texto} ${esc(j.nome)} →</a>`; };
    if (acabouDiario) {
      const prox = JOGOS_DIARIO.find(j => j.id !== jogo && !diarioConcluido(j.id));
      return prox ? link({ jogo: prox, texto: "📅 Próximo desafio do dia:" }) : `<p class="pm-xp">🎉 Você concluiu todos os desafios de hoje!</p>`;
    }
    // vitória no jogo livre: incentiva o desafio que ainda falta (pode ser o do próprio jogo)
    const pend = JOGOS_DIARIO.find(j => !diarioConcluido(j.id));
    return pend ? link({ jogo: pend, texto: "📅 Desafio do dia pendente:" }) : "";
  }

  function montarLoginCTA(info) {
    const xp = info && info.total > 0 ? info.total : 0;
    return `<div class="pm-login-cta">` +
      `<p class="pm-login-cta-t">🏆 Seus ${xp} XP estão só neste aparelho</p>` +
      `<p class="pm-login-cta-d">Entre com o Google para guardar seu XP, aparecer no ranking e continuar de onde parou em qualquer dispositivo.</p>` +
      `<button type="button" class="pm-login-cta-btn" data-pm="login"><span class="g">G</span> Entrar com Google e salvar meu XP</button>` +
      `<small class="pm-login-cta-s">Grátis e sem criar senha.</small></div>`;
  }

  function fecharVitoria() { const o = $("pm-vitoria"); if (o) o.remove(); }

  // Pop-up de vitória: mostra o resultado (o mesmo do quadro verde) com compartilhar e o próximo desafio em destaque
  function abrirVitoria({ container, jogo, texto, msg, cta, proximo, diarioFeito }) {
    fecharVitoria();
    const t = container.querySelector("strong, h2, h3");
    const d = Array.from(container.querySelectorAll("span, p")).find(el => !el.closest(".pm-extra") && el.textContent.trim());
    const nova = Array.from(container.querySelectorAll("button")).find(b => !b.closest(".pm-extra"));
    const o = document.createElement("div");
    o.id = "pm-vitoria"; o.className = "pm-overlay";
    o.innerHTML = montarVitoriaHTML({ titulo: t ? t.textContent : "Parabéns!", detalhe: d ? d.textContent : "", msg, cta, proximo, nova: nova ? (diarioFeito ? "🎮 Jogar modo livre" : nova.textContent) : "" });
    document.body.appendChild(o);
    o.addEventListener("click", e => {
      if (e.target === o || e.target.closest(".pm-fechar")) fecharVitoria();
      else if (e.target.closest(".pm-win-nova")) { fecharVitoria(); if (nova) nova.click(); }
    });
    o.querySelector(".pm-share").addEventListener("click", e => compartilhar(jogo, texto, e.currentTarget));
    const foco = o.querySelector(".pm-next") || o.querySelector(".pm-share");
    if (foco) foco.focus();
  }

  function montarVitoriaHTML({ titulo, detalhe, msg, cta, proximo, nova }) {
    return `<div class="pm-modal pm-win" role="dialog" aria-modal="true" aria-labelledby="pm-win-t">` +
      `<button type="button" class="pm-fechar" aria-label="Fechar">✕</button>` +
      `<div class="pm-win-emoji" aria-hidden="true">🎉</div><h2 id="pm-win-t">${esc(titulo)}</h2>` +
      (detalhe ? `<p class="pm-win-detalhe">${esc(detalhe)}</p>` : "") +
      (msg ? `<p class="pm-xp">${msg}</p>` : "") + (cta || "") + proximo +
      `<button type="button" class="pm-share">📤 Compartilhar</button>` +
      (nova ? `<button type="button" class="pm-win-nova">${esc(nova)}</button>` : "") + `</div>`;
  }

  function anexarFim(container, { jogo, texto, info, som }) {
    // v1.0.15: fanfarra de vitória (info presente) ou de derrota. Jogos que tocam o próprio som de fim passam som:false
    if (window.Sons && som !== false) { if (info) setTimeout(() => Sons.tocar("vitoria"), 300); else Sons.tocar("derrota"); }
    if (window.Sons && info && info.bonus > 0) setTimeout(() => Sons.tocar("moeda"), 1400);
    container.querySelectorAll(".pm-extra").forEach(e => e.remove());
    const div = document.createElement("div");
    div.className = "pm-extra";
    let msg = "", proximo = "", cta = "";
    if (info) {
      if (info.repetido) msg = "Desafio de hoje já concluído antes: sem XP desta vez.";
      else {
        msg = `+${info.ganho} XP` + (info.bonus ? ` (inclui +${info.bonus} do desafio do dia)` : "") + ` · Total: ${info.total} XP`;
        if (info.bonus && info.streak > 0) msg += ` · 🔥 ${info.streak} ${info.streak === 1 ? "dia" : "dias"} seguidos`;
      }
      if (!auth.currentUser) cta = montarLoginCTA(info);
      proximo = linkDiario(jogo, info.bonus > 0 || info.repetido);
    }
    div.innerHTML = (msg ? `<p class="pm-xp">${msg}</p>` : "") + cta + proximo + `<button type="button" class="pm-share">📤 Compartilhar</button>`;
    div.querySelector(".pm-share").addEventListener("click", e => compartilhar(jogo, texto, e.currentTarget));
    container.appendChild(div);
    // vitória: pop-up logo após o último movimento (derrotas continuam só com o quadro)
    // v1.0.12: se concluiu o desafio do dia, o jogo sai do modo diário e o pop-up oferece modo livre ou próximo desafio
    const diarioFeito = !!info && (info.bonus > 0 || info.repetido);
    if (info) setTimeout(() => {
      if (diarioFeito && controlesDiario[jogo]) controlesDiario[jogo].encerrar();
      abrirVitoria({ container, jogo, texto, msg, cta, proximo, diarioFeito });
    }, 350);
  }

  /* ---------- Cabeçalho (igual em todos os jogos) ---------- */
  function montarHeader() {
    const h = document.querySelector(".site-header");
    if (!h) return;
    const atual = location.pathname.replace(/\/$/, "");
    const ehAtual = j => atual === j.url || atual === j.url.replace(".html", "") || document.body.dataset.jogo === j.id;
    const links = CATEGORIAS.map(c => {
      const jogos = JOGOS.filter(j => j.cat === c.id);
      if (!jogos.length) return "";
      return `<div class="pm-dd${jogos.some(ehAtual) ? " atual" : ""}">` +
        `<button type="button" class="pm-dd-btn" aria-expanded="false" aria-haspopup="true" aria-controls="pm-dd-${c.id}"><span>${c.icone} ${esc(c.nome)}</span><span class="pm-dd-seta" aria-hidden="true">▾</span></button>` +
        `<ul class="pm-dd-menu" id="pm-dd-${c.id}">` +
        jogos.map(j => `<li><a href="${j.url}"${ehAtual(j) ? ' aria-current="page"' : ""}>${esc(j.nome)}</a></li>`).join("") +
        `</ul></div>`;
    }).join("");
    // v1.0.21: "Notícias" é um link direto (não é jogo), com o mesmo visual dos botões de categoria
    const naNoticias = atual === "/noticias" || atual.startsWith("/noticias/");
    const noticias = `<a class="pm-nav-link${naNoticias ? " atual" : ""}" href="/noticias/"${naNoticias ? ' aria-current="page"' : ""}>📰 Notícias</a>`;
    h.innerHTML =
      `<a class="brand" href="/" aria-label="O Enforcado - página inicial"><img src="/img/hung.png" alt="" width="42" height="42"><span>O Enforcado</span></a>` +
      `<nav aria-label="Navegação principal">${links}${noticias}</nav><div class="header-actions" id="pm-acoes"></div>` +
      `<button type="button" class="pm-burger" id="pm-burger" aria-label="Abrir menu" aria-expanded="false" aria-controls="pm-drawer"><span></span><span></span><span></span></button>`;
    renderAcoes();
  }

  function renderAcoes() {
    const el = $("pm-acoes");
    if (!el) return;
    const u = auth.currentUser;
    let html = `<button type="button" class="pm-icon" data-pm="diario" aria-label="Desafio do dia" title="Desafio do dia">📅</button>` +
      `<button type="button" class="pm-icon" data-pm="ranking" aria-label="Ranking global" title="Ranking global">🏆</button>`;
    if (!authPronto) { el.innerHTML = html + `<span class="pm-ph" aria-hidden="true"></span>`; return; } // v1.0.14: reserva o lugar do login/avatar (CLS)
    if (u) {
      const perfil = perfilAtual(u);
      const foto = `<img src="${esc(srcImg(perfil.avatar))}" alt="" referrerpolicy="no-referrer">`;
      const d = ler();
      html += `<button type="button" class="pm-avatar" data-pm="menu" aria-label="Minha conta" aria-haspopup="true">${foto}</button>` +
        `<div class="pm-menu" id="pm-menu" hidden><strong>${esc(perfil.nome)}</strong>` +
        `<span>⭐ ${d.xp} XP no total</span><span>🔥 Sequência: ${d.streak.atual} ${d.streak.atual === 1 ? "dia" : "dias"}</span>` +
        `<button type="button" data-pm="ranking">🏆 Ver ranking</button>` +
        `<button type="button" data-pm="perfil">✏️ Editar perfil</button>` +
        (notifOk ? `<button type="button" data-pm="notificacoes">${notifAtivas() ? "🔕 Desativar avisos" : "🔔 Avisar do desafio do dia"}</button>` : "") +
        `<button type="button" data-pm="sair">Sair da conta</button></div>`;
    } else {
      html += `<button type="button" class="pm-login" data-pm="login" aria-label="Entrar com o Google"><span class="g">G</span><span class="pm-login-txt"> Entrar</span></button>`;
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
        `<div class="pm-linha${u && p.id === u.uid ? " eu" : ""}"><span>${i + 1}º</span><img src="${esc(srcImg(p.avatar))}" alt="" referrerpolicy="no-referrer"><span>${esc(p.nome)}</span><b>${Number(p.xp) || 0}</b></div>`).join("")
        : `<p class="pm-vazio">Ninguém no ranking ainda. Seja o primeiro!</p>`;
    }).catch(() => { $("pm-top").innerHTML = `<p class="pm-vazio">Não foi possível carregar o ranking agora.</p>`; });

    if (u) {
      db.ref("ranking/" + u.uid).once("value").then(s => {
        const eu = s.val(); if (!eu) return;
        return db.ref("ranking").orderByChild("xp").startAt((eu.xp || 0) + 1).limitToFirst(101).once("value").then(acima => {
          const n = acima.numChildren();
          $("pm-eu").innerHTML = `<p class="pm-sub">SUA POSIÇÃO</p><div class="pm-linha eu"><span>${n > 100 ? "100+" : n + 1}º</span><img src="${esc(srcImg(eu.avatar))}" alt="" referrerpolicy="no-referrer"><span>${esc(eu.nome)}</span><b>${Number(eu.xp) || 0}</b></div>`;
        });
      }).catch(() => { });
    }
  }

  /* ---------- Perfil (nome e avatar do ranking) ---------- */
  const AVATARES = [1, 2, 3, 4, 5, 6].map(n => "img/avatars/avatar" + n + ".png");
  const FOTO_GOOGLE_OK = /^https:\/\/lh[0-9]+\.googleusercontent\.com\/[A-Za-z0-9_.\/=+%-]{1,400}$/;
  let avatarEscolhido = "";

  function fecharPerfil() { const o = $("pm-perfil"); if (o) o.remove(); }

  function atualizarAvisoPerfil() {
    const o = $("pm-perfil"); if (!o) return;
    o.querySelectorAll(".pm-av").forEach(b => b.classList.toggle("sel", b.dataset.av === avatarEscolhido));
    $("pm-perfil-aviso").hidden = !FOTO_GOOGLE_OK.test(avatarEscolhido);
  }

  function abrirPerfil() {
    const u = auth.currentUser;
    if (!u) return;
    fecharMenu(); fecharPerfil();
    const atual = perfilAtual(u);
    avatarEscolhido = atual.avatar;
    const fotoGoogle = u.photoURL && FOTO_GOOGLE_OK.test(u.photoURL) ? u.photoURL : "";
    const opcoes = AVATARES.map((src, i) => `<button type="button" class="pm-av" data-av="${esc(src)}" aria-label="Avatar ${i + 1}"><img src="${esc(srcImg(src))}" alt=""></button>`).join("") +
      (fotoGoogle ? `<button type="button" class="pm-av" data-av="${esc(fotoGoogle)}" aria-label="Minha foto do Google"><img src="${esc(fotoGoogle)}" alt="" referrerpolicy="no-referrer"></button>` : "");
    const o = document.createElement("div");
    o.id = "pm-perfil"; o.className = "pm-overlay";
    o.innerHTML = `<div class="pm-modal" role="dialog" aria-modal="true" aria-label="Editar perfil"><button type="button" class="pm-fechar" aria-label="Fechar">✕</button>` +
      `<h2>✏️ Editar perfil</h2>` +
      `<label class="pm-perfil-campo">Nome no ranking<input id="pm-perfil-nome" data-clarity-mask="True" type="text" maxlength="20" autocomplete="nickname" value="${esc(atual.nome)}"><button type="button" class="pm-perfil-link" data-acao="nome-google">Usar meu nome do Google</button></label>` +
      `<p class="pm-sub">AVATAR</p><div class="pm-perfil-avs">${opcoes}</div>` +
      `<p class="pm-perfil-aviso" id="pm-perfil-aviso" hidden>📷 Sua foto do Google ficará visível para todos no ranking público.</p>` +
      `<div class="pm-perfil-acoes"><button type="button" class="pm-perfil-cancelar" data-acao="cancelar">Cancelar</button><button type="button" class="pm-perfil-salvar" data-acao="salvar">Salvar</button></div></div>`;
    document.body.appendChild(o);
    atualizarAvisoPerfil();
    o.addEventListener("click", e => {
      if (e.target === o || e.target.closest(".pm-fechar")) { fecharPerfil(); return; }
      const av = e.target.closest(".pm-av");
      if (av) { avatarEscolhido = av.dataset.av; atualizarAvisoPerfil(); return; }
      const acao = e.target.closest("[data-acao]");
      if (!acao) return;
      if (acao.dataset.acao === "nome-google") $("pm-perfil-nome").value = nomeConta(u);
      else if (acao.dataset.acao === "cancelar") fecharPerfil();
      else if (acao.dataset.acao === "salvar") salvarPerfil(acao);
    });
    $("pm-perfil-nome").focus();
  }

  async function salvarPerfil(botao) {
    const u = auth.currentUser;
    if (!u) return;
    const nome = ($("pm-perfil-nome").value || "").replace(/\s+/g, " ").trim().slice(0, 20);
    if (!nome) { toast("Escreva um nome para aparecer no ranking."); $("pm-perfil-nome").focus(); return; }
    const avatar = avatarEscolhido;
    botao.disabled = true;
    try {
      // atualizado entra em toda gravação do ranking (horário do servidor)
      await db.ref("ranking/" + u.uid).update({ nome, avatar, atualizado: firebase.database.ServerValue.TIMESTAMP });
      const d = ler(); d.perfil = { nome, avatar }; salvar(d);
      fecharPerfil(); renderAcoes();
      toast("Perfil atualizado!");
    } catch (e) {
      console.error("Erro ao salvar perfil:", e);
      botao.disabled = false;
      toast("Não foi possível salvar o perfil agora. Tente de novo.");
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

  /* ---------- Dropdown de categorias (cabeçalho no computador) ---------- */
  function fecharDropdowns(exceto) {
    document.querySelectorAll(".pm-dd.aberto").forEach(d => {
      if (d === exceto) return;
      d.classList.remove("aberto");
      const b = d.querySelector(".pm-dd-btn"); if (b) b.setAttribute("aria-expanded", "false");
    });
  }
  function alternarDropdown(d) {
    const abrir = !d.classList.contains("aberto");
    fecharDropdowns(abrir ? d : null);
    d.classList.toggle("aberto", abrir);
    d.querySelector(".pm-dd-btn").setAttribute("aria-expanded", abrir ? "true" : "false");
  }

  /* ---------- Eventos globais ---------- */
  document.addEventListener("click", e => {
    const dd = e.target.closest(".pm-dd-btn");
    if (dd) { alternarDropdown(dd.closest(".pm-dd")); return; }
    if (!e.target.closest(".pm-dd")) fecharDropdowns();
    const a = e.target.closest("[data-pm]");
    if (a) {
      const acao = a.dataset.pm;
      if (acao === "login") entrar();
      else if (acao === "ranking") abrirRanking();
      else if (acao === "perfil") abrirPerfil();
      else if (acao === "diario") irParaDiario();
      else if (acao === "sair") sair();
      else if (acao === "notificacoes") alternarNotificacoes();
      else if (acao === "menu") { const m = $("pm-menu"); if (m) m.hidden = !m.hidden; }
      return;
    }
    if (!e.target.closest(".pm-menu")) fecharMenu();
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    const dd = document.querySelector(".pm-dd.aberto");
    if (dd) { const b = dd.querySelector(".pm-dd-btn"); fecharDropdowns(); if (b) b.focus(); }
    fecharRanking(); fecharPerfil(); fecharVitoria(); fecharAvisoDiario(); fecharMenu();
  });

  // Depois do login, troca o convite do pop-up de vitória por uma confirmação
  function confirmarLoginNaVitoria() {
    const ctas = document.querySelectorAll(".pm-login-cta");
    if (!ctas.length) return;
    const xp = ler().xp;
    ctas.forEach(c => {
      c.classList.add("ok");
      c.innerHTML = `<p class="pm-login-cta-t">✅ XP salvo na sua conta!</p>` +
        `<p class="pm-login-cta-d">Seus ${xp} XP já estão no ranking. Bora subir de posição?</p>` +
        `<button type="button" class="pm-login-cta-btn" data-pm="ranking">🏆 Ver ranking</button>`;
    });
  }

  auth.onAuthStateChanged(async u => {
    if (u) { try { await sincronizarConta(u); } catch (e) { console.error("Erro ao sincronizar conta:", e); } }
    authPronto = true;
    if (u) confirmarLoginNaVitoria();
    if (u && notifAtivas()) registrarToken(u, false).catch(() => { });
    renderAcoes();
    if ($("pm-ranking")) abrirRanking();
  });

  /* ---------- Início e service worker (o aviso de cookies fica em js/consent.js) ---------- */
  /* ---------- Banner da loja parceira, acima do rodapé (v1.0.24) ---------- */
  // Para trocar ou tirar: edite BANNER (ou apague esta parte e a chamada em iniciar()).
  // Sem imagens, mostra um banner feito em CSS. Para usar arte própria, preencha "desktop" e "mobile"
  // com arquivos de docs/img/parceiros/ (ex.: "/img/parceiros/closetreal-desktop.jpg").
  const BANNER = {
    nome: "Closet Real", url: "https://closetreal.com.br/",
    linha: "Moda feminina com envio para todo o Brasil", dominio: "closetreal.com.br",
    desktop: "", mobile: ""
  };
  const BANNER_CSS = ".pm-banner{width:min(100% - 32px,1000px);margin:0 auto 36px}" +
    ".pm-banner-a{position:relative;display:flex;flex-direction:column;justify-content:center;gap:2px;min-height:112px;padding:20px clamp(18px,4vw,36px);padding-right:clamp(80px,16vw,150px);border:1px solid #f1c9d2;border-radius:18px;background:linear-gradient(110deg,#fff7f8 0%,#fde6eb 55%,#f9d3dc 100%);color:#5b1a2b;text-decoration:none;overflow:hidden;box-shadow:0 4px 0 #f1c9d2;transition:transform .15s}" +
    ".pm-banner-a::after{content:\"👗\" / \"\";position:absolute;right:clamp(16px,5vw,48px);top:50%;transform:translateY(-50%);font-size:clamp(2.6rem,8vw,4rem);line-height:1}" +
    ".pm-banner-a:hover{transform:translateY(-2px)}.pm-banner-a:focus-visible{outline:3px solid #93c5fd;outline-offset:3px}" +
    ".pm-banner-tag{position:absolute;top:8px;left:clamp(18px,4vw,36px);font-size:.62rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7d4b59}" +
    ".pm-banner-marca{margin-top:8px;font-family:Poppins,Inter,system-ui,sans-serif;font-size:clamp(1.5rem,4vw,2.1rem);font-weight:800;letter-spacing:-.03em;line-height:1.1}" +
    ".pm-banner-linha{font-size:.95rem;color:#7a3a4b;line-height:1.4}" +
    ".pm-banner-dom{margin-top:4px;font-size:.78rem;font-weight:700;letter-spacing:.04em;color:#8a3a50}" +
    ".pm-banner-img{position:relative;display:block;border-radius:18px;overflow:hidden;box-shadow:0 4px 0 #dbe3ef;transition:transform .15s}.pm-banner-img:hover{transform:translateY(-2px)}" +
    ".pm-banner-img:focus-visible{outline:3px solid #93c5fd;outline-offset:3px}.pm-banner-img img{display:block;width:100%;height:auto}" +
    ".pm-banner-img .pm-banner-tag{top:8px;right:8px;left:auto;padding:2px 7px;border-radius:6px;background:#000a;color:#fff}" +
    "@media(prefers-reduced-motion:reduce){.pm-banner-a,.pm-banner-img{transition:none}.pm-banner-a:hover,.pm-banner-img:hover{transform:none}}@media print{.pm-banner{display:none}}";

  function montarBanner() {
    const rodape = document.querySelector(".corp-footer");
    if (!rodape || !rodape.parentNode || $("pm-banner")) return;
    if (!$("pm-banner-css")) {
      const st = document.createElement("style");
      st.id = "pm-banner-css"; st.textContent = BANNER_CSS;
      document.head.appendChild(st);
    }
    const pag = (location.pathname.replace(/\.html$/, "").replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "home").slice(0, 40);
    const href = BANNER.url + "?utm_source=oenforcado&utm_medium=banner&utm_campaign=" + encodeURIComponent(pag);
    const tag = '<span class="pm-banner-tag">Publicidade</span>';
    const conteudo = BANNER.desktop
      ? '<a class="pm-banner-img" href="' + esc(href) + '" target="_blank" rel="sponsored noopener" aria-label="' + esc(BANNER.nome + ": " + BANNER.linha) + '"><picture>' +
        (BANNER.mobile ? '<source media="(max-width:600px)" srcset="' + esc(BANNER.mobile) + '">' : "") +
        '<img src="' + esc(BANNER.desktop) + '" alt="" width="1000" height="150" loading="lazy" decoding="async"></picture>' + tag + '</a>'
      : '<a class="pm-banner-a" href="' + esc(href) + '" target="_blank" rel="sponsored noopener">' + tag +
        '<span class="pm-banner-marca">' + esc(BANNER.nome) + '</span><span class="pm-banner-linha">' + esc(BANNER.linha) + '</span>' +
        '<span class="pm-banner-dom">' + esc(BANNER.dominio) + '</span></a>';
    const el = document.createElement("aside");
    el.id = "pm-banner"; el.className = "pm-banner"; el.setAttribute("aria-label", "Publicidade");
    el.innerHTML = conteudo;
    el.addEventListener("click", e => {
      if (e.target.closest("a") && typeof gtag === "function") gtag("event", "click_banner_parceiro", { parceiro: BANNER.nome, pagina: pag });
    });
    rodape.parentNode.insertBefore(el, rodape);
  }

  function iniciar() { montarHeader(); iniciarNotificacoes(); montarBanner(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => { }));

  window.Portal = { toolbar, criarBotaoDiario, concluir, anexarFim, compartilhar, rngDiario, diarioConcluido, hoje, toast, abrirRanking, maxDicas: (jogo, nivel) => { const v = MAX_DICAS[jogo]; return v && typeof v === "object" ? (v[nivel] || 0) : (v || 0); } };
})();