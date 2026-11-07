/* ============================================================
   caca-palavras.js
    Atualizado em 07/11/2026 (v2.1.1)
   - [v2.1.1] Limite de dicas por partida (valor vem de Portal.maxDicas, padrão 3)
   - [v2.1.0] Dica: a primeira letra de uma palavra pisca em amarelo
   - [v2.1.0] Custo: 3 XP por dica (mínimo de 5 XP na partida)
   - [v2.1.0] O bônus de 50 XP do desafio do dia não é afetado pelas dicas
   - [v2.1.0] Primeira dica da partida pede confirmação (segundo toque em até 5 s)
   - [v2.1.0] Texto de compartilhamento informa as dicas usadas
   Base anterior: v2.0.2
   ============================================================ */
(() => {
  "use strict";
  let rand = Math.random;

  const CUSTO_DICA = 3;     // [v2.1.0] XP descontado por dica
  const XP_MINIMO = 5;      // [v2.1.0] piso de XP da partida
  // [v2.1.1] Limite de dicas por partida (se o portal.js em cache for antigo, usa 3)
  const MAX_DICAS = (window.Portal && Portal.maxDicas && Portal.maxDicas("caca")) || 3;

  const temas = {
    profissoes: ["MEDICO", "PROFESSOR", "ENGENHEIRO", "PEDREIRO", "COZINHEIRO", "MOTORISTA", "DENTISTA", "ADVOGADO", "PILOTO", "PINTOR", "ATOR", "BOMBEIRO"],
    corpo: ["CABECA", "CORACAO", "PULMAO", "ESTOMAGO", "JOELHO", "COTOVELO", "OMBRO", "TORNOZELO", "PESCOCO", "CEREBRO", "FIGADO", "COSTELA"],
    casa: ["SOFA", "GELADEIRA", "FOGAO", "CADEIRA", "JANELA", "PORTA", "TELEVISAO", "ARMARIO", "CAMA", "TAPETE", "ESPELHO", "LAMPADA"],
    animais: ["CACHORRO", "GATO", "CAVALO", "COELHO", "TARTARUGA", "MACACO", "GOLFINHO", "BORBOLETA", "LEAO", "TIGRE", "ZEBRA", "PATO"],
    frutas: ["BANANA", "LARANJA", "ABACAXI", "MORANGO", "MELANCIA", "MANGA", "PERA", "UVA", "GOIABA", "CEREJA", "LIMAO", "MAMAO"],
    natureza: ["FLORESTA", "MONTANHA", "OCEANO", "CACHOEIRA", "PLANETA", "ESTRELA", "NUVEM", "CHUVA", "VENTO", "ARVORE", "JARDIM", "RIACHO"],
    esportes: ["FUTEBOL", "BASQUETE", "VOLEI", "NATACAO", "CORRIDA", "CICLISMO", "TENIS", "SURFE", "BOXE", "GINASTICA", "HANDEBOL", "JUDO"],
    portugues: ["PALAVRA", "LEITURA", "ESCRITA", "SILABA", "VERBO", "ADJETIVO", "SUBSTANTIVO", "POESIA", "TEXTO", "FRASE", "ACENTO", "VOGAL"]
  };

  const gradeEl = document.getElementById("grade");
  const listaEl = document.getElementById("lista-palavras");
  const progressoEl = document.getElementById("progresso");
  const mensagemEl = document.getElementById("mensagem");
  const vitoriaEl = document.getElementById("vitoria");
  const temaEl = document.getElementById("tema");
  const dificuldadeEl = document.getElementById("dificuldade");
  const diarioCtl = Portal.criarBotaoDiario("caca", () => startGame());
  document.querySelector(".game-toolbar").appendChild(diarioCtl.el);
  const novoBtn = document.getElementById("novo-jogo");
  const limparBtn = document.getElementById("limpar-selecao");
  const jogarNovamenteBtn = document.getElementById("jogar-novamente");

  // [v2.1.0] Botão de dica, criado aqui para não depender de alteração no HTML
  const dicaBtn = document.createElement("button");
  dicaBtn.type = "button";
  dicaBtn.id = "dica-btn";
  dicaBtn.className = "button button-secondary";
  limparBtn.parentNode.insertBefore(dicaBtn, limparBtn);

  let size = 10;
  let cells = [];
  let words = [];
  let found = new Set();
  let firstCell = null;
  let placements = [];

  // [v2.1.0] Estado das dicas
  let dicas = 0;               // dicas usadas na partida
  let dicaPalavra = null;      // palavra com dica ativa (ainda não encontrada)
  let dicaAguardando = false;  // esperando o segundo toque de confirmação
  let dicaConfirmada = false;  // o jogador já aceitou o custo nesta partida
  let dicaTimer = null;

  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1],
    [0, -1], [-1, 0], [-1, -1], [-1, 1]
  ];

  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function canPlace(word, row, col, dr, dc) {
    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || c < 0 || r >= size || c >= size) return false;
      const existing = cells[r][c];
      if (existing && existing !== word[i]) return false;
    }
    return true;
  }

  function placeWord(word) {
    for (let attempt = 0; attempt < 350; attempt++) {
      const [dr, dc] = directions[Math.floor(rand() * directions.length)];
      const row = Math.floor(rand() * size);
      const col = Math.floor(rand() * size);
      if (!canPlace(word, row, col, dr, dc)) continue;
      const positions = [];
      for (let i = 0; i < word.length; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        cells[r][c] = word[i];
        positions.push(r * size + c);
      }
      placements.push({ word, positions });
      return true;
    }
    return false;
  }

  // [v2.1.1] ---------- Dicas ----------
  function textoBotaoDica() {
    if (dicas >= MAX_DICAS) return `💡 Dicas esgotadas (${dicas}/${MAX_DICAS})`; // [v2.1.1]
    return `💡 Dica (−${CUSTO_DICA} XP) · ${dicas}/${MAX_DICAS}`;
  }


  function atualizarBotaoDica() {
    dicaBtn.textContent = dicaAguardando ? `⚠️ Confirmar dica (−${CUSTO_DICA} XP)` : textoBotaoDica();
    // [v2.1.1] também desabilita ao atingir o limite
    dicaBtn.disabled = (words.length > 0 && found.size === words.length) || dicas >= MAX_DICAS;
  }

  function limparDica() {
    gradeEl.querySelectorAll(".dica").forEach(el => el.classList.remove("dica"));
    dicaPalavra = null;
  }

  function cancelarConfirmacao() {
    clearTimeout(dicaTimer);
    dicaAguardando = false;
    atualizarBotaoDica();
  }

  function resetarDicas() {
    clearTimeout(dicaTimer);
    dicas = 0;
    dicaPalavra = null;
    dicaAguardando = false;
    dicaConfirmada = false;
    atualizarBotaoDica();
  }

  function pedirDica() {
    if (found.size === words.length) return;

    // Já existe uma dica piscando: não cobra de novo
    if (dicaPalavra && !found.has(dicaPalavra)) {
      setMessage("A dica já está piscando em amarelo no tabuleiro.");
      return;
    }

    // [v2.1.1] Limite atingido
    if (dicas >= MAX_DICAS) {
      setMessage(`Você já usou as ${MAX_DICAS} dicas desta partida.`);
      return;
    }

    // Primeira dica da partida: pede confirmação do custo
    if (!dicaConfirmada) {
      if (!dicaAguardando) {
        dicaAguardando = true;
        atualizarBotaoDica();
        setMessage(`Cada dica custa ${CUSTO_DICA} XP e você tem até ${MAX_DICAS} por partida. Toque de novo em "Confirmar dica" para usar.`);
        dicaTimer = setTimeout(cancelarConfirmacao, 5000);
        return;
      }
      clearTimeout(dicaTimer);
      dicaAguardando = false;
      dicaConfirmada = true;
    }

    // Prefere palavras cuja primeira letra não esteja dentro de outra palavra já encontrada
    const achadas = new Set();
    placements.filter(p => found.has(p.word)).forEach(p => p.positions.forEach(i => achadas.add(i)));
    const pendentes = placements.filter(p => !found.has(p.word));
    const preferidas = pendentes.filter(p => !achadas.has(p.positions[0]));
    const pool = preferidas.length ? preferidas : pendentes;
    if (!pool.length) return;
    const escolhida = pool[Math.floor(Math.random() * pool.length)]; // Math.random: não altera o sorteio do desafio do dia

    limparSelecao();
    dicas++;
    dicaPalavra = escolhida.word;
    const botao = gradeEl.children[escolhida.positions[0]];
    botao.classList.add("dica");
    atualizarBotaoDica();
    setMessage(`Dica usada (−${CUSTO_DICA} XP): a letra amarela é o início de uma palavra da lista.`);
  }

  function startGame() {
    if (diarioCtl.ativo) {
      rand = Portal.rngDiario("caca");
      const chaves = Object.keys(temas);
      temaEl.value = chaves[Math.floor(rand() * chaves.length)];
      dificuldadeEl.value = "12";
    } else {
      rand = Math.random;
    }
    temaEl.disabled = dificuldadeEl.disabled = diarioCtl.ativo;
    size = Number(dificuldadeEl.value);
    cells = Array.from({ length: size }, () => Array(size).fill(""));
    found = new Set();
    firstCell = null;
    placements = [];

    const maxLength = size;
    const available = shuffle(temas[temaEl.value].filter(word => word.length <= maxLength));
    words = [];
    for (const word of available) {
      if (words.length >= 8) break;
      if (placeWord(word)) words.push(word);
    }

    // Fallback de segurança: reduz o número de palavras caso uma combinação não caiba.
    if (words.length === 0) {
      words = ["GATO", "PATO", "LUA"].filter(word => word.length <= size);
      words.forEach(placeWord);
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!cells[r][c]) cells[r][c] = String.fromCharCode(65 + Math.floor(rand() * 26));
      }
    }

    gradeEl.style.setProperty("--grid-size", size);
    gradeEl.setAttribute("aria-label", `Grade do caça-palavras ${size} por ${size}`);
    gradeEl.replaceChildren();
    cells.flat().forEach((letter, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "letra-celula";
      button.textContent = letter;
      button.dataset.index = index;
      button.setAttribute("aria-label", `Linha ${Math.floor(index / size) + 1}, coluna ${index % size + 1}, letra ${letter}`);
      button.addEventListener("click", () => selectCell(index));
      gradeEl.appendChild(button);
    });

    listaEl.replaceChildren();
    words.forEach(word => {
      const li = document.createElement("li");
      li.textContent = word;
      li.dataset.word = word;
      listaEl.appendChild(li);
    });
    vitoriaEl.hidden = true;
    vitoriaEl.querySelectorAll(".pm-extra").forEach(e => e.remove());
    resetarDicas(); // [v2.1.0]
    updateProgress();
    setMessage(diarioCtl.ativo ? "Desafio do dia! Concluir vale +50 XP." : "Toque na primeira e na última letra da palavra.");
  }

  function concluirPartida() {
    // [v2.1.0] cada dica desconta XP da partida; o bônus do desafio do dia é somado à parte por Portal.concluir
    const base = ({ 10: 20, 12: 30, 14: 40 })[size] + words.length * 2;
    const xp = dicas ? Math.max(XP_MINIMO, base - dicas * CUSTO_DICA) : base;
    const info = Portal.concluir({ jogo: "caca", xp, diario: diarioCtl.ativo });
    diarioCtl.refresh();
    const [, m, d] = Portal.hoje().split("-");
    const titulo = diarioCtl.ativo ? `🔎 Caça-palavras · Desafio do dia ${d}/${m}` : `🔎 Caça-palavras · ${size}×${size}`;
    const linhaDicas = dicas ? `\n💡 Usei ${dicas} ${dicas === 1 ? "dica" : "dicas"}` : ""; // [v2.1.0]
    Portal.anexarFim(vitoriaEl, { jogo: "caca", texto: `${titulo}\n✅ Encontrei ${words.length} palavras!${linhaDicas}\nConsegue fazer melhor?`, info });
  }

  function selectCell(index) {
    if (found.size === words.length) return;
    const buttons = [...gradeEl.children];
    if (firstCell === null) {
      firstCell = index;
      buttons[index].classList.add("selecionada");
      setMessage("Agora toque na última letra da palavra.");
      return;
    }

    if (firstCell === index) {
      clearSelection();
      setMessage("Seleção limpa. Escolha a primeira letra.");
      return;
    }

    const selectedPath = getLine(firstCell, index);
    const candidate = selectedPath ? selectedPath.map(i => buttons[i].textContent).join("") : "";
    const reverseCandidate = [...candidate].reverse().join("");
    const match = words.find(word => !found.has(word) && (word === candidate || word === reverseCandidate));

    if (match && selectedPath) {
      found.add(match);
      const placement = placements.find(item => item.word === match);
      if (placement) placement.positions.forEach(i => buttons[i].classList.add("encontrada"));
      const item = listaEl.querySelector(`[data-word="${match}"]`);
      if (item) item.classList.add("encontrada");
      if (match === dicaPalavra) limparDica(); // [v2.1.0] a dica some quando a palavra é encontrada
      updateProgress();
      if (found.size === words.length) {
        vitoriaEl.hidden = false;
        setMessage("Desafio concluído!");
        atualizarBotaoDica(); // [v2.1.0] desabilita o botão no fim
        concluirPartida();
      } else {
        setMessage(`Boa! Você encontrou ${match}. Continue.`);
      }
    } else {
      setMessage(selectedPath ? "Essa sequência não forma uma palavra da lista. Tente novamente." : "Escolha letras alinhadas na horizontal, vertical ou diagonal.");
    }
    clearSelection();
  }

  function getLine(start, end) {
    const r1 = Math.floor(start / size), c1 = start % size;
    const r2 = Math.floor(end / size), c2 = end % size;
    const deltaR = r2 - r1, deltaC = c2 - c1;
    if (deltaR !== 0 && deltaC !== 0 && Math.abs(deltaR) !== Math.abs(deltaC)) return null;
    const steps = Math.max(Math.abs(deltaR), Math.abs(deltaC));
    if (steps === 0) return [start];
    const dr = Math.sign(deltaR), dc = Math.sign(deltaC);
    return Array.from({ length: steps + 1 }, (_, i) => (r1 + dr * i) * size + (c1 + dc * i));
  }

  function clearSelection() {
    firstCell = null;
    gradeEl.querySelectorAll(".selecionada").forEach(el => el.classList.remove("selecionada"));
  }
  const limparSelecao = clearSelection; // [v2.1.0] alias usado por pedirDica

  function updateProgress() {
    progressoEl.textContent = `${found.size} de ${words.length} palavras encontradas`;
  }

  function setMessage(text) {
    mensagemEl.textContent = text;
  }

  novoBtn.addEventListener("click", startGame);
  jogarNovamenteBtn.addEventListener("click", startGame);
  dicaBtn.addEventListener("click", pedirDica); // [v2.1.0]
  limparBtn.addEventListener("click", () => {
    clearSelection();
    setMessage("Seleção limpa. Escolha a primeira letra.");
  });
  // Cada tema com página própria leva para a URL dela; os demais voltam para /caca-palavras.html
  const PAGINAS_TEMA = {
    animais: "caca-palavras-de-animais", frutas: "caca-palavras-de-frutas",
    profissoes: "caca-palavras-de-profissoes", corpo: "caca-palavras-do-corpo-humano"
  };
  let temaAtual = temaEl.value;
  temaEl.addEventListener("change", () => {
    try { localStorage.setItem("caca_tema", temaEl.value); } catch (e) { }
    if (!diarioCtl.ativo && temaEl.value !== temaAtual) {
      const destino = PAGINAS_TEMA[temaEl.value] || "caca-palavras";
      const atual = location.pathname.replace(/^\/|\.html$/g, "");
      if (destino !== atual) { location.href = "/" + destino + ".html"; return; }
    }
    temaAtual = temaEl.value;
    startGame();
  });
  dificuldadeEl.addEventListener("change", startGame);

  let temaSalvo = null;
  try { temaSalvo = localStorage.getItem("caca_tema"); } catch (e) { }
  const temaInicial = document.body.dataset.tema || temaSalvo;
  if (temas[temaInicial]) { temaEl.value = temaInicial; temaAtual = temaInicial; }
  startGame();
})();