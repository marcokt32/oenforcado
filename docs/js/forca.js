let categoriaAtual = "";
let palavraAtualIndex = null;
let errosRestantes = 3;
let medidorCombo = 0;
let estrelasAtivas = document.querySelectorAll('.estrela.ativa').length;
let tempoPadrao = 60
let tempoRestante = 30; // segundos
let intervaloTimer = null;
let modoAtual = null; // "casual" ou "desafio"
let modoMisto = false
let categoriasModoMisto = []

let palavrasRespondidas = JSON.parse(
    localStorage.getItem('palavrasRespondidas')
) || {};

function iniciarJogoCategoria(categoria) {
    console.log(categoria, modoAtual)
    document.querySelector(".pop-up-perdeu").style.display = "none";
    document.querySelector(".pop-up-ganhou").style.display = "none";
    limparJogo()
    resetarCombo()
    if (modoMisto === false) {
        errosRestantes = 3; // 🔥 reseta vidas
    }
    categoriaAtual = categoria;
    atualizarStatusCategoria(categoria);
    zeraPontuacao();
    mostrarPontuacaoAtual();
    atualizarDisplayVidas();

    const sorteada = sortearPalavraCategoria(categoria);

    if (!sorteada) {
        alert("🎉 Você já completou esta categoria!");
        return;
    }

    palavraSecreta = sorteada.palavra;
    dicaAtual = sorteada.dica;

    iniciarJogo();
}

function continuarCategoria(categoria) {
    document.querySelector(".pop-up-perdeu").style.display = "none";
    document.querySelector(".pop-up-ganhou").style.display = "none";
    atualizarStatusCategoria(categoria);
    mostrarPontuacaoAtual();
    atualizarDisplayVidas()

    categoriaAtual = categoria;

    const sorteada = sortearPalavraCategoria(categoria);

    if (!sorteada) {
        alert("🎉 Você já completou esta categoria!");
        return;
    }

    palavraSecreta = sorteada.palavra;
    dicaAtual = sorteada.dica;
    iniciarJogo();
}

function iniciarJogo() {
    enviarUsuarioFirebase();
    gtag('event', 'game_start', {
        category: categoriaAtual,
        word: palavraSecreta
    });
    configurarInterfacePorModo()
    pararTimer()
    clearInterval(intervaloTimer);
    atualizarBarraCombo();
    if (modoAtual === "desafio") {
        iniciarTimer();
    }

    totalLetras = palavraSecreta.replace(/ /g, "").length;
    adicionaTecladoVirtual();

    document.querySelector(".pop-up-perdeu").style.display = "none";
    document.querySelector(".pop-up-ganhou").style.display = "none";
    document.querySelectorAll('.estrela').forEach(e => e.classList.add('ativa'));
    const tutorialEl = document.querySelector(".tutorial");
    if (tutorialEl) tutorialEl.style.display = "none";
    document.querySelector(".area-canvas").style.display = "flex";
    document.querySelector(".botoes-in-game").style.display = "flex";
    document.querySelector(".menu-inicial").style.display = "none";
    document.querySelector(".categorias").style.display = "none";
    document.querySelector(".contadores").style.display = "none";
    document.getElementById("forca").style.display = "flex";
    document.getElementById("botao-reiniciar").style.display = "none";
    document.getElementById("botao-proxima").style.display = "block"
    document.getElementById("canvas-titulo").style.display = "none"

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    // usa os dados já definidos
    document.querySelector(".dica-palavra").textContent = "💡 Dica: " + dicaAtual;

    desenharLinhas();
    if (!window.__forcaKeydownRegistrado) {
        window.__forcaKeydownRegistrado = true;
        document.addEventListener('keydown', (e) => {
            if (fim) return;

            if (!/^[a-zA-Z]$/.test(e.key)) return;

            const letra = e.key.toUpperCase();
            validarJogada(letra);
        });
    }
}

