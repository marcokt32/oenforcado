// O Enforcado News: gera o HTML das matérias a partir de conteudo/*.md
// Uso (na pasta oenforcado, ao lado da pasta docs):  node gerar.js
// Sem dependências: só o Node.js.
const fs = require("fs"), path = require("path");

const SITE = "https://oenforcado.com", AUTOR = "Marco Quintela";
const ORIGEM = path.join(__dirname, "conteudo");
const DESTINO = path.join(__dirname, "docs", "noticias");

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dataBR = d => new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z")).replace(/\./g, "");
const jsonLd = o => JSON.stringify(o).replace(/</g, "\\u003c");

/* ---------- Leitura do arquivo .md ---------- */
function ler(arquivo) {
  const bruto = fs.readFileSync(path.join(ORIGEM, arquivo), "utf8").replace(/\r\n/g, "\n");
  const m = bruto.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(arquivo + ": falta o bloco de dados entre --- no começo do arquivo.");
  const meta = { fontes: [] };
  let chave = null;
  for (const linha of m[1].split("\n")) {
    const item = linha.match(/^\s+-\s+(.*)$/);
    if (item && chave === "fontes") { const [nome, url] = item[1].split("|").map(s => s.trim()); if (nome && url) meta.fontes.push({ nome, url }); continue; }
    const kv = linha.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) { chave = kv[1]; if (kv[1] !== "fontes") meta[chave] = kv[2].trim(); }
  }
  const nome = arquivo.replace(/\.md$/, "");
  const dm = nome.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  meta.slug = (meta.slug || (dm ? dm[2] : nome)).toLowerCase();
  meta.data = meta.data || (dm ? dm[1] : "");
  meta.atualizado = meta.atualizado || meta.data;
  meta.corpo = m[2].trim();
  for (const k of ["titulo", "resumo", "categoria", "data"]) if (!meta[k]) throw new Error(arquivo + ': falta o campo "' + k + '".');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.data)) throw new Error(arquivo + ": a data deve ser AAAA-MM-DD.");
  return meta;
}

