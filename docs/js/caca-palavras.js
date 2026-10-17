(() => {
  "use strict";
  let rand = Math.random;

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

  let size = 10;
  let cells = [];
  let words = [];
  let found = new Set();
  let firstCell = null;
  let placements = [];

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
    updateProgress();
    setMessage(diarioCtl.ativo ? "Desafio do dia! Concluir vale +50 XP." : "Toque na primeira e na última letra da palavra.");
  }

  function concluirPartida() {
    const xp = ({ 10: 20, 12: 30, 14: 40 })[size] + words.length * 2;
    const info = Portal.concluir({ jogo: "caca", xp, diario: diarioCtl.ativo });
    diarioCtl.refresh();
    const [, m, d] = Portal.hoje().split("-");
    const titulo = diarioCtl.ativo ? `🔎 Caça-palavras · Desafio do dia ${d}/${m}` : `🔎 Caça-palavras · ${size}×${size}`;
    Portal.anexarFim(vitoriaEl, { jogo: "caca", texto: `${titulo}\n✅ Encontrei ${words.length} palavras!\nConsegue fazer melhor?`, info });
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
      updateProgress();
      if (found.size === words.length) {
        vitoriaEl.hidden = false;
        setMessage("Desafio concluído!");
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

  function updateProgress() {
    progressoEl.textContent = `${found.size} de ${words.length} palavras encontradas`;
  }

  function setMessage(text) {
    mensagemEl.textContent = text;
  }

  novoBtn.addEventListener("click", startGame);
  jogarNovamenteBtn.addEventListener("click", startGame);
  limparBtn.addEventListener("click", () => {
    clearSelection();
    setMessage("Seleção limpa. Escolha a primeira letra.");
  });
  temaEl.addEventListener("change", startGame);
  dificuldadeEl.addEventListener("change", startGame);

  startGame();
})();
