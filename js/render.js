document.addEventListener("DOMContentLoaded", () => {
    renderizarCategorias();
    atualizarContadores();
    iniciarNotificacoes();
});


const categorias = [
    { id: 'portugues', nome: 'Portugues', imagem: 'img/portugues.png' },
    { id: 'matematica', nome: 'Matematica', imagem: 'img/matematica.png' },
    { id: 'historia', nome: 'História', imagem: 'img/historia.png' },
    { id: 'geografia', nome: 'Geografia', imagem: 'img/geografia.png' },
    { id: 'quimica', nome: 'Química', imagem: 'img/quimica.png' },
    { id: 'biologia', nome: 'Biologia', imagem: 'img/biologia.png' },
    { id: 'fisica', nome: 'Física', imagem: 'img/fisica.png' },
    { id: 'cultura', nome: 'Cultura', imagem: 'img/cultura.png' },
    { id: 'cinema', nome: 'Cinema', imagem: 'img/cinema.png' },
    { id: 'musica', nome: 'Musica', imagem: 'img/musica.png' },
    { id: 'games', nome: 'Games', imagem: 'img/games.png' },
    { id: 'esporte', nome: 'Esporte', imagem: 'img/esporte.png' },
    { id: 'literatura', nome: 'Literatura', imagem: 'img/literatura.png' },
    { id: 'politica', nome: 'Politica', imagem: 'img/politica.png' },
    { id: 'tratamento', nome: 'Tratamento de água', imagem: 'img/tratamento.png' },
    { id: 'biblia', nome: 'Bíblia', imagem: 'img/biblia.png' }

];

function atualizarContadores() {
    const totalCategorias = Object.keys(bancoPalavras).length;
    const xpDisplay = document.getElementById('xp')

    let totalPalavras = 0;
    Object.values(bancoPalavras).forEach(lista => {
        totalPalavras += lista.length;
    });

    document.getElementById("contador-categorias").innerText =
        `${totalCategorias} categorias`;

    document.getElementById("contador-palavras").innerText =
        `${totalPalavras} palavras`;

    const dados = carregarPontuacoes();
    const xpTotal = dados.ranking.xp;

    xpDisplay.textContent =
        `XP: ${xpTotal}`;
}

function renderizarCategorias() {
    const overlay = document.getElementById('gameOverScreenOverlay');

    if (overlay) {
        overlay.classList.add("oculto");
    }
    document.getElementById('categorias').style.display = "flex";
    //modoAtual = modo;
    const container = document.querySelector('.grid-container');
    container.innerHTML = '';

    // Renderiza UM ÚNICO card Modo Misto
    const dadosMisto = carregarPontuacoes();
    const cardMisto = document.createElement('div');
    cardMisto.classList.add('card', 'card-misto');
    let hiscoreMistoCasual = 0;
    let hiscoreMistoDesafio = 0;

    hiscoreMistoCasual = dadosMisto.misto.casual.hiscore
    hiscoreMistoDesafio = dadosMisto.misto.desafio.hiscore

    cardMisto.innerHTML = `
        <h2>🔥 Modo Misto</h2>
        <div class="info-misto">
        <p>🎮 ${hiscoreMistoCasual}</p>
        <p>⏱️ ${hiscoreMistoDesafio}</p>
        </div>
        `;

    document.getElementById('fechar-misto')
        .addEventListener('click', () => {
            document.getElementById('modal-misto')
                .classList.add('oculto');
        });
    document.getElementById('check-todas')
        .addEventListener('change', function () {

            const checkboxes = document
                .querySelectorAll('#lista-categorias-misto input');

            checkboxes.forEach(cb => {
                cb.checked = this.checked;
            });

        });
    document.getElementById('iniciar-misto')
        .addEventListener('click', () => {

            const selecionadas = [
                ...document.querySelectorAll(
                    '#lista-categorias-misto input:checked'
                )
            ].map(cb => cb.value);

            if (selecionadas.length === 0) {
                alert("Selecione pelo menos uma categoria.");
                return;
            }

            document.getElementById('modal-misto')
                .classList.add('oculto');
            popUp(selecionadas)
            //iniciarModoMisto(selecionadas)
            //sortearPalavraModoMisto(selecionadas);
        });
    const botaoLimparMisto = document.createElement('button');
    botaoLimparMisto.textContent = "🗑";
    botaoLimparMisto.classList.add('btn-limpar');

    botaoLimparMisto.addEventListener('click', (e) => {
        e.stopPropagation();

        const confirmar = confirm(
            `Deseja limpar TODAS as pontuações do Modo Misto?`
        );

        if (confirmar) {
            limparModoMisto();
            alert("Modo Misto resetado com sucesso!");
        }
    });

    cardMisto.addEventListener('click', abrirModalMisto);
    cardMisto.appendChild(botaoLimparMisto);

    container.appendChild(cardMisto);

    // Renderiza categorias normais
    categorias.forEach(categoria => {

        const dados = obterDadosCategoria(categoria.id);
        const info = document.createElement('div');
        info.classList.add('card-info');

        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.categoria = categoria.id;

        info.innerHTML = `
                <p>🎮<br> ${dados.casual}</p>
                <p>⏱️<br> ${dados.desafio}</p>
                <p>📚<br> ${dados.descobertas}/${dados.totalPalavras}</p>
            `;

        card.addEventListener('click', () =>
            popUp(categoria.id)
            //iniciarJogoCategoria(categoria.id)
        );

        // 🔹 Botão limpar
        const botaoLimpar = document.createElement('button');
        botaoLimpar.textContent = "🗑";
        botaoLimpar.classList.add('btn-limpar');

        botaoLimpar.addEventListener('click', (e) => {
            e.stopPropagation();

            const confirmar = confirm(
                `Deseja limpar as palavras respondidas da categoria "${categoria.nome}"?`
            );

            if (confirmar) {
                limparCategoria(categoria.id);
                alert("Categoria limpa com sucesso!");
            }
        });

        const img = document.createElement('img');
        img.src = categoria.imagem;
        img.classList.add('card-img');

        const titulo = document.createElement('h2');
        titulo.textContent = categoria.nome;

        card.appendChild(img);
        card.appendChild(titulo);
        card.appendChild(info);
        card.appendChild(botaoLimpar);

        container.appendChild(card);
    });

}

