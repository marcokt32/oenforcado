const STORAGE_KEY = 'pontuacoesJogoForca';

function criarEstruturaPadrao() {
    return {
        casual: {
            categorias: {}
        },
        desafio: {
            categorias: {}
        },
        misto: {
            casual: { pontos: 0, hiscore: 0 },
            desafio: { pontos: 0, hiscore: 0 }
        },
        ranking: {
            xp: 0,
            palavras: 0
        }
    };
}

function carregarPontuacoes() {
    const dadosSalvos = localStorage.getItem(STORAGE_KEY);

    if (!dadosSalvos) {
        return criarEstruturaPadrao();
    }

    try {
        const dados = JSON.parse(dadosSalvos);

        return {
            ...criarEstruturaPadrao(),
            ...dados
        };

    } catch (erro) {
        return criarEstruturaPadrao();
    }
}

function calcularPontuacao() {
    if (!categoriaAtual) return;

    const estrelasAtivas = document.querySelectorAll('.estrela.ativa').length;
    const multiplicadorCombo = medidorCombo > 0 ? medidorCombo : 1;
    const basePontos = modoAtual === "desafio" ? 15 : 10;
    const pontosGanhos = basePontos * estrelasAtivas * multiplicadorCombo;

    if (pontosGanhos === 0) return;

    const resultado = salvarPontuacoes({
        modoAtual,
        modoMisto,
        categoriaAtual,
        pontosGanhos
    });

    animarPontuacao(
        resultado.valorInicial,
        resultado.valorFinal,
        resultado.hiscoreAtual,
        resultado.xpInicial,
        resultado.xpFinal
    );

    if (!resultado) return;
}

function salvarPontuacoes({ modoAtual, modoMisto, categoriaAtual, pontosGanhos }) {

    if (!modoAtual) return; // finaliza se modoAtual for vazio

    const dados = carregarPontuacoes(); // carrega a estrutura de pontuações e atribui a dados
    let estruturaAtual;
    let estruturaGlobal;

    estruturaGlobal = dados.ranking

    // MODO POR CATEGORIA
    if (!modoMisto) { //SE modoMisto fo FALSE

        if (!dados[modoAtual].categorias[categoriaAtual]) {
            dados[modoAtual].categorias[categoriaAtual] = {
                pontos: 0,
                hiscore: 0
            };
        }

        estruturaAtual = dados[modoAtual].categorias[categoriaAtual];
    }

    // 🎲 MODO MISTO
    else {
        estruturaAtual = dados.misto[modoAtual];
    }

    if (!estruturaAtual && !estruturaGlobal) return;

    const valorInicial = estruturaAtual.pontos;
    const valorFinal = valorInicial + pontosGanhos;
    const xpInicial = estruturaGlobal.xp;
    const xpFinal = xpInicial + pontosGanhos;

    estruturaAtual.pontos = valorFinal;
    estruturaGlobal.xp = xpFinal;

    if (valorFinal > estruturaAtual.hiscore) {
        estruturaAtual.hiscore = valorFinal;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    if (typeof enviarPontuacaoFirebase === "function" && pontosGanhos > 0) {
        enviarPontuacaoFirebase(xpFinal);
    }

    return {
        valorInicial,
        valorFinal,
        hiscoreAtual: estruturaAtual.hiscore,
        xpInicial,
        xpFinal
    };
}

function animarPontuacao(valorInicial, valorFinal, hiscoreAtual, xpInicial, xpFinal) {

    const display = document.querySelector('.display-pontuacao');
    const xpDisplay = document.getElementById("xp");

    const inicio = performance.now();
    const duracao = 600;

    function animar(tempoAtual) {

        const progresso = Math.min((tempoAtual - inicio) / duracao, 1);

        const valorAtual = Math.floor(
            valorInicial + (valorFinal - valorInicial) * progresso
        );

        const xpAtual = Math.floor(
            xpInicial + (xpFinal - xpInicial) * progresso
        );

        display.textContent =
            `Pontos: ${valorAtual} | Recorde: ${hiscoreAtual}`;

        xpDisplay.textContent =
            `XP: ${xpAtual}`;

        if (progresso < 1) {
            requestAnimationFrame(animar);
        }
    }

    requestAnimationFrame(animar);
}

function mostrarPontuacaoAtual() {

    const display = document.querySelector('.display-pontuacao');
    const xpDisplay = document.getElementById('xp');
    const dados = carregarPontuacoes();

    let estruturaAtual;
    let global;

    // 🎯 Modo por categoria
    if (!modoMisto) {

        estruturaAtual =
            dados[modoAtual]?.categorias[categoriaAtual] || {
                pontos: 0,
                hiscore: 0
            };
    }

    // 🎲 Modo misto
    else {
        estruturaAtual =
            dados.misto?.[modoAtual] || {
                pontos: 0,
                hiscore: 0
            };
    }

    global = dados.ranking

    display.textContent =
        `Pontos: ${estruturaAtual.pontos} | Recorde: ${estruturaAtual.hiscore}`;
    xpDisplay.textContent =
        `XP: ${global.xp}`;

}

function zeraPontuacao() {
    const dados = carregarPontuacoes();

    // 🔹 Casual por categoria
    for (const categoria in dados.casual.categorias) {
        dados.casual.categorias[categoria].pontos = 0;
    }

    // 🔹 Desafio por categoria
    for (const categoria in dados.desafio.categorias) {
        dados.desafio.categorias[categoria].pontos = 0;
    }

    // 🔹 Modo misto casual
    if (dados.misto.casual) {
        dados.misto.casual.pontos = 0;
    }

    // 🔹 Modo misto desafio
    if (dados.misto.desafio) {
        dados.misto.desafio.pontos = 0;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}