// Popup de fim de jogo: placar + compartilhamento + convite para entrar no ranking.

const URL_COMPARTILHAR = "https://oenforcado.com/forca.html";

function nomeCategoriaAmigavel(categoria, modo) {
    if (modo === "misto") return "Modo Misto";
    if (!categoria) return "";
    return categoria.charAt(0).toUpperCase() + categoria.slice(1);
}

function montarFimDeJogoHTML({ pontos, recorde, categoria, modo }) {
    window.__ultimoResultado = { pontos, categoria, modo };

    const novoRecorde = pontos > 0 && pontos >= recorde;
    const nativo = typeof navigator.share === "function";

    const botoesShare = nativo
        ? `<button type="button" class="btn-share btn-share-nativo" data-share="nativo">📤 Compartilhar com amigos</button>
           <button type="button" class="btn-share btn-share-copiar" data-share="copiar">🔗 Copiar link</button>`
        : `<button type="button" class="btn-share btn-share-whatsapp" data-share="whatsapp">WhatsApp</button>
           <button type="button" class="btn-share btn-share-facebook" data-share="facebook">Facebook</button>
           <button type="button" class="btn-share btn-share-x" data-share="x">X</button>
           <button type="button" class="btn-share btn-share-telegram" data-share="telegram">Telegram</button>
           <button type="button" class="btn-share btn-share-copiar" data-share="copiar">🔗 Copiar link</button>`;

    return `
    <h2>Fim de jogo 😢</h2>
    <p>Sua pontuação: ${pontos}</p>
    ${novoRecorde ? '<p class="fim-recorde">🎉 Novo recorde!</p>' : ''}

    <div class="share-box">
        <p class="share-titulo">Desafie seus amigos a te superar!</p>
        <div class="share-botoes">${botoesShare}</div>
    </div>

    <div class="auth-bloco" data-bloco-auth="compacto"></div>

    <button onclick="reiniciar()">Jogar novamente</button>
    <a href="#categorias">
        <button class="botao" onclick="renderizarCategorias()">Ver categorias</button>
    </a>`;
}

function textoCompartilhamento() {
    const r = window.__ultimoResultado || {};
    const categoria = nomeCategoriaAmigavel(r.categoria, r.modo);

    if (r.pontos > 0) {
        return `Fiz ${r.pontos} pontos no Jogo da Forca${categoria ? " (" + categoria + ")" : ""} no O Enforcado! 🎯 Será que você consegue me superar?`;
    }
    return "Vem jogar Forca comigo no O Enforcado! 🎯 Será que você acerta mais palavras que eu?";
}

function urlCompartilhar(canal) {
    return `${URL_COMPARTILHAR}?utm_source=compartilhar&utm_medium=${canal}`;
}

async function compartilhar(canal, botao) {
    const texto = textoCompartilhamento();
    const url = urlCompartilhar(canal);
    const t = encodeURIComponent(texto);
    const u = encodeURIComponent(url);

    if (typeof gtag === "function") gtag("event", "share", { method: canal, content_type: "game_result" });

    const abrir = link => window.open(link, "_blank", "noopener,noreferrer");

    switch (canal) {
        case "nativo":
            try { await navigator.share({ title: "O Enforcado", text: texto, url }); }
            catch (e) { /* usuário cancelou */ }
            break;
        case "whatsapp": abrir(`https://wa.me/?text=${encodeURIComponent(texto + " " + url)}`); break;
        case "facebook": abrir(`https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`); break;
        case "x": abrir(`https://twitter.com/intent/tweet?text=${t}&url=${u}`); break;
        case "telegram": abrir(`https://t.me/share/url?url=${u}&text=${t}`); break;
        case "copiar":
            try {
                await navigator.clipboard.writeText(`${texto} ${url}`);
                if (botao) {
                    const original = botao.textContent;
                    botao.textContent = "✅ Link copiado!";
                    setTimeout(() => { botao.textContent = original; }, 2000);
                }
            } catch (e) {
                window.prompt("Copie o link abaixo:", `${texto} ${url}`);
            }
            break;
    }
}

document.addEventListener("click", e => {
    const botao = e.target.closest("[data-share]");
    if (botao) compartilhar(botao.dataset.share, botao);
});
