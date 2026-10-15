document.addEventListener("DOMContentLoaded", () => {
    iniciarUsuario();
    renderizarUsuario();
});

let usuarioEnviado = false;
let usuarioAtual = null;

function iniciarUsuario() {

    let usuario = JSON.parse(localStorage.getItem("usuario"));

    // cria usuário se não existir
    if (!usuario) {

        usuario = {
            id: crypto.randomUUID(),
            nome: gerarNomeUsuario(),
            avatar: gerarAvatar()
        };

        localStorage.setItem("usuario", JSON.stringify(usuario));
    }

    // garante que o ID exista (caso venha de versão antiga)
    if (!usuario.id) {
        usuario.id = crypto.randomUUID();
        localStorage.setItem("usuario", JSON.stringify(usuario));
    }

    /*/ 🔥 sincroniza com firebase
    if (typeof carregarUsuarioFirebase === "function") {
        carregarUsuarioFirebase();
    }*/

    return usuario;
}

function enviarUsuarioFirebase() {
    if (usuarioEnviado) return; // evita duplicados
    if (typeof carregarUsuarioFirebase === "function") {
        carregarUsuarioFirebase(); // aqui o envio pro Firebase acontece
        usuarioEnviado = true;
    }
}

function gerarNomeUsuario() {

    const numero = Math.floor(Math.random() * 9000) + 1000;
    return `Jogador_${numero}`;

}

function gerarAvatar() {

    const totalAvatares = 6;

    const numero = Math.floor(Math.random() * totalAvatares) + 1;

    return `img/avatars/avatar${numero}.png`;

}

function atualizarNome(nome) {

    let usuario = JSON.parse(localStorage.getItem("usuario"));

    usuario.nome = nome;

    localStorage.setItem("usuario", JSON.stringify(usuario));

}

function atualizarAvatar(avatar) {

    let usuario = JSON.parse(localStorage.getItem("usuario"));

    usuario.avatar = avatar;

    localStorage.setItem("usuario", JSON.stringify(usuario));

}

function renderizarUsuario() {

    const usuario = JSON.parse(localStorage.getItem("usuario"));

    const nome = document.getElementById("userNome");
    const avatar = document.getElementById("userAvatar");

    if (nome) nome.textContent = usuario.nome;
    if (avatar) avatar.src = usuario.avatar;

}

// Abrir modal ao clicar no box do usuário
document.getElementById('userBox').addEventListener('click', abrirEditorUsuario);
document.getElementById('modalAvatar').addEventListener('click', abrirListaAvatar);

function abrirEditorUsuario() {
    const modal = document.getElementById('userModal');
    const usuario = JSON.parse(localStorage.getItem("usuario")) || iniciarUsuario();
    const nome = document.getElementById("input-nome");
    const avatar = document.getElementById("modalAvatar");

    if (nome) nome.placeholder = usuario.nome;
    if (avatar) avatar.src = usuario.avatar;


    if (modal.classList.contains("show")) {
        fecharEditorUsuario();
    } else {
        modal.classList.add("show");
    }
}

function fecharEditorUsuario() {
    document.getElementById('userModal').classList.remove("show");
}

function salvarUsuario() {
    let usuario = JSON.parse(localStorage.getItem("usuario")) || iniciarUsuario();

    const novoNome = document.getElementById('input-nome').value.trim();
    const novoAvatar = document.getElementById('modalAvatar').value;

    if (novoNome) usuario.nome = novoNome;
    if (novoAvatar) usuario.avatar = novoAvatar;

    localStorage.setItem("usuario", JSON.stringify(usuario));

    // Atualiza header
    document.getElementById('userAvatar').src = usuario.avatar;
    document.getElementById('userNome').textContent = usuario.nome;

    // 🔥 envia atualização para firebase
    if (typeof sincronizarUsuarioFirebase === "function") {
        sincronizarUsuarioFirebase();
    }

    fecharEditorUsuario();
}

// Inicializar display ao carregar página
document.addEventListener('DOMContentLoaded', () => {
    const usuario = JSON.parse(localStorage.getItem("usuario")) || iniciarUsuario();
    document.getElementById('userAvatar').src = usuario.avatar;
    document.getElementById('userNome').textContent = usuario.nome;

});