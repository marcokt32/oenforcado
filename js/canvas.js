// FUNÇÕES REFERENTES A INTERAÇÕES VISUAIS DO JOGO

// Função adiciona linhas e letras de acordo com a palavra secreta
function desenharLinhas() {
    const forca = document.getElementById("forca");//identifica e atribui o trecho html 'forca' a const.
    forca.innerHTML = "";//limpa se houver conteúdo -- camada para evitar bug

    let linha = document.createElement("div");//cria e atribui o trecho hmtl <div> a var. linha
    linha.classList.add("linha");//adiciona a classe "linha" ao trecho criado
    //por enquanto nao adicionamos este trecho ao html, apenas armazenamos

    let contadorLetras = 0;// define uma variavel índice para lógica 'for' a seguir
    const LIMITE_POR_LINHA = 12;// limite definido para quantas letras cada palavra pode ter por linha

    // para a lógica a seguir , palavrasecreta foi armazenada como uma array, onde cada letra é um elemento
    for (let i = 0; i < palavraSecreta.length; i++) {//estrutura 'for' com indice 'i', condição menor que tamanho da palavra secreta, e incremeto de 1
        // no canvas cada "linha" é um espaço vertical onde vão ser renderizadas as letras da palavra
        //vamos pular uma linha para cada espaço em branco ou quando a palavra alcançar LIMITE_POR_LINHA de caracteres
        const caractere = palavraSecreta[i]; // atribui o elemento ou caractere da palavra secreta na posição do indice a const caractere

        // Se o caractere atribuido for igual a vazio ""
        if (caractere === " ") {
            forca.appendChild(linha); //adiciona um elemento filho "linha" vazia ao elemento "forca" DOMÍNIO DE DOM

            linha = document.createElement("div");//novamente cria e atribui o trecho hmtl <div> a var. linha
            linha.classList.add("linha");//adiciona a classe "linha" ao trecho criado
            //este valor fica armazendado para a proxima letra ter sua propria area de renderização
            
            contadorLetras = 0;//zera o indice "contadorLetras"
            continue;
        }

        // Se ultrapassar limite e não houver espaço
        if (contadorLetras >= LIMITE_POR_LINHA) { /*essa codicional if usa a mesma logica da anterior
            quando o indice "contadorLetras" alcança o limite estabelecido*/
            forca.appendChild(linha);

            linha = document.createElement("div");
            linha.classList.add("linha");

            contadorLetras = 0;
        }
        //após as condições anteriores o loop faz o seguinte
        //adiciona o espaço para a letra conforme o tamanho da palavra
        const letra = document.createElement("p");//cria o elemento <p> e atribui a const letra
        letra.classList.add("letra");//adiciona a classe "letra" ao elemento
        letra.id = `letra-${i}`;//adiciona a id "letra-" concatenado ao numero correspondente a sua posição dentro do array

        linha.appendChild(letra);//adiciona um elemento filho "letra" ao elemento "linha"

        contadorLetras++;//incrementa 1 ao valor de "contadorLetras"
    }

    // adiciona última linha
    forca.appendChild(linha);
}

//Função atualiza o elemento com o valor do tempo restante, criando cronometro
function atualizarTimerTela() {
    document.getElementById("timer").innerText = tempoRestante;//identifica o elemento "timer" e substitui seu texto pelo texto da variavel tempoRestante
}

function fimDeJogoPorTempo() {
    alert("⏰ Tempo esgotado!");
    fim = true;
    document.querySelector(".pop-up-perdeu").style.display = "flex";
    registrarErro();
    pararTimer()
    resetarCombo()
}

function escreverLetraCorreta(index, letra) {
    if (fim) return;

    const campo = document.getElementById(`letra-${index}`);

    // Evita contar a mesma letra duas vezes
    if (campo.innerText === '') {
        campo.innerText = letra;
        acertos++;
    }

    const botao = document.getElementById(letra);
    if (botao) {
        botao.classList.add("letra-correta");
    }

}

function escreverLetrasIncorretas(letra, erros) {
    if (fim) return;

    const botao = document.getElementById(letra);
    if (botao) {
        botao.classList.add("letra-errada");
        botao.disabled = true;
    }
    resetarCombo()
    complementarForca(erros);
}

function complementarForca(erros) {
    const estrelas = document.querySelectorAll('.estrela');
    const totalEstrelas = estrelas.length;

    estrelas.forEach((estrela, index) => {
        if (index < totalEstrelas - erros) {
            estrela.classList.add('ativa');
        } else {
            estrela.classList.remove('ativa');
        }
    });

    if (erros >= totalEstrelas) {
        fim = true;
        document.querySelector(".pop-up-perdeu").style.display = "flex";
        pararTimer()
        registrarErro();
    }
}

function atualizarBarraCombo() {
    const barra = document.getElementById("barra-combo");
    const texto = document.getElementById("texto-combo");

    if (medidorCombo > 1) {
        let porcentagem = (medidorCombo / 8) * 100;

        if (porcentagem > 100) porcentagem = 100;

        barra.style.width = porcentagem + "%";
        texto.innerText = medidorCombo + "x";
    } else {
        barra.style.width = "0%";
        texto.innerText = "";
    }
}