function adicionaTecladoVirtual() {
    document.getElementById("fileira1").innerHTML = "";
    document.getElementById("fileira2").innerHTML = "";
    document.getElementById("fileira3").innerHTML = "";
    let fileira1 = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
    let fileira2 = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
    let fileira3 = ["Z", "X", "C", "V", "B", "N", "M"];

    document.querySelector(".teclado-virtual").style.display = "grid";

    for (i = 0; i < fileira1.length; i++) {
        document.getElementById("fileira1").innerHTML += "<button class='tecla' id='" + fileira1[i] + "' value='" + fileira1[i] + "' onclick='verificarLetraTecladoVirtual(value)'>" + fileira1[i] + "</button>";
    }

    for (i = 0; i < fileira2.length; i++) {
        document.getElementById('fileira2').innerHTML += "<button class='tecla' id='" + fileira2[i] + "' value='" + fileira2[i] + "' onclick='verificarLetraTecladoVirtual(value)'>" + fileira2[i] + "</button>";
    }

    for (i = 0; i < fileira3.length; i++) {
        document.getElementById('fileira3').innerHTML += "<button class='tecla' id='" + fileira3[i] + "' value='" + fileira3[i] + "' onclick='verificarLetraTecladoVirtual(value)'>" + fileira3[i] + "</button>";
    }

}

function verificarLetra(codkey) {
    let estado = false
    if (((codkey >= 97) && (codkey <= 122))) {
        estado = true;
        return estado;

    } else {
        return estado
    }
}

function verificarLetraTecladoVirtual(key) {

    if (fim === false) {
        let letra = key.toLowerCase();
        let codLetra = letra.charCodeAt();

        validarJogada(key, codLetra);
    }
}

function adicionarErro() {
    if (fim === false) {
        erros++;
    }
}

function reiniciar() {
    const overlay = document.getElementById("gameOverScreenOverlay")
    overlay.classList.add("oculto")
    resetarCombo()
    novaRodada()
}

function novaRodada() {
    gtag('event', 'game_progress', {
        result: 'word_solved'
    });
    limparJogo()
    if (errosRestantes > 1) {
        if (document.querySelector(".pop-up-perdeu").style.display === "none"
            && document.querySelector(".pop-up-ganhou").style.display === "none") {
            registrarErro()
            if (modoMisto) {
                const sorteada = sortearCategoria(categoriasModoMisto)
                categoriaAtual = sorteada
            }
            continuarCategoria(categoriaAtual);
        } else {
            if (modoMisto) {
                const sorteada = sortearCategoria(categoriasModoMisto);
                categoriaAtual = sorteada;
            }
            continuarCategoria(categoriaAtual);
        }

    } else
        if (errosRestantes === 1) {
            if (document.querySelector(".pop-up-perdeu").style.display === "none"
                && document.querySelector(".pop-up-ganhou").style.display === "none") {
                alert("Você não pode pular essa!");
            } else {
                if (modoMisto) {
                    const sorteada = sortearCategoria(categoriasModoMisto);
                    categoriaAtual = sorteada;
                }
                continuarCategoria(categoriaAtual);
            }
        } else {
            if (modoMisto) {
                const sorteada = sortearCategoria(categoriasModoMisto);
                categoriaAtual = sorteada;
            }
            zeraPontuacao();
            errosRestantes = 3;
            continuarCategoria(categoriaAtual);
        }

}

function reiniciarPagina() {
    document.getElementById('categorias').style.display = "none"
    resetarCombo();
    limparJogo();
    pararTimer();
    history.replaceState(null, "", window.location.pathname + window.location.search);
    modoAtual = "";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    window.location.href = '/'
}

function validarJogada(letra) {
    if (fim) return;
    if (letrasUsadas.includes(letra)) return;

    letrasUsadas.push(letra);

    let acertou = false;

    for (let i = 0; i < palavraSecreta.length; i++) {
        if (palavraSecreta[i] === " ") continue;

        if (palavraSecreta[i] === letra) {
            escreverLetraCorreta(i, letra);
            acertou = true;
        }
    }

    if (!acertou) {
        erros++;
        escreverLetrasIncorretas(letra, erros);
    }

    verificarVitoria();
}

