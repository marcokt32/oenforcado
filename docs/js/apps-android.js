// Bloco "Também no celular": divulga os apps Android do O Enforcado acima do rodapé.
// Carregado pelo js/portal.js. Para trocar, remover ou adicionar um app, edite só a lista APPS abaixo.
// v1.0.1 (15/11/2026): o bloco entra acima do banner da loja parceira (#pm-banner), se ele existir
// v1.0.0 (15/11/2026)
//  - Não aparece em iPhone/iPad (não instalam apps da Play Store) nem nas páginas legais.
//  - Cada link leva o parâmetro "referrer" (utm_campaign = página de origem), que aparece nos relatórios de
//    aquisição do Play Console. Cada clique também vira o evento "click_app_android" no Google Analytics.
(() => {
  "use strict";
  if (window.AppsAndroid) return;
  window.AppsAndroid = true;

  // Ordem = ordem de exibição. "icone" fica em docs/img/apps/. Sem a imagem, o card mostra a inicial do nome.
  const APPS = [
    { id: "com.godotengine.fruitgift", nome: "Fruit Gift", tag: "Aventura", icone: "/img/apps/fruitgift.png",
      texto: "Aventura de plataforma inspirada nos clássicos de 16 bits. Explore, enfrente monstros e reviva a nostalgia." },
    { id: "com.godotengine.airhockey", nome: "Ricochet Air Hockey Online", tag: "Esportes · Online", icone: "/img/apps/airhockey.png",
      texto: "Hóquei de mesa 1 contra 1. Crie uma sala, chame um amigo e marque mais gols." },
    { id: "org.godotengine.dmjumpball", nome: "Jump Ball", tag: "Arcade", icone: "/img/apps/jumpball.png",
      texto: "Uma bola que quica sozinha: suba o mais alto que conseguir, desviando de obstáculos e plataformas." }
  ];

  const PLAY = "https://play.google.com/store/apps/details?id=";
  const EXCLUIR = /^\/(politica|termos|airhockeypolicy|admin-reportes)/; // páginas legais e internas

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ehIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const pagina = () => (location.pathname.replace(/\.html$/, "").replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "home").slice(0, 40);
  const link = id => PLAY + encodeURIComponent(id) + "&referrer=" + encodeURIComponent("utm_source=oenforcado&utm_medium=site&utm_campaign=" + pagina());

  const CSS = `
.apk-bloco{width:min(100% - 32px,1000px);margin:40px auto 44px}
.apk-bloco h2{margin:0 0 4px;font-family:Poppins,Inter,system-ui,sans-serif;font-size:clamp(1.3rem,3vw,1.7rem);font-weight:800;letter-spacing:-.03em;color:var(--ink,#0a2540)}
.apk-sub{margin:0 0 16px;color:#526176;line-height:1.5}
.apk-lista{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:0;padding:0;list-style:none}
.apk-card{display:flex;gap:14px;align-items:flex-start;height:100%;padding:16px;border:1px solid var(--line,#dbe3ef);border-radius:18px;background:#fff;color:inherit;text-decoration:none;box-shadow:0 4px 0 #dbe3ef;transition:transform .15s,border-color .15s}
.apk-card:hover{transform:translateY(-2px);border-color:var(--blue,#1f6feb)}
.apk-card:focus-visible{outline:3px solid #93c5fd;outline-offset:3px}
.apk-ico{flex:none;width:64px;height:64px;border-radius:16px;overflow:hidden;background:#edf3ff;box-shadow:0 2px 6px #0a254026}
.apk-ico img{display:block;width:100%;height:100%;object-fit:cover}
.apk-ico.sem-img{display:grid;place-items:center;background:linear-gradient(135deg,var(--blue,#1f6feb),#0a2540);color:#fff;font:800 1.7rem Poppins,Inter,sans-serif}
.apk-txt{display:flex;flex-direction:column;align-items:flex-start;gap:5px;min-width:0;align-self:stretch}
.apk-tag{padding:3px 9px;border-radius:999px;background:#edf2ff;background:color-mix(in srgb,var(--blue,#1f6feb) 12%,#fff);color:#2357a5;color:color-mix(in srgb,var(--blue,#1f6feb) 70%,#000);font-size:.7rem;font-weight:800;letter-spacing:.02em}
.apk-card strong{font-family:Poppins,Inter,system-ui,sans-serif;font-size:1.05rem;line-height:1.25;letter-spacing:-.02em;color:var(--ink,#0a2540)}
.apk-desc{color:#34445a;font-size:.88rem;line-height:1.5}
.apk-cta{margin-top:auto;padding-top:6px;color:var(--blue,#1f6feb);font-size:.86rem;font-weight:800}
.apk-cta b{display:inline-block;transition:transform .15s}
.apk-card:hover .apk-cta b{transform:translateX(3px)}
@media(max-width:850px){.apk-lista{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.apk-card,.apk-cta b{transition:none}.apk-card:hover{transform:none}}
@media print{.apk-bloco{display:none}}`;

  const card = a =>
    `<li><a class="apk-card" href="${esc(link(a.id))}" target="_blank" rel="noopener" data-app="${esc(a.id)}">` +
    `<span class="apk-ico" aria-hidden="true"><img src="${esc(a.icone)}" alt="" width="64" height="64" loading="lazy" decoding="async"></span>` +
    `<span class="apk-txt"><span class="apk-tag">${esc(a.tag)}</span><strong>${esc(a.nome)}</strong>` +
    `<span class="apk-desc">${esc(a.texto)}</span><span class="apk-cta">Baixar no Google Play <b aria-hidden="true">→</b></span></span></a></li>`;

  // Se o ícone não existir (ou falhar), mostra a inicial do nome no lugar
  function iconeReserva(img) {
    const ico = img.parentNode;
    if (!ico || ico.classList.contains("sem-img")) return;
    const nome = img.closest("[data-app]").querySelector("strong").textContent.trim();
    ico.classList.add("sem-img");
    ico.textContent = nome.charAt(0).toUpperCase();
  }

  function montar() {
    if (document.getElementById("apk-bloco") || ehIOS() || EXCLUIR.test(location.pathname)) return;
    const rodape = document.querySelector(".corp-footer");
    if (!rodape || !rodape.parentNode) return;

    if (!document.getElementById("apk-css")) {
      const st = document.createElement("style");
      st.id = "apk-css"; st.textContent = CSS;
      document.head.appendChild(st);
    }
    const sec = document.createElement("section");
    sec.id = "apk-bloco"; sec.className = "apk-bloco";
    sec.setAttribute("aria-labelledby", "apk-t");
    sec.innerHTML = `<h2 id="apk-t">📱 Também no celular</h2><p class="apk-sub">Confira nossos jogos para Android.</p>` +
      `<ul class="apk-lista">${APPS.map(card).join("")}</ul>`;
    rodape.parentNode.insertBefore(sec, document.getElementById("pm-banner") || rodape);

    sec.querySelectorAll("img").forEach(img => {
      img.addEventListener("error", () => iconeReserva(img));
      if (img.complete && img.naturalWidth === 0) iconeReserva(img);
    });
    sec.addEventListener("click", e => {
      const a = e.target.closest("[data-app]");
      if (!a) return;
      if (typeof gtag === "function") gtag("event", "click_app_android", { app_id: a.dataset.app, pagina: pagina() });
      if (typeof clarity === "function") clarity("event", "app_android");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();
})();