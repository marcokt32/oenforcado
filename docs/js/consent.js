/*!
 * O Enforcado - consentimento de cookies (LGPD) com Google Consent Mode v2.
 *
 * Como funciona:
 *  1. Este script roda ANTES de qualquer tag do Google e define o consentimento padrao como "negado".
 *  2. Google Analytics (gtag.js) e Google AdSense so sao carregados depois que o visitante aceita.
 *  3. A escolha fica salva no navegador (localStorage) por 12 meses e pode ser alterada a qualquer
 *     momento pelo link "Gerenciar cookies" do rodape.
 *
 * Chaves de configuracao: veja CONFIG logo abaixo.
 */
(function () {
  "use strict";

  var CONFIG = {
    GA_ID: "G-LPB04DJLXC",
    ADS_ID: "AW-10942914304",
    ADSENSE_CLIENT: "ca-pub-8119130352737496",

    CHAVE: "enf_consent",
    VERSAO: 1,
    VALIDADE_DIAS: 365,

    // Mude para true SOMENTE depois de publicar a mensagem GDPR em AdSense > Privacidade e mensagens.
    // Com true, visitantes que parecem estar na Europa (pelo fuso horario) veem a mensagem do CMP do
    // Google no lugar do banner abaixo. Os demais continuam com o banner proprio.
    GOOGLE_CMP: false,

    // false = quem recusa nao ve anuncios (mais conservador).
    // true  = quem recusa ainda recebe anuncios limitados, sem cookies de personalizacao.
    ANUNCIOS_SEM_CONSENTIMENTO: false
  };

  var w = window, d = document;
  var memoria = null;
  var carregado = { gtag: false, ga: false, ads: false, adsense: false };
  var ultimoFoco = null;

  /* ---------- Consent Mode: padrao negado (antes de qualquer tag) ---------- */
  w.dataLayer = w.dataLayer || [];
  function gtag() { w.dataLayer.push(arguments); }
  if (!w.gtag) { w.gtag = gtag; }
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    wait_for_update: 500
  });
  gtag("set", "ads_data_redaction", true);

  /* ---------- Armazenamento da escolha ---------- */
  function lerBruto() {
    try { return w.localStorage.getItem(CONFIG.CHAVE); } catch (e) { return memoria; }
  }
  function gravarBruto(v) {
    memoria = v;
    try { w.localStorage.setItem(CONFIG.CHAVE, v); } catch (e) { /* armazenamento bloqueado */ }
  }
  function estadoSalvo() {
    var raw = lerBruto();
    if (!raw) { return null; }
    try {
      var s = JSON.parse(raw);
      if (!s || s.v !== CONFIG.VERSAO || typeof s.t !== "number") { return null; }
      if (Date.now() - s.t > CONFIG.VALIDADE_DIAS * 86400000) { return null; }
      return { a: !!s.a, p: !!s.p, t: s.t };
    } catch (e) { return null; }
  }

  /* ---------- Carregamento condicional das tags ---------- */
  function injetarScript(src, cors) {
    var s = d.createElement("script");
    s.async = true;
    s.src = src;
    if (cors) { s.crossOrigin = "anonymous"; }
    (d.head || d.documentElement).appendChild(s);
  }

  function carregarAdsense() {
    if (carregado.adsense) { return; }
    carregado.adsense = true;
    injetarScript("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + CONFIG.ADSENSE_CLIENT, true);
  }

  function carregarGtag(a, p) {
    if (!a && !p) { return; }
    if (!carregado.gtag) {
      carregado.gtag = true;
      injetarScript("https://www.googletagmanager.com/gtag/js?id=" + CONFIG.GA_ID, false);
      gtag("js", new Date());
    }
    if (a && !carregado.ga) { carregado.ga = true; gtag("config", CONFIG.GA_ID); }
    if (p && !carregado.ads) { carregado.ads = true; gtag("config", CONFIG.ADS_ID); }
  }

  function aplicar(a, p) {
    gtag("consent", "update", {
      analytics_storage: a ? "granted" : "denied",
      ad_storage: p ? "granted" : "denied",
      ad_user_data: p ? "granted" : "denied",
      ad_personalization: p ? "granted" : "denied"
    });
    carregarGtag(a, p);
    if (p || CONFIG.ANUNCIOS_SEM_CONSENTIMENTO) { carregarAdsense(); }
  }

  function limparCookies() {
    var host = w.location.hostname;
    var partes = host.split(".");
    var dominios = ["", host, "." + host];
    if (partes.length > 2) { dominios.push("." + partes.slice(-2).join(".")); }
    var nomes = d.cookie ? d.cookie.split(";") : [];
    for (var i = 0; i < nomes.length; i++) {
      var nome = nomes[i].split("=")[0].replace(/^\s+/, "");
      if (/^(_ga|_gid|_gat|_gcl_|_gac_|__gads|__gpi|_fbp)/.test(nome)) {
        for (var j = 0; j < dominios.length; j++) {
          d.cookie = nome + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" +
            (dominios[j] ? "; domain=" + dominios[j] : "");
        }
      }
    }
  }

  function definir(a, p) {
    var reduziu = (carregado.ga && !a) || (carregado.ads && !p) ||
      (carregado.adsense && !p && !CONFIG.ANUNCIOS_SEM_CONSENTIMENTO);
    gravarBruto(JSON.stringify({ v: CONFIG.VERSAO, a: !!a, p: !!p, t: Date.now() }));
    try { w.localStorage.removeItem("cookiesAceitos"); } catch (e) { /* formato antigo */ }
    try {
      d.dispatchEvent(new CustomEvent("consentimento:atualizado", { detail: { analytics: !!a, publicidade: !!p } }));
    } catch (e) { /* navegador antigo */ }
    if (reduziu) {
      // Tags ja carregadas nao podem ser descarregadas: limpa os cookies e recarrega sem elas.
      limparCookies();
      w.location.reload();
      return;
    }
    aplicar(a, p);
  }

  /* ---------- Modo CMP do Google (visitantes na Europa) ---------- */
  function provavelmenteEuropa() {
    try {
      var tz = (w.Intl && Intl.DateTimeFormat().resolvedOptions().timeZone) || "";
      return /^Europe\//.test(tz) || /^Atlantic\/(Azores|Madeira|Canary|Faroe|Reykjavik)$/.test(tz);
    } catch (e) { return false; }
  }
  var modoGoogle = CONFIG.GOOGLE_CMP && provavelmenteEuropa();

  function iniciarModoGoogle() {
    // Os sinais ficam "negados" ate o CMP do Google atualiza-los apos a escolha do visitante.
    carregado.gtag = carregado.ga = carregado.ads = true;
    injetarScript("https://www.googletagmanager.com/gtag/js?id=" + CONFIG.GA_ID, false);
    gtag("js", new Date());
    gtag("config", CONFIG.GA_ID);
    gtag("config", CONFIG.ADS_ID);
    carregarAdsense();
  }

  /* ---------- Interface ---------- */
  var CSS = "" +
    "#cookie-banner.cc-banner{position:fixed;left:0;right:0;bottom:0;z-index:9998;padding:14px 16px calc(14px + env(safe-area-inset-bottom,0px));background:#0a2540;color:#eaf1fa;font:400 .9rem/1.45 Inter,system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 -6px 24px rgba(10,37,64,.28)}" +
    "#cookie-banner.cc-banner[hidden]{display:none}" +
    "#cookie-banner .cc-box{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px 20px;max-width:1040px;margin:0 auto}" +
    "#cookie-banner .cc-text{margin:0;flex:1 1 360px;text-align:left}" +
    "#cookie-banner .cc-text a{color:#fff;text-decoration:underline}" +
    "#cookie-banner .cc-actions{display:flex;flex-wrap:wrap;gap:10px}" +
    ".cc-btn{min-height:44px;padding:0 20px;border-radius:10px;border:2px solid transparent;font:inherit;font-weight:700;cursor:pointer;line-height:1}" +
    ".cc-btn:focus-visible,.cc-switch input:focus-visible{outline:3px solid #ffbf47;outline-offset:2px}" +
    ".cc-btn-main{background:#1f6feb;border-color:#1f6feb;color:#fff}" +
    ".cc-btn-main:hover{background:#1a5fd0;border-color:#1a5fd0}" +
    ".cc-btn-alt{background:transparent;border-color:#8fb4ee;color:#fff}" +
    ".cc-btn-alt:hover{background:rgba(255,255,255,.12)}" +
    ".cc-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,37,64,.62);font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}" +
    ".cc-overlay[hidden]{display:none}" +
    ".cc-dialog{width:100%;max-width:520px;max-height:calc(100vh - 32px);overflow:auto;background:#fff;color:#0a2540;border-radius:16px;padding:22px;box-shadow:0 18px 60px rgba(0,0,0,.35)}" +
    ".cc-dialog h2{margin:0 0 6px;font-size:1.2rem}" +
    ".cc-dialog p{margin:0 0 14px;font-size:.9rem;line-height:1.5;color:#3d4d63}" +
    ".cc-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:12px 0;border-top:1px solid #dbe3ef}" +
    ".cc-row strong{display:block;font-size:.95rem}" +
    ".cc-row span.cc-desc{display:block;margin-top:2px;font-size:.82rem;color:#526176;line-height:1.4}" +
    ".cc-fixo{font-size:.78rem;font-weight:700;color:#1b7f4b;white-space:nowrap;padding-top:2px}" +
    ".cc-switch{position:relative;flex:0 0 auto;width:52px;height:30px}" +
    ".cc-switch input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}" +
    ".cc-switch i{position:absolute;inset:0;border-radius:30px;background:#b8c4d6;transition:background .15s;pointer-events:none}" +
    ".cc-switch i:after{content:'';position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .15s}" +
    ".cc-switch input:checked + i{background:#1f6feb}" +
    ".cc-switch input:checked + i:after{transform:translateX(22px)}" +
    ".cc-dialog .cc-actions{margin-top:16px;display:flex;flex-wrap:wrap;gap:10px}" +
    ".cc-dialog .cc-btn-alt{border-color:#1f6feb;color:#1f6feb}" +
    ".cc-dialog .cc-btn-alt:hover{background:#eef4ff}" +
    "@media(max-width:560px){#cookie-banner .cc-actions{width:100%}#cookie-banner .cc-btn{flex:1 1 100%}.cc-dialog .cc-btn{flex:1 1 100%}}";

  function el(tag, props, filhos) {
    var n = d.createElement(tag), k;
    for (k in props) {
      if (props.hasOwnProperty(k)) {
        if (k === "text") { n.textContent = props[k]; } else { n.setAttribute(k, props[k]); }
      }
    }
    if (filhos) { for (var i = 0; i < filhos.length; i++) { n.appendChild(filhos[i]); } }
    return n;
  }

  var banner = null, overlay = null, chkA = null, chkP = null;

  function injetarEstilo() {
    if (d.getElementById("cc-style")) { return; }
    var s = el("style", { id: "cc-style" });
    s.appendChild(d.createTextNode(CSS));
    (d.head || d.documentElement).appendChild(s);
  }

  function mostrarBanner(sim) {
    if (!banner) { return; }
    if (sim) { banner.removeAttribute("hidden"); } else { banner.setAttribute("hidden", ""); }
  }

  function montarBanner() {
    var b1 = el("button", { type: "button", "class": "cc-btn cc-btn-main", text: "Recusar" });
    var b2 = el("button", { type: "button", "class": "cc-btn cc-btn-alt", text: "Personalizar" });
    var b3 = el("button", { type: "button", "class": "cc-btn cc-btn-main", text: "Aceitar" });
    b1.addEventListener("click", function () { definir(false, false); mostrarBanner(false); });
    b2.addEventListener("click", function () { abrirPainel(b2); });
    b3.addEventListener("click", function () { definir(true, true); mostrarBanner(false); });

    var link = el("a", { href: "/politica.html", text: "Política de Privacidade" });
    var texto = el("p", { "class": "cc-text" }, [
      d.createTextNode("Usamos cookies para medir o uso do site (estatísticas) e exibir anúncios. Os não essenciais só são ativados se você permitir, e você pode mudar de ideia quando quiser. Saiba mais na "),
      link,
      d.createTextNode(".")
    ]);
    banner = el("div", { id: "cookie-banner", "class": "cc-banner", role: "region", "aria-label": "Aviso de cookies", hidden: "" }, [
      el("div", { "class": "cc-box" }, [texto, el("div", { "class": "cc-actions" }, [b1, b2, b3])])
    ]);
    d.body.appendChild(banner);
  }

  function linhaSwitch(id, titulo, desc) {
    var input = el("input", { type: "checkbox", role: "switch", id: id });
    var rotulo = el("label", { "for": id }, [
      el("strong", { text: titulo }),
      el("span", { "class": "cc-desc", text: desc })
    ]);
    var sw = el("span", { "class": "cc-switch" }, [input, el("i", {})]);
    return { linha: el("div", { "class": "cc-row" }, [rotulo, sw]), input: input };
  }

  function montarPainel() {
    var necessarios = el("div", { "class": "cc-row" }, [
      el("div", {}, [
        el("strong", { text: "Necessários" }),
        el("span", { "class": "cc-desc", text: "Guardam sua escolha de cookies, seu progresso e pontuações no aparelho e o login opcional. O site não funciona sem eles." })
      ]),
      el("span", { "class": "cc-fixo", text: "Sempre ativos" })
    ]);
    var sa = linhaSwitch("cc-analytics", "Estatísticas", "Google Analytics: nos ajuda a entender quais jogos são mais usados e a melhorar o site.");
    var sp = linhaSwitch("cc-publicidade", "Publicidade", "Google AdSense e Google Ads: exibem anúncios e medem seu desempenho, inclusive com base em visitas anteriores.");
    chkA = sa.input; chkP = sp.input;

    var salvar = el("button", { type: "button", "class": "cc-btn cc-btn-main", text: "Salvar preferências" });
    var recusar = el("button", { type: "button", "class": "cc-btn cc-btn-alt", text: "Recusar todos" });
    var aceitar = el("button", { type: "button", "class": "cc-btn cc-btn-alt", text: "Aceitar todos" });
    salvar.addEventListener("click", function () { definir(chkA.checked, chkP.checked); fecharPainel(); mostrarBanner(false); });
    recusar.addEventListener("click", function () { definir(false, false); fecharPainel(); mostrarBanner(false); });
    aceitar.addEventListener("click", function () { definir(true, true); fecharPainel(); mostrarBanner(false); });

    var dialog = el("div", { "class": "cc-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "cc-titulo" }, [
      el("h2", { id: "cc-titulo", text: "Preferências de cookies" }),
      el("p", { text: "Escolha o que podemos usar. Você pode alterar isso a qualquer momento em “Gerenciar cookies”, no rodapé do site." }),
      necessarios, sa.linha, sp.linha,
      el("div", { "class": "cc-actions" }, [salvar, recusar, aceitar])
    ]);
    overlay = el("div", { "class": "cc-overlay", hidden: "" }, [dialog]);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) { fecharPainel(); } });
    d.addEventListener("keydown", function (e) {
      if (overlay && !overlay.hasAttribute("hidden")) {
        if (e.key === "Escape") { fecharPainel(); }
        if (e.key === "Tab") { prenderFoco(e, dialog); }
      }
    });
    d.body.appendChild(overlay);
  }

  function prenderFoco(e, dialog) {
    var itens = dialog.querySelectorAll("button, input");
    if (!itens.length) { return; }
    var primeiro = itens[0], ultimo = itens[itens.length - 1];
    if (e.shiftKey && d.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && d.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  }

  function abrirPainel(origem) {
    if (modoGoogle && w.googlefc && typeof w.googlefc.showRevocationMessage === "function") {
      try { w.googlefc.showRevocationMessage(); return; } catch (e) { /* cai para o painel proprio */ }
    }
    if (!overlay) { return; }
    var s = estadoSalvo();
    chkA.checked = !!(s && s.a);
    chkP.checked = !!(s && s.p);
    ultimoFoco = origem || d.activeElement;
    overlay.removeAttribute("hidden");
    chkA.focus();
  }

  function fecharPainel() {
    if (!overlay) { return; }
    overlay.setAttribute("hidden", "");
    if (ultimoFoco && ultimoFoco.focus) { try { ultimoFoco.focus(); } catch (e) { /* elemento removido */ } }
  }

  function injetarLinkRodape() {
    var nav = d.querySelector('nav[aria-label="Institucional"]');
    if (!nav || nav.querySelector("[data-cc-abrir]")) { return; }
    nav.appendChild(el("a", { href: "#", role: "button", "data-cc-abrir": "", text: "Gerenciar cookies" }));
  }

  function iniciarUI() {
    injetarEstilo();
    var semBanner = d.documentElement.hasAttribute("data-cc-sem-banner");
    montarBanner();
    montarPainel();
    injetarLinkRodape();
    d.addEventListener("click", function (e) {
      var alvo = e.target && e.target.closest ? e.target.closest("[data-cc-abrir]") : null;
      if (alvo) { e.preventDefault(); abrirPainel(alvo); }
    });
    if (!estadoSalvo() && !modoGoogle && !semBanner) { mostrarBanner(true); }
  }

  /* ---------- Inicio ---------- */
  var scriptAtual = d.currentScript;
  var semBannerNoScript = !!(scriptAtual && scriptAtual.hasAttribute("data-sem-banner"));
  if (semBannerNoScript) { d.documentElement.setAttribute("data-cc-sem-banner", ""); }

  var salvo = estadoSalvo();
  if (modoGoogle) {
    iniciarModoGoogle();
  } else if (salvo) {
    aplicar(salvo.a, salvo.p);
  } else if (CONFIG.ANUNCIOS_SEM_CONSENTIMENTO) {
    carregarAdsense();
  }

  if (d.readyState === "loading") { d.addEventListener("DOMContentLoaded", iniciarUI); } else { iniciarUI(); }

  w.Consentimento = {
    abrir: function () { abrirPainel(); },
    estado: function () { var s = estadoSalvo(); return s ? { analytics: s.a, publicidade: s.p } : null; }
  };
})();
