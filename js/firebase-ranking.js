// O ranking só recebe dados de quem fez login (Firebase Auth).
// Quem joga sem login continua jogando normalmente: tudo fica salvo apenas no aparelho.

function contaAtual() {
    return (window.firebase && firebase.auth) ? firebase.auth().currentUser : null;
}

window.enviarPontuacaoFirebase = function (xp) {

    const conta = contaAtual();
    if (!conta) return; // sem login, sem ranking

    const usuario = JSON.parse(localStorage.getItem("usuario"));
    if (!usuario) return;

    db.ref("ranking/" + conta.uid).update({
        nome: usuario.nome,
        avatar: usuario.avatar,
        xp: xp,
        atualizado: Date.now()
    });

};

window.sincronizarUsuarioFirebase = function () {

    const conta = contaAtual();
    if (!conta) return;

    const usuario = JSON.parse(localStorage.getItem("usuario"));
    if (!usuario) return;

    db.ref("ranking/" + conta.uid).update({
        nome: usuario.nome,
        avatar: usuario.avatar,
        atualizado: Date.now()
    });

};

// A sincronização da conta (nome, avatar, XP) acontece em auth.js assim que o login é confirmado.
window.carregarUsuarioFirebase = function () {

    if (contaAtual() && typeof sincronizarConta === "function") {
        sincronizarConta(contaAtual());
    }

};