/* ---------- Markdown simples: ## título, listas com -, **negrito**, *itálico*, [texto](link) ---------- */
function inline(t) {
  return esc(t)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener nofollow">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
function blocos(texto) {
  return texto.split(/\n{2,}/).map(b => {
    b = b.trim();
    if (!b) return "";
    const h = b.match(/^##\s+(.*)$/);
    if (h) return { h2: h[1] };
    if (/^-\s/.test(b)) return "<ul>" + b.split("\n").map(l => "<li>" + inline(l.replace(/^-\s+/, "")) + "</li>").join("") + "</ul>";
    return "<p>" + inline(b.replace(/\n/g, " ")) + "</p>";
  }).filter(Boolean);
}
function corpoHTML(texto) {
  let html = "", caixa = false, esperandoTitulo = false;
  const fechar = () => {
    if (caixa) {
      html += "</div>";
      caixa = false;
      esperandoTitulo = false;
    }
  };

  for (const b of blocos(texto)) {
    if (typeof b === "string") {
      if (esperandoTitulo) {
        // Remove as tags <p> ou <ul> geradas pela função blocos() e usa o texto como <h2>
        const tituloLimpo = b.replace(/^<(?:p|ul|li)>|<\/(?:p|ul|li)>$/g, "");
        html += "<h2>" + tituloLimpo + "</h2>";
        esperandoTitulo = false;
      } else {
        html += b;
      }
      continue;
    }

    fechar();

    if (/^por que importa$/i.test(b.h2.trim())) {
      html += '<div class="nw-importa">';
      caixa = true;
      esperandoTitulo = true;
    } else {
      html += "<h2>" + esc(b.h2) + "</h2>";
    }
  }

  fechar();
  return html;
}
const minutos = texto => Math.max(1, Math.round(texto.split(/\s+/).length / 200));

/* ---------- Peças comuns de página (igual às páginas do site) ---------- */
const HEAD = `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="/js/tema.js?v=1.0.1"></script>
  <meta name="theme-color" content="#0a2540">
  <script src="/js/consent.js?v=1.0.3"></script>`;
const CSS = `<link rel="manifest" href="/manifest.json">
  <link rel="icon" href="/img/hung.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Inter:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/site-theme.css?v=1.0.0">
  <link rel="stylesheet" href="/css/termo.css?v=1.0.2">
  <link rel="stylesheet" href="/css/portal-shell.css?v=1.1.0">
  <link rel="stylesheet" href="/css/footer.css?v=1.0.3">
  <link rel="stylesheet" href="/css/menu.css?v=1.0.2">
  <link rel="stylesheet" href="/css/candy.css?v=1.1.0">
  <link rel="stylesheet" href="/css/tema.css?v=1.0.1">
  <link rel="stylesheet" href="/css/noticias.css?v=1.0.2">`;
const HEADER = `<header class="site-header">
    <a class="brand" href="/" aria-label="O Enforcado - página inicial"><img src="/img/hung.png" alt="" width="42" height="42"><span>O Enforcado</span></a>
    <nav aria-label="Navegação principal"></nav>
  </header>`;
const FOOTER = `<footer class="corp-footer">
    <div class="corp-wrap">
      <div class="corp-col corp-brand">
        <a class="corp-logo" href="/">O Enforcado</a>
        <p>Jogos de palavras e de lógica gratuitos, com desafio do dia e ranking, e o O Enforcado News, notícias rápidas com fontes citadas.</p>
      </div>
      <nav class="corp-col" aria-label="Jogos">
        <h3>Jogos</h3>
        <a href="/forca.html">Jogo da forca</a><a href="/termo.html">Termo</a><a href="/caca-palavras.html">Caça-palavras</a><a href="/anagrama.html">Anagrama</a><a href="/kyudoku.html">Kyudoku</a><a href="/logica-grega.html">Lógica grega</a><a href="/damas.html">Damas</a><a href="/campo-minado.html">Campo minado</a><a href="/memoria.html">Jogo da memória</a><a href="/deslizante.html">Quebra-cabeça deslizante</a>
      </nav>
      <nav class="corp-col" aria-label="Institucional">
        <h3>Institucional</h3>
        <a href="/noticias/">Notícias</a><a href="/politica-editorial.html">Política editorial</a><a href="/sobre.html">Sobre o projeto</a><a href="/sobre.html#quem-criou">Quem criou o site</a><a href="mailto:contato@marsdev.com.br">Contato</a><a href="/politica.html">Política de Privacidade</a><a href="/termos.html">Termos de Uso</a>
      </nav>
    </div>
    <div class="corp-bottom">
      <span>© 2026 O Enforcado. Todos os direitos reservados.</span>
      <span>Desenvolvido por <a href="https://marsdev.com.br" target="_blank" rel="noopener">MarsDev</a> - Marco Quintela</span>
    </div>
  </footer>`;
const SCRIPTS = `<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js"></script>
  <script src="/js/firebase-init.js"></script>
  <script src="/js/portal.js?v=1.0.21"></script>
  <script src="/js/menu.js?v=1.0.6"></script>`;

const urlMateria = n => SITE + "/noticias/" + n.slug + ".html";
const imagemMateria = n => n.imagem ? SITE + "/img/noticias/" + n.imagem : SITE + "/img/og-image.png";

/* ---------- Página de uma matéria ---------- */
function paginaMateria(n) {
  const url = urlMateria(n), img = imagemMateria(n);
  const desc = n.resumo.length > 155 ? n.resumo.slice(0, 152) + "..." : n.resumo;
  const fontes = n.fontes.length
    ? `<div class="nw-fontes"><h2>Fontes</h2><ul>${n.fontes.map(f => `<li><a href="${esc(f.url)}" rel="noopener nofollow" target="_blank">${esc(f.nome)}</a></li>`).join("")}</ul><p>Encontrou um erro? Escreva para <a href="mailto:contato@marsdev.com.br">contato@marsdev.com.br</a> e corrigimos. Veja como funciona na <a href="/politica-editorial.html#correcoes">política editorial</a>.</p></div>` : "";
  const correcao = n.correcao ? `<div class="nw-correcao"><strong>Correção${n.atualizado ? " em " + dataBR(n.atualizado) : ""}:</strong> ${esc(n.correcao)}</div>` : "";
  const figura = n.imagem ? `<figure class="nw-fig"><img class="nw-img" src="/img/noticias/${esc(n.imagem)}" alt="${esc(n.imagem_alt || n.titulo)}" width="1200" height="630">${n.credito ? `<figcaption>${esc(n.credito)}</figcaption>` : ""}</figure>` : "";
  const ld = [{
    "@context": "https://schema.org", "@type": "NewsArticle", headline: n.titulo, description: desc, image: [img],
    datePublished: n.data + "T09:00:00-03:00", dateModified: n.atualizado + "T09:00:00-03:00", inLanguage: "pt-BR", mainEntityOfPage: url,
    author: { "@type": "Person", name: AUTOR, url: SITE + "/sobre.html#quem-criou" },
    publisher: { "@type": "Organization", name: "O Enforcado", url: SITE + "/", logo: { "@type": "ImageObject", url: SITE + "/icons/icon-512.png" } }
  }, {
    "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Notícias", item: SITE + "/noticias/" },
      { "@type": "ListItem", position: 3, name: n.titulo, item: url }]
  }];
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${HEAD}
  <title>${esc(n.titulo)} | O Enforcado News</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="O Enforcado">
  <meta property="og:title" content="${esc(n.titulo)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${img}">
  <meta property="article:published_time" content="${n.data}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="${url}">
  ${ld.map(o => `<script type="application/ld+json">${jsonLd(o)}</script>`).join("\n  ")}
  ${CSS}
</head>
<body>
  ${HEADER}
  <main class="nw-main">
    <article class="nw-art">
      <p class="nw-trilha"><a href="/">Início</a> / <a href="/noticias/">Notícias</a> / ${esc(n.categoria)}</p>
      <h1>${esc(n.titulo)}</h1>
      <p class="nw-meta">Por <a href="/sobre.html#quem-criou">${AUTOR}</a> · Publicado em <time datetime="${n.data}">${dataBR(n.data)}</time>${n.atualizado !== n.data ? ` · Atualizado em <time datetime="${n.atualizado}">${dataBR(n.atualizado)}</time>` : ""} · ${minutos(n.corpo)} min de leitura</p>
      ${figura}
      <div class="nw-30s"><strong>Em 30 segundos</strong>${esc(n.resumo)}</div>
      ${corpoHTML(n.corpo)}
      ${correcao}
      ${fontes}
      <div class="nw-jogo"><p>Dê uma pausa: o desafio do dia está esperando.</p><a class="button button-primary" href="/forca.html?desafio=dia">Jogar agora</a></div>
    </article>
  </main>
  ${FOOTER}
  ${SCRIPTS}
</body>
</html>
`;
}

/* ---------- Página /noticias/ (lista + resumo do dia) ---------- */
function paginaLista(notas) {
  const url = SITE + "/noticias/";
  const diaNovo = notas.length ? notas[0].data : "";
  const resumo = notas.filter(n => n.data === diaNovo).slice(0, 5);
  const resumoHTML = resumo.length ? `<section class="nw-resumo" aria-labelledby="resumo-t">
      <h2 id="resumo-t">Resumo do dia</h2>
      <p>${resumo.length} ${resumo.length === 1 ? "notícia" : "notícias"} em um minuto. Atualizado em ${dataBR(diaNovo)}.</p>
      <ol>${resumo.map(n => `<li><a href="/noticias/${n.slug}.html">${esc(n.titulo)}</a></li>`).join("")}</ol>
    </section>` : "";
  const cards = notas.map((n, i) => `<li>
        <a class="nw-card${i === 0 ? " destaque" : ""}" href="/noticias/${n.slug}.html">
          <span class="nw-cat">${esc(n.categoria)}</span>
          <${i === 0 ? "h2" : "h3"}>${esc(n.titulo)}</${i === 0 ? "h2" : "h3"}>
          <p>${esc(n.resumo)}</p>
          <span class="nw-meta">Por ${AUTOR} · ${dataBR(n.data)} · ${minutos(n.corpo)} min de leitura</span>
        </a>
      </li>`).join("\n      ");
  const vazio = `<p class="nw-vazio">As primeiras notícias chegam em breve. Enquanto isso, que tal um desafio do dia?</p>`;
  const ld = { "@context": "https://schema.org", "@type": "CollectionPage", name: "O Enforcado News", url, inLanguage: "pt-BR", description: "Notícias do dia resumidas, com análise própria e fontes citadas.", publisher: { "@type": "Organization", name: "O Enforcado", url: SITE + "/" } };
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${HEAD}
  <title>O Enforcado News: notícias rápidas com fontes | O Enforcado</title>
  <meta name="description" content="Notícias do dia resumidas em poucas linhas, com análise própria e fontes citadas. Games, tecnologia e curiosidades no O Enforcado News.">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="O Enforcado">
  <meta property="og:title" content="O Enforcado News: notícias rápidas com fontes">
  <meta property="og:description" content="Notícias do dia resumidas em poucas linhas, com análise própria e fontes citadas.">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/img/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="${url}">
  <link rel="alternate" type="application/rss+xml" title="O Enforcado News" href="/noticias/feed.xml">
  <script type="application/ld+json">${jsonLd(ld)}</script>
  ${CSS}
</head>
<body>
  ${HEADER}
  <main class="nw-main">
    <section class="nw-top">
      <div>
        <h1>O Enforcado News</h1>
        <p>O que aconteceu, por que importa e onde conferir. Resumos curtos com as fontes sempre citadas.</p>
      </div>
      <span class="nw-data" id="nw-data"></span>
    </section>
    ${resumoHTML}
    ${notas.length ? `<ul class="nw-lista">
      ${cards}
    </ul>` : vazio}
    <section class="nw-canais" aria-label="Receba as notícias">
      <div class="nw-box">
        <h2>Receba o resumo no celular</h2>
        <p>Entre com o Google e ative os avisos no menu da sua conta. Você é lembrado quando o resumo do dia sai.</p>
        <button type="button" class="button button-primary" data-pm="login">Entrar com Google</button>
      </div>
      <div class="nw-box">
        <h2>Faça uma pausa jogando</h2>
        <p>Entre no desafio do dia e ganhe XP enquanto espera a próxima notícia.</p>
        <a class="button button-secondary" href="/forca.html?desafio=dia">Jogar o desafio do dia</a>
      </div>
    </section>
  </main>
  ${FOOTER}
  ${SCRIPTS}
  <script>
    (function(){var e=document.getElementById("nw-data");if(e)e.textContent=new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long",timeZone:"America/Sao_Paulo"}).format(new Date())})();
  </script>
</body>
</html>
`;
}

