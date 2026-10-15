// Login opcional (Google / Facebook) via Firebase Auth.
// Regra do portal: jogar não exige login; o login só é pedido para entrar no ranking.

const auth = firebase.auth();
auth.languageCode = "pt";

function escaparHTML(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function criarProvedor(nome) {
    if (nome === "facebook") {
        const p = new firebase.auth.FacebookAuthProvider();
        p.addScope("public_profile");
        return p;
    }
    return new firebase.auth.GoogleAuthProvider();
}

function mostrarMensagemAuth(texto) {
    document.querySelectorAll(".auth-msg").forEach(el => { el.textContent = texto || ""; });
}

function definirBotoesAuthOcupados(ocupado) {
    document.querySelectorAll("[data-login]").forEach(b => { b.disabled = ocupado; });
}

async function entrarComProvedor(nome) {
    const provedor = criarProvedor(nome);
    mostrarMensagemAuth("");
    definirBotoesAuthOcupados(true);

    try {
        await auth.signInWithPopup(provedor);
        if (typeof gtag === "function") gtag("event", "login", { method: nome });

    } catch (erro) {
        switch (erro.code) {
            case "auth/popup-closed-by-user":
            case "auth/cancelled-popup-request":
                break; // usuário desistiu, sem alarde

            // navegadores embutidos (Instagram, Facebook, etc.) costumam bloquear popup
            case "auth/popup-blocked":
            case "auth/operation-not-supported-in-this-environment":
                mostrarMensagemAuth("Abrindo a tela de login...");
                try { await auth.signInWithRedirect(provedor); return; } catch (e) { /* cai na mensagem genérica */ }
                mostrarMensagemAuth("Não foi possível abrir o login neste navegador. Tente abrir o site no Chrome ou Safari.");
                break;

            case "auth/account-exists-with-different-credential":
                mostrarMensagemAuth("Este e-mail já foi usado com outro método de login. Tente entrar com " +
                    (nome === "facebook" ? "o Google." : "o Facebook."));
                break;

            case "auth/network-request-failed":
                mostrarMensagemAuth("Sem conexão. Verifique sua internet e tente de novo.");
                break;

            case "auth/unauthorized-domain":
                mostrarMensagemAuth("Domínio não autorizado no Firebase (Authentication > Settings > Authorized domains).");
                break;

            case "auth/operation-not-allowed":
                mostrarMensagemAuth("Este método de login ainda não foi ativado no Firebase.");
                break;

            default:
                console.error("Erro no login:", erro);
                mostrarMensagemAuth("Não foi possível entrar agora. Tente novamente.");
        }
    } finally {
        definirBotoesAuthOcupados(false);
    }
}

async function sairDaConta() {
    await auth.signOut();

    // o XP pertence à conta: ao sair, o aparelho volta a ser um jogador anônimo novo
    const usuario = JSON.parse(localStorage.getItem("usuario")) || {};
    usuario.id = crypto.randomUUID();
    usuario.nome = gerarNomeUsuario();
    localStorage.setItem("usuario", JSON.stringify(usuario));

    const dados = carregarPontuacoes();
    dados.ranking.xp = 0;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));

    const xpEl = document.getElementById("xp");
    if (xpEl) xpEl.textContent = "XP: 0";

    renderizarUsuario();
    atualizarBlocosAuth();
    atualizarRankingSeAberto();
}

// Ao logar: junta o XP já ganho neste aparelho com o da conta e cria/atualiza a entrada no ranking.
async function sincronizarConta(conta) {
    const usuario = JSON.parse(localStorage.getItem("usuario")) || iniciarUsuario();
    const ref = db.ref("ranking/" + conta.uid);
    const remoto = (await ref.once("value")).val();

    const dados = carregarPontuacoes();
    const xp = Math.max(dados.ranking.xp || 0, remoto?.xp || 0);
    dados.ranking.xp = xp;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));

    usuario.id = conta.uid;
    if (remoto) {
        usuario.nome = remoto.nome || usuario.nome;
        usuario.avatar = remoto.avatar || usuario.avatar;
    } else if (/^Jogador_\d+$/.test(usuario.nome) && conta.displayName) {
        usuario.nome = conta.displayName.split(" ")[0].slice(0, 20);
    }
    localStorage.setItem("usuario", JSON.stringify(usuario));

    const mudou = !remoto || remoto.xp !== xp || remoto.nome !== usuario.nome || remoto.avatar !== usuario.avatar;
    if (mudou) {
        await ref.update({ nome: usuario.nome, avatar: usuario.avatar, xp: xp, atualizado: Date.now() });
    }

    const xpEl = document.getElementById("xp");
    if (xpEl) xpEl.textContent = "XP: " + xp;
    renderizarUsuario();
}

// Preenche todo elemento [data-bloco-auth] conforme o estado de login.
// Variantes: "ranking" (dentro do modal de ranking) e "compacto" (popup de fim de jogo).
function atualizarBlocosAuth() {
    const conta = auth.currentUser;
    const usuario = JSON.parse(localStorage.getItem("usuario")) || {};

    document.querySelectorAll("[data-bloco-auth]").forEach(el => {
        const variante = el.dataset.blocoAuth;

        if (conta && variante === "ranking") {
            el.innerHTML = `
                <p class="auth-ok">✅ Conectado como <strong>${escaparHTML(usuario.nome)}</strong></p>
                <button type="button" class="auth-link" data-logout>Sair da conta</button>`;
        } else if (conta) {
            el.innerHTML = `
                <p class="auth-ok">✅ Você está no ranking como <strong>${escaparHTML(usuario.nome)}</strong></p>
                <button type="button" class="btn-auth btn-auth-ranking" data-abrir-ranking>🏆 Ver ranking</button>`;
        } else {
            el.innerHTML = `
                <p class="auth-chamada">🏆 Quer entrar no ranking global?</p>
                <p class="auth-sub">Entre para salvar seu XP e competir com outros jogadores.</p>
                <div class="auth-botoes">
                    <button type="button" class="btn-auth btn-auth-google" data-login="google"><span class="auth-ico">G</span> Continuar com Google</button>
                    <button type="button" class="btn-auth btn-auth-facebook" data-login="facebook"><span class="auth-ico">f</span> Continuar com Facebook</button>
                </div>
                <p class="auth-msg" role="status" aria-live="polite"></p>`;
        }
    });
}

function atualizarRankingSeAberto() {
    const modal = document.getElementById("modalRanking");
    if (modal && !modal.classList.contains("oculto")) carregarRanking();
}

document.addEventListener("click", e => {
    const login = e.target.closest("[data-login]");
    if (login) { entrarComProvedor(login.dataset.login); return; }

    if (e.target.closest("[data-logout]")) { sairDaConta(); return; }

    if (e.target.closest("[data-abrir-ranking]")) { abrirRanking(); }
});

auth.onAuthStateChanged(async conta => {
    if (conta) {
        try { await sincronizarConta(conta); }
        catch (erro) { console.error("Erro ao sincronizar conta:", erro); }
    }
    atualizarBlocosAuth();
    atualizarRankingSeAberto();
});

document.addEventListener("DOMContentLoaded", atualizarBlocosAuth);
