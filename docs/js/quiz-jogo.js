// Quiz de perguntas e respostas (4 alternativas, 3 erros, 3 dicas, 3 pulos).
// Usa js/banco-palavras.js: a pergunta é o campo opcional "pergunta"; sem ele, usa a "dica" da palavra.
// v1.0.0
(() => {
"use strict";

const NOMES = {
  historia: "História", geografia: "Geografia", quimica: "Química", biologia: "Biologia", fisica: "Física",
  cultura: "Cultura geral", musica: "Música", cinema: "Cinema", games: "Games", esporte: "Esportes",
  literatura: "Literatura", politica: "Política", portugues: "Língua portuguesa", matematica: "Matemática",
  tratamento: "Tratamento de água", biblia: "Bíblia"
};

// perguntas: quantas perguntas vale a partida | xpTotal: XP máximo (acertando tudo)
const NIVEIS = {
  facil:   { curto: "Fácil",   nome: "Fácil · 5 perguntas",    perguntas: 5,  xpTotal: 50 },
  medio:   { curto: "Médio",   nome: "Médio · 10 perguntas",   perguntas: 10, xpTotal: 100 },
  dificil: { curto: "Difícil", nome: "Difícil · 15 perguntas", perguntas: 15, xpTotal: 150 }
};
const DIFICULDADES = Object.keys(NIVEIS).map(id => ({ id, nome: NIVEIS[id].nome }));

const MAX_ERROS = 3;
const MAX_PULOS = 3;
const RAZAO_XP = 4;            // a última pergunta vale ~4x a primeira (crescimento suave, não dobra a cada acerto)
const PAGAMENTO_DERROTA = 0.6; // fim por 3 erros no modo livre paga 60% do XP acumulado
const PAUSA_FINAL = 1300;      // ms para ver a última resposta antes do resultado
// A faixa (tamanho da resposta) é a mesma da forca; se faltar palavra na faixa, completa com a vizinha
const ORDEM_FAIXAS = { facil: ["facil", "medio", "dificil"], medio: ["medio", "facil", "dificil"], dificil: ["dificil", "medio", "facil"] };
const LETRAS = ["A", "B", "C", "D"];
const $ = id => document.getElementById(id);

const normalizar = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
const qtdLetras = p => p.replace(/[^A-Z]/g, "").length;
const faixa = p => { const n = qtdLetras(p); return n <= 8 ? "facil" : n <= 12 ? "medio" : "dificil"; };

// Banco achatado, sem palavras repetidas dentro da mesma categoria
const banco = (() => {
  const vistos = new Set(), lista = [];
  Object.keys(bancoPalavras).forEach(cat => bancoPalavras[cat].forEach(x => {
    const palavra = normalizar(x.palavra), chave = cat + "|" + palavra;
    if (!qtdLetras(palavra) || vistos.has(chave)) return;
    vistos.add(chave);
    lista.push({ cat, palavra, dica: x.dica, pergunta: x.pergunta || "" });
  }));
  // ordem fixa: o desafio do dia sorteia sempre a mesma lista, mesmo que o banco seja reorganizado
  return lista.sort((a, b) => a.cat < b.cat ? -1 : a.cat > b.cat ? 1 : a.palavra < b.palavra ? -1 : a.palavra > b.palavra ? 1 : 0);
})();

const categorias = [{ id: "todas", nome: "Todas as categorias" }].concat(
  Object.keys(NOMES).filter(k => bancoPalavras[k]).map(k => ({ id: k, nome: NOMES[k] }))
);

/* ---------- XP: crescimento geométrico; a soma fecha exatamente em xpTotal ---------- */
function tabelaXP(n, total) {
  const r = n > 1 ? Math.pow(RAZAO_XP, 1 / (n - 1)) : 1;
  const pesos = Array.from({ length: n }, (_, i) => Math.pow(r, i));
  const soma = pesos.reduce((a, b) => a + b, 0);
  let acum = 0, antes = 0;
  return pesos.map(p => { acum += p * total / soma; const arred = Math.round(acum); const v = arred - antes; antes = arred; return v; });
}

/* ---------- Geração das perguntas ---------- */
function embaralhar(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const textoPergunta = it => it.pergunta || "Qual termo é descrito por: “" + it.dica + "”?";

function montarQuestao(item, rnd) {
  const nPal = item.palavra.split(" ").length, len = qtdLetras(item.palavra);
  // alternativas erradas: mesma categoria, tamanho e nº de palavras parecidos, sem ser parte da resposta
  const cand = banco.filter(x => x.cat === item.cat && x.palavra !== item.palavra && x.dica !== item.dica &&
    !item.palavra.includes(x.palavra) && !x.palavra.includes(item.palavra));
  const ranque = cand.map(x => ({
    p: x.palavra,
    s: Math.abs(qtdLetras(x.palavra) - len) + (x.palavra.split(" ").length === nPal ? 0 : 4) + rnd() * 5
  })).sort((a, b) => a.s - b.s);
  const erradas = [];
  for (const c of ranque) { erradas.push(c.p); if (erradas.length === 3) break; }
  const opcoes = embaralhar([item.palavra].concat(erradas), rnd);
  return { cat: item.cat, texto: textoPergunta(item), opcoes, correta: opcoes.indexOf(item.palavra) };
}

function gerarQuestoes(rnd, categoria, nivel, quantidade) {
  const pool = banco.filter(x => categoria === "todas" || x.cat === categoria);
  const ordem = ORDEM_FAIXAS[nivel].flatMap(f => embaralhar(pool.filter(x => faixa(x.palavra) === f), rnd));
  const usadas = new Set(), escolhidas = [];
  for (const it of ordem) {
    if (usadas.has(it.palavra)) continue; // a mesma palavra pode existir em duas categorias ("todas")
    usadas.add(it.palavra); escolhidas.push(it);
    if (escolhidas.length >= quantidade) break;
  }
  return escolhidas.map(it => montarQuestao(it, rnd));
}

/* ---------- Estado da partida ---------- */
let est, nivel, n, tabela, fila, reservas, idxReserva;
let pos, q, erros, acertos, xpAcum, pulosRest, dicasRest, dicaUsada, travado, fim, resultados, partida = 0;

function novo() {
  est = tb.estado();
  nivel = est.diario ? "facil" : est.dificuldade; // o desafio do dia é sempre o nível fácil, com todas as categorias
  const cfg = NIVEIS[nivel];
  const rnd = est.diario ? Portal.rngDiario("quiz") : Math.random; // mesma semente = mesmas perguntas para todos
  const todas = gerarQuestoes(rnd, est.diario ? "todas" : est.categoria, nivel, cfg.perguntas + MAX_PULOS);
  n = Math.min(cfg.perguntas, todas.length);
  tabela = tabelaXP(n, cfg.xpTotal);
  fila = todas.slice(0, n);
  reservas = todas.slice(n); idxReserva = 0;
  pos = 0; q = fila[0]; erros = 0; acertos = 0; xpAcum = 0;
  pulosRest = Math.min(MAX_PULOS, reservas.length);
  dicasRest = Portal.maxDicas("quiz", nivel);
  resultados = new Array(n).fill(null);
  fim = false; partida++;
  $("resultado").hidden = true;
  mostrar();
}

function mostrar() {
  travado = false; dicaUsada = false;
  $("q-cat").textContent = NOMES[q.cat] || q.cat;
  $("q-texto").textContent = q.texto;
  const box = $("q-opcoes");
  box.replaceChildren();
  q.opcoes.forEach((txt, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "quiz-opcao"; b.dataset.i = i;
    const l = document.createElement("span"); l.className = "quiz-letra"; l.textContent = LETRAS[i]; l.setAttribute("aria-hidden", "true");
    const t = document.createElement("span"); t.className = "quiz-opcao-txt"; t.textContent = txt;
    b.append(l, t);
    b.addEventListener("click", () => responder(i));
    box.appendChild(b);
  });
  $("q-prox").hidden = true;
  $("mensagem").textContent = "Escolha a alternativa correta.";
  painel();
}

function painel() {
  const vidas = MAX_ERROS - erros;
  $("q-pos").textContent = Math.min(pos + 1, n) + " / " + n;
  $("q-vidas").textContent = "❤️".repeat(Math.max(vidas, 0)) + "🖤".repeat(Math.min(erros, MAX_ERROS));
  $("q-vidas").setAttribute("aria-label", vidas + (vidas === 1 ? " vida restante" : " vidas restantes"));
  $("q-xp").textContent = xpAcum;
  $("q-valor").textContent = "Vale +" + tabela[Math.min(pos, n - 1)] + " XP";
  const tr = $("q-trilha");
  tr.replaceChildren();
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    if (resultados[i]) s.className = resultados[i];
    else if (i === pos && !fim) s.className = "cur";
    tr.appendChild(s);
  }
  const bloqueado = travado || fim;
  $("q-dica").textContent = "💡 Eliminar 2 (" + dicasRest + ")";
  $("q-dica").disabled = bloqueado || dicasRest <= 0 || dicaUsada;
  $("q-pular").textContent = "⏭ Pular (" + pulosRest + ")";
  $("q-pular").disabled = bloqueado || pulosRest <= 0;
}

function responder(i) {
  if (travado || fim) return;
  travado = true;
  const acertou = i === q.correta;
  document.querySelectorAll(".quiz-opcao").forEach((b, k) => {
    b.disabled = true;
    if (k === q.correta) b.classList.add("certa");
    else if (k === i) b.classList.add("errada");
  });
  if (acertou) { acertos++; xpAcum += tabela[pos]; resultados[pos] = "ok"; }
  else { erros++; resultados[pos] = "err"; }
  const acabou = erros >= MAX_ERROS || pos === n - 1;
  $("mensagem").textContent = acertou
    ? "Correto! +" + tabela[pos] + " XP"
    : "Errou. A resposta era " + q.opcoes[q.correta] + ".";
  painel();
  if (acabou) {
    const id = partida;
    setTimeout(() => { if (id === partida) terminar(erros < MAX_ERROS); }, PAUSA_FINAL);
  } else {
    if (window.Sons) Sons.tocar(acertou ? "acerto" : "erro"); // no fim da partida quem toca é a fanfarra
    const p = $("q-prox");
    p.hidden = false;
    p.focus({ preventScroll: true });
  }
}

function proxima() {
  if (fim || !travado || pos >= n - 1) return;
  pos++; q = fila[pos];
  mostrar();
}

function pular() {
  if (travado || fim || pulosRest <= 0 || idxReserva >= reservas.length) return;
  pulosRest--;
  q = fila[pos] = reservas[idxReserva++];
  mostrar();
  $("mensagem").textContent = "Pergunta trocada. Escolha a alternativa correta.";
}

function dica() {
  if (travado || fim || dicasRest <= 0 || dicaUsada) return;
  const botoes = Array.from(document.querySelectorAll(".quiz-opcao")).filter((b, k) => k !== q.correta && !b.disabled);
  embaralhar(botoes, Math.random).slice(0, 2).forEach(b => { b.disabled = true; b.classList.add("eliminada"); });
  dicasRest--; dicaUsada = true;
  $("mensagem").textContent = "Duas alternativas erradas foram eliminadas.";
  painel();
}

/* ---------- Fim da partida ---------- */
function terminar(completou) {
  fim = true;
  $("q-prox").hidden = true;
  document.querySelectorAll(".quiz-opcao").forEach(b => { b.disabled = true; });
  painel();

  let info = null, extra = "";
  if (completou) {
    info = Portal.concluir({ jogo: "quiz", xp: xpAcum, diario: est.diario });
    tb.refresh();
  } else if (!est.diario && xpAcum > 0) {
    // derrota no modo livre: paga parte do XP. No desafio do dia não paga nada e dá para tentar de novo.
    const res = Portal.concluir({ jogo: "quiz", xp: Math.round(xpAcum * PAGAMENTO_DERROTA), diario: false });
    extra = " +" + res.ganho + " XP (" + Math.round(PAGAMENTO_DERROTA * 100) + "% do acumulado) · Total: " + res.total + " XP.";
  }

  const r = $("resultado");
  r.hidden = false;
  r.classList.toggle("perdeu", !completou);
  const plural = (k, s, p) => k + " " + (k === 1 ? s : p);
  $("resultado-titulo").textContent = completou ? "Você completou o quiz!" : "Fim de jogo!";
  $("resultado-detalhe").textContent = completou
    ? acertos + " de " + n + " acertos, " + plural(erros, "erro", "erros") + "."
    : "Você chegou à pergunta " + (pos + 1) + " de " + n + " e acumulou " + xpAcum + " XP." + extra +
      (est.diario ? " O desafio do dia continua disponível: tente de novo." : "");
  $("jogar-novamente").textContent = completou ? "Jogar de novo" : (est.diario ? "Tentar de novo" : "Jogar de novo");
  $("mensagem").textContent = completou ? "Parabéns!" : "Não foi dessa vez. Tente de novo!";

  const [, m, d] = Portal.hoje().split("-");
  const titulo = est.diario
    ? "🎯 Quiz · Desafio do dia " + d + "/" + m
    : "🎯 Quiz · " + NIVEIS[nivel].curto + " · " + (est.categoria === "todas" ? "Todas as categorias" : NOMES[est.categoria]);
  const linha = completou
    ? "✅ " + acertos + "/" + n + " acertos com " + plural(erros, "erro", "erros")
    : "❌ Caí na pergunta " + (pos + 1) + " de " + n;
  Portal.anexarFim(r, { jogo: "quiz", texto: titulo + "\n" + linha + "\nConsegue fazer melhor?", info });
}

/* ---------- Eventos ---------- */
$("q-dica").addEventListener("click", dica);
$("q-pular").addEventListener("click", pular);
$("q-prox").addEventListener("click", proxima);
$("novo-jogo").addEventListener("click", novo);
$("jogar-novamente").addEventListener("click", novo);
document.addEventListener("keydown", e => {
  if (e.ctrlKey || e.altKey || e.metaKey || travado || fim) return;
  if (/^(SELECT|INPUT|TEXTAREA)$/.test((e.target && e.target.tagName) || "") || document.querySelector(".pm-overlay")) return;
  const k = normalizar(e.key);
  const i = /^[1-4]$/.test(k) ? Number(k) - 1 : LETRAS.indexOf(k);
  if (i < 0 || i > 3) return;
  const b = document.querySelectorAll(".quiz-opcao")[i];
  if (b && !b.disabled) responder(i);
});

const tb = Portal.toolbar($("toolbar"), { jogo: "quiz", categorias, dificuldades: DIFICULDADES, dificuldadePadrao: "facil", categoriaInicial: document.body.dataset.categoria, onChange: novo });
novo();
})();