function verificarVitoria() {
    if (acertos === totalLetras) {
        if (estrelasAtivas === 5) {
            medidorCombo++;

            atualizarBarraCombo();

            console.log("Combo:", medidorCombo);

        } else {
            resetarCombo();
        }
        gtag('event', 'word_discovered', {
            word: palavraSecreta
        });
        fim = true;
        document.querySelector(".pop-up-ganhou").style.display = "flex";
        pararTimer()
        calcularPontuacao()
        confirmarPalavraRespondida();
        atualizarStatusCategoria(categoriaAtual);
    }
}

function limparJogo() {
    fim = false;
    erros = 0;
    acertos = 0;
    letrasUsadas = [];
    palavraSecreta = ""
    dicaAtual = ""
}

function mudarCategoria() {
    renderizarCategorias(modoAtual)
    const categorias = document.getElementById("categorias");

    categorias.style.display = "flex";

    if (categorias) {
        categorias.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

function sortearPalavraCategoria(categoria) {
    if (!palavrasRespondidas[categoria]) {
        palavrasRespondidas[categoria] = [];
    }

    const lista = bancoPalavras[categoria];
    const usadas = palavrasRespondidas[categoria];

    if (usadas.length >= lista.length) {
        return null;
    }

    let indice;
    do {
        indice = Math.floor(Math.random() * lista.length);
    } while (usadas.includes(indice));

    palavraAtualIndex = indice; // guarda temporariamente
    return lista[indice];
}

function sortearPalavraModoMisto(categoriasSelecionadas) {
    categoriasModoMisto = categoriasSelecionadas
    modoMisto = true
    let categoriasDisponiveis = [...categoriasSelecionadas];
    while (categoriasDisponiveis.length > 0) {

        const indiceCategoria = Math.floor(
            Math.random() * categoriasDisponiveis.length
        );

        const categoriaSorteada = categoriasDisponiveis[indiceCategoria];

        // Testa se ainda existe palavra disponível
        const palavraTeste = sortearPalavraCategoria(categoriaSorteada);

        if (palavraTeste !== null) {

            // ⚠️ Importante:
            // precisamos "desfazer" o sorteio teste
            palavrasRespondidas[categoriaSorteada].pop();

            // Agora inicia o jogo oficialmente
            categoriaAtual = categoriaSorteada
            iniciarJogoCategoria(categoriaAtual);
            return;
        }

        // Remove categoria esgotada
        categoriasDisponiveis.splice(indiceCategoria, 1);
    }

    alert("Todas as categorias selecionadas foram concluídas.");
}

function sortearCategoria(categoriasSelecionadas) {
    const indiceCategoria = Math.floor(
        Math.random() * categoriasSelecionadas.length
    );
    return categoriasSelecionadas[indiceCategoria];
}


function atualizarStatusCategoria(categoria) {
    const total = bancoPalavras[categoria].length;
    const feitas = palavrasRespondidas[categoria]?.length || 0;

    const porcentagem = (feitas / total) * 100;

    document.querySelector('.status-nome').textContent =
        categoria.charAt(0).toUpperCase() + categoria.slice(1);

    document.querySelector('.barra-preenchida').style.width =
        `${porcentagem}%`;

    document.querySelector('.status-contador').textContent =
        `${feitas} / ${total}`;
}

function confirmarPalavraRespondida() {
    if (palavraAtualIndex === null) return;

    palavrasRespondidas[categoriaAtual].push(palavraAtualIndex);

    localStorage.setItem(
        'palavrasRespondidas',
        JSON.stringify(palavrasRespondidas)
    );

    palavraAtualIndex = null;
}

function limparCategoria(categoria) {

    // 🔹 Remove palavras respondidas
    if (palavrasRespondidas[categoria]) {
        delete palavrasRespondidas[categoria];
        localStorage.setItem(
            'palavrasRespondidas',
            JSON.stringify(palavrasRespondidas)
        );
    }

    // 🔹 Carrega estrutura nova de pontuação
    const dados = carregarPontuacoes();

    // 🔥 Remove categoria no modo casual
    if (dados.casual?.categorias?.[categoria]) {
        delete dados.casual.categorias[categoria];
    }

    // 🔥 Remove categoria no modo desafio
    if (dados.desafio?.categorias?.[categoria]) {
        delete dados.desafio.categorias[categoria];
    }

    // 🔹 Salva novamente
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(dados)
    );

    // 🔹 Atualiza interface
    renderizarCategorias(modoAtual);

    console.log(`Categoria ${categoria} limpa COMPLETAMENTE.`);
}

function limparModoMisto() {

    const dados = carregarPontuacoes();

    if (dados.misto) {

        dados.misto.casual = {
            pontos: 0,
            hiscore: 0
        };

        dados.misto.desafio = {
            pontos: 0,
            hiscore: 0
        };
    }

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(dados)
    );

    renderizarCategorias(modoAtual);

    console.log("Modo Misto resetado completamente.");
}