function popUp(categoriaId) {
    const popup = document.getElementById('popupModo');
    popup.classList.remove('oculto');

    const botoes = popup.querySelectorAll('button');

    botoes.forEach(btn => {

        // BOTÃO VOLTAR
        if (btn.classList.contains('voltar')) {
            btn.onclick = () => popup.classList.add('oculto');
            return;
        }

        // BOTÕES DE MODO
        btn.onclick = () => popUpModo(btn.value, categoriaId);
    });

}

function popUpModo(btnValue, categoriaId) {
    if (!btnValue || !categoriaId) {
        alert("Modo ou categoria não definidos!");
        return;
    }
    gtag('event', 'game_mode', {
        mode: btnValue,
    });

    const url = `categoria.html?cat=${encodeURIComponent(categoriaId)}&modo=${encodeURIComponent(btnValue)}`;
    console.log("Redirecionando para:", url); // ✅ verifica se os parâmetros estão corretos
    window.location.href = url;
} // redireciona
/*if (Array.isArray(categoriaId)) {
    iniciarModoMisto(categoriaId);
} else {
    iniciarJogoCategoria(categoriaId);
}*/

function obterDadosCategoria(categoriaId) {

    const totalPalavras = bancoPalavras[categoriaId]?.length || 0;
    const descobertas = palavrasRespondidas[categoriaId]?.length || 0;

    const dados = carregarPontuacoes();

    // Busca somente no modo CASUAL por categoria
    const dadosCategoriaCasual = dados.casual.categorias[categoriaId] || {
        pontos: 0,
        hiscore: 0
    };
    const dadosCategoriaDesafio = dados.desafio.categorias[categoriaId] || {
        pontos: 0,
        hiscore: 0
    };

    return {
        totalPalavras,
        descobertas,
        casual: dadosCategoriaCasual.hiscore,
        desafio: dadosCategoriaDesafio.hiscore
    };
}

if ("serviceWorker" in navigator) {

    navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
            console.log("Service Worker registrado");
        })
        .catch(error => {
            console.log("Erro no Service Worker:", error);
        });

}

const modalAvatarBtn = document.getElementById('modalAvatar');
const modalAvatarLista = document.getElementById('modal-avatar-lista');
const avatarGrid = document.getElementById('avatar-grid');
const avatarModal = document.getElementById('avatar-modal');


const totalAvatares = 13; // coloque aqui o número atual de avatares
const avatares = [];

for (let i = 1; i <= totalAvatares; i++) {
    avatares.push(`img/avatars/avatar${i}.png`);
}

// Abrir modal de seleção de avatar
function abrirListaAvatar() {
    renderizarAvatares(); // renderiza toda vez que abrir
    modalAvatarLista.classList.add('show');
    document.getElementById("modal-avatar-overlay")
        .classList.remove("oculto");
}

// Fechar modal de seleção
function fecharListaAvatar() {
    modalAvatarLista.classList.remove('show');
    document.getElementById("modal-avatar-overlay")
        .classList.add("oculto");
}

// Renderiza os avatares no grid
function renderizarAvatares() {
    avatarGrid.innerHTML = ''; // limpa antes
    avatares.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.addEventListener('click', () => selecionarAvatar(src));
        avatarGrid.appendChild(img);
    });
}

// Seleciona avatar, salva no localStorage e atualiza a tela
function selecionarAvatar(src) {
    modalAvatarBtn.src = src;
    let usuario = JSON.parse(localStorage.getItem('usuario'));
    if (!usuario) return;
    usuario.avatar = src;
    localStorage.setItem('usuario', JSON.stringify(usuario));
    fecharListaAvatar();
}

modalAvatarBtn.addEventListener('click', abrirListaAvatar);