/* ---------- RSS e sitemap ---------- */
function feed(notas) {
  const itens = notas.slice(0, 20).map(n => `    <item>
      <title>${esc(n.titulo)}</title>
      <link>${urlMateria(n)}</link>
      <guid isPermaLink="true">${urlMateria(n)}</guid>
      <pubDate>${new Date(n.data + "T09:00:00-03:00").toUTCString()}</pubDate>
      <category>${esc(n.categoria)}</category>
      <description>${esc(n.resumo)}</description>
    </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>O Enforcado News</title>
    <link>${SITE}/noticias/</link>
    <description>Notícias do dia resumidas, com análise própria e fontes citadas.</description>
    <language>pt-BR</language>
${itens}
  </channel>
</rss>
`;
}
function sitemap(notas) {
  const u = (loc, data) => `  <url><loc>${loc}</loc>${data ? `<lastmod>${data}</lastmod>` : ""}</url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[u(SITE + "/noticias/", notas[0] && notas[0].atualizado), ...notas.map(n => u(urlMateria(n), n.atualizado))].join("\n")}
</urlset>
`;
}

/* ---------- Execução ---------- */
function main() {
  if (!fs.existsSync(ORIGEM)) { console.error('Pasta "conteudo" não encontrada ao lado do gerar.js.'); process.exit(1); }
  if (!fs.existsSync(DESTINO)) fs.mkdirSync(DESTINO, { recursive: true });
  const notas = [];
  let rascunhos = 0, erros = 0;
  for (const arq of fs.readdirSync(ORIGEM).filter(f => f.endsWith(".md"))) {
    try {
      const n = ler(arq);
      if (/^(sim|true)$/i.test(n.rascunho || "")) { rascunhos++; continue; }
      notas.push(n);
    } catch (e) { erros++; console.error("ERRO: " + e.message); }
  }
  if (erros) { console.error("\nCorrija o(s) erro(s) acima e rode de novo. Nada foi gerado."); process.exit(1); }
  notas.sort((a, b) => (b.data + b.slug).localeCompare(a.data + a.slug));
  for (const n of notas) fs.writeFileSync(path.join(DESTINO, n.slug + ".html"), paginaMateria(n));
  fs.writeFileSync(path.join(DESTINO, "index.html"), paginaLista(notas));
  fs.writeFileSync(path.join(DESTINO, "feed.xml"), feed(notas));
  fs.writeFileSync(path.join(DESTINO, "sitemap-noticias.xml"), sitemap(notas));
  console.log("Pronto: " + notas.length + " matéria(s) gerada(s)" + (rascunhos ? ", " + rascunhos + " rascunho(s) ignorado(s)" : "") + ".");
  console.log("Arquivos em: " + DESTINO);
}
main();