function registrarErro() {
    resetarCombo()
    if (errosRestantes <= 0) return;

    errosRestantes--;

    atualizarDisplayVidas();

    if (errosRestantes === 0) {
        gameOver();
    }
}

function gameOver() {
    gtag('event', 'game_over', {
        resultado: 'lose'
    });

    document.querySelector(".botao-reiniciar").style.display = "block";
    document.querySelector(".botao-proxima").style.display = "none";

    mostrarPontuacaoAtual();
    showGameOverSreen();
}

function showGameOverSreen(pontos) {
    const dados = carregarPontuacoes();
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
    const overlay = document.getElementById('gameOverScreenOverlay');
    const screen = document.getElementById('gameOverScreen');
    const dadosFim = { pontos: estruturaAtual.pontos, recorde: estruturaAtual.hiscore, categoria: categoriaAtual, modo: modoMisto ? 'misto' : modoAtual };
    if (typeof montarFimDeJogoHTML === "function") {
        screen.innerHTML = montarFimDeJogoHTML(dadosFim);
    } else {
    screen.innerHTML = `
        <h2>Fim de jogo 😢</h2>
        <p>Sua pontuação: ${estruturaAtual.pontos}</p>
    
        <button onclick="reiniciar()">Jogar novamente</button>
        <a href="#categorias">
            <button class="botao" onclick="renderizarCategorias()">Ver categorias</button>
        </a>
    `;
    }
    overlay.classList.remove('oculto');
    if (typeof atualizarBlocosAuth === "function") atualizarBlocosAuth();
}

function atualizarDisplayVidas() {
    const display = document.querySelector('.display-vidas');

    display.textContent = "❤️".repeat(errosRestantes);
}

function resetarCombo() {
    medidorCombo = 0;
    atualizarBarraCombo();
}

function iniciarTimer() {
    tempoRestante = tempoPadrao;
    atualizarTimerTela();

    intervaloTimer = setInterval(() => {
        tempoRestante--;
        atualizarTimerTela();

        if (tempoRestante <= 0) {
            clearInterval(intervaloTimer);
            fimDeJogoPorTempo();
        }
    }, 1000);
}

function pararTimer() {
    if (intervaloTimer !== null) {
        clearInterval(intervaloTimer);
        intervaloTimer = null;
    }
}

function configurarInterfacePorModo() {
    const timer = document.getElementById("timer");
    const timerSpan = document.querySelector(".timer-span");
    const statusContador = document.querySelector(".status-contador");

    if (modoAtual === "casual") {
        timer.style.display = "none";
        timerSpan.style.display = "none";
    } else {
        timer.style.display = "block";
        timerSpan.style.display = "inline";
    }
}

function abrirModalMisto() {
    const modal = document.getElementById('modal-misto');
    const lista = document.getElementById('lista-categorias-misto');

    lista.innerHTML = '';

    categorias.forEach(cat => {
        const label = document.createElement('label');
        label.innerHTML = `
      <input type="checkbox" value="${cat.id}">
      ${cat.nome}
    `;
        lista.appendChild(label);
    });

    modal.classList.remove('oculto');
}

let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {

    e.preventDefault();
    deferredPrompt = e;

    const banner = document.getElementById("install-banner");

    setTimeout(() => {
        banner.classList.add("show");
    }, 1000);

});

document.getElementById("btn-instalar").addEventListener("click", async () => {

    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
        document.getElementById("install-banner").style.display = "none";
    }

    deferredPrompt = null;

});

function esconderBanner() {

    const banner = document.getElementById("install-banner");

    if (banner) {
        banner.classList.remove("show");
    }

}

document.addEventListener("scroll", esconderBanner);