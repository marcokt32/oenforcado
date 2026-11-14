(() => {
"use strict";
// Campo minado: abra todas as casas seguras sem pisar em nenhuma mina.
// Jogo livre: o primeiro clique nunca é uma mina (nem as casas ao redor).
// Desafio do dia: mesmo campo para todos, já com uma região aberta para começar.
// Um único ouvinte de eventos no tabuleiro (delegação) e só as casas que mudam são repintadas: mantém o INP baixo.
const DIFICULDADES = [
  { id: "facil", nome: "Fácil · 6×6 · 5 minas" },
  { id: "medio", nome: "Médio · 7×7 · 8 minas" },
  { id: "dificil", nome: "Difícil · 9×9 · 15 minas" }
];
const CFG = { facil: { n: 6, m: 5 }, medio: { n: 7, m: 8 }, dificil: { n: 9, m: 15 } };
const XP_BASE = { facil: 10, medio: 20, dificil: 30 };
const PAR = { facil: 45, medio: 90, dificil: 180 }; // até este tempo (s) vale +5 XP
const NOME_NIVEL = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };
const PRESSAO_LONGA = 420; // ms para marcar bandeira com toque longo
const $ = id => document.getElementById(id);

let est, nivel, n, minas, mina, vizin, aberta, bandeira, celulas, foco;
let iniciado, fim, venceu, t0, timer, modoBandeira = false, abertas, bandeiras, diarioAtivo;
let tipoPonteiro = "mouse", pressao = null, pressaoDisparou = false;
const tab = $("tabuleiro");

function vizinhos(i) {
  const r = (i / n) | 0, c = i % n, v = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < n && cc >= 0 && cc < n) v.push(rr * n + cc);
  }
  return v;
}

// Sorteia as minas fora das casas "seguras" (a primeira casa e as vizinhas) e conta os vizinhos de cada casa
function colocarMinas(seguro, r) {
  const total = n * n, cand = [];
  for (let i = 0; i < total; i++) if (!seguro.has(i)) cand.push(i);
  for (let i = cand.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [cand[i], cand[j]] = [cand[j], cand[i]];
  }
  mina = new Uint8Array(total);
  for (let k = 0; k < minas; k++) mina[cand[k]] = 1;
  vizin = new Uint8Array(total);
  for (let i = 0; i < total; i++) if (!mina[i]) vizin[i] = vizinhos(i).filter(v => mina[v]).length;
}

const formatarTempo = seg => `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;

function rotulo(i) {
  const r = (i / n) | 0, c = i % n;
  let estado = "fechada";
  if (aberta && aberta[i]) estado = mina && mina[i] ? "mina" : vizin[i] ? vizin[i] + (vizin[i] === 1 ? " mina vizinha" : " minas vizinhas") : "vazia";
  else if (bandeira && bandeira[i]) estado = "com bandeira";
  return `Linha ${r + 1}, coluna ${c + 1}, ${estado}`;
}

function pintar(i) {
  const el = celulas[i];
  let cls = "cm-cel", txt = "";
  if (aberta[i]) {
    cls += " aberta";
    if (mina && mina[i]) { cls += " mina"; txt = "💣"; }
    else if (vizin[i]) { cls += " n" + vizin[i]; txt = String(vizin[i]); }
  } else if (bandeira[i]) { cls += " bandeira"; txt = "🚩"; }
  el.className = cls;
  el.textContent = txt;
  el.setAttribute("aria-label", rotulo(i));
}

function montar() {
  tab.replaceChildren(); tab.classList.remove("fim");
  tab.style.setProperty("--n", n);
  if (tab.parentElement) tab.parentElement.style.setProperty("--n", n); // a bandeja usa --n para limitar a largura
  celulas = [];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n * n; i++) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "cm-cel"; b.dataset.i = i;
    b.tabIndex = i === 0 ? 0 : -1; // só uma casa entra na ordem do Tab; as setas percorrem o resto
    b.setAttribute("aria-label", rotulo(i));
    frag.appendChild(b); celulas.push(b);
  }
  tab.appendChild(frag);
  foco = 0;
}

function contadores() {
  $("minas").textContent = minas - bandeiras;
  $("seguras").textContent = `${abertas} / ${n * n - minas}`;
}

// Abre uma casa (e, se for vazia, a região em volta). Devolve true se era uma mina.
function abrirCelula(i) {
  if (aberta[i] || bandeira[i]) return false;
  if (mina[i]) { aberta[i] = 1; pintar(i); celulas[i].classList.add("explodiu"); return true; }
  const pilha = [i];
  while (pilha.length) {
    const c = pilha.pop();
    if (aberta[c] || bandeira[c]) continue;
    aberta[c] = 1; abertas++; pintar(c);
    if (vizin[c] === 0) for (const v of vizinhos(c)) if (!aberta[v] && !bandeira[v]) pilha.push(v);
  }
  return false;
}

function iniciarTempo() {
  if (iniciado) return;
  iniciado = true; t0 = Date.now();
  timer = setInterval(() => { if (!fim) $("tempo").textContent = formatarTempo(Math.round((Date.now() - t0) / 1000)); }, 1000);
}

function depoisDaJogada(explodiu) {
  contadores();
  if (explodiu) { terminar(false); return; }
  if (abertas === n * n - minas) { terminar(true); return; }
  $("mensagem").textContent = `${abertas} de ${n * n - minas} casas seguras abertas.`;
}

function revelar(i) {
  if (bandeira[i] || aberta[i]) return;
  if (!mina) { // primeiro clique do jogo livre: a casa e as vizinhas ficam livres de minas
    colocarMinas(new Set([i, ...vizinhos(i)]), Math.random);
  }
  iniciarTempo();
  if (window.Sons && !mina[i]) Sons.tocar("clique");
  depoisDaJogada(abrirCelula(i));
}

// Toque numa casa já aberta: se o número bate com as bandeiras ao redor, abre as demais vizinhas
function acorde(i) {
  if (!aberta[i] || !vizin[i]) return;
  const vs = vizinhos(i);
  if (vs.filter(v => bandeira[v]).length !== vizin[i]) return;
  let explodiu = false;
  for (const v of vs) if (!aberta[v] && !bandeira[v] && abrirCelula(v)) explodiu = true;
  depoisDaJogada(explodiu);
}

function alternarBandeira(i) {
  if (fim || aberta[i]) return;
  if (bandeira[i]) { bandeira[i] = 0; bandeiras--; } else { bandeira[i] = 1; bandeiras++; }
  pintar(i); contadores();
  if (window.Sons) Sons.tocar("bandeira");
}

function acao(i, soBandeira) {
  if (fim) return;
  if (soBandeira) { alternarBandeira(i); return; }
  if (aberta[i]) { acorde(i); return; }
  if (modoBandeira) { alternarBandeira(i); return; }
  revelar(i);
}

function terminar(ganhou) {
  fim = true; venceu = ganhou; clearInterval(timer);
  if (window.Sons && !ganhou) { Sons.tocar("explosao"); setTimeout(() => Sons.tocar("derrota"), 1000); }
  tab.classList.add("fim");
  const seg = iniciado ? Math.round((Date.now() - t0) / 1000) : 0;
  $("tempo").textContent = formatarTempo(seg);
  for (let c = 0; c < n * n; c++) {
    if (ganhou) {
      if (mina[c] && !bandeira[c]) { bandeira[c] = 1; pintar(c); }
    } else if (mina[c] && !aberta[c] && !bandeira[c]) {
      celulas[c].classList.add("aberta", "mina"); celulas[c].textContent = "💣";
    } else if (bandeira[c] && !mina[c]) {
      celulas[c].classList.add("errada"); celulas[c].textContent = "❌";
    }
  }
  if (ganhou) { bandeiras = minas; contadores(); }

  $("mensagem").textContent = ganhou ? "Campo limpo! Todas as casas seguras foram abertas." : "Fim de jogo: você abriu uma mina.";
  const r = $("resultado");
  r.hidden = false;
  r.classList.toggle("perdeu", !ganhou);
  $("resultado-titulo").textContent = ganhou ? "Você limpou o campo!" : "Boom! Era uma mina.";
  $("resultado-detalhe").textContent = ganhou
    ? `Tempo: ${formatarTempo(seg)} · ${NOME_NIVEL[nivel]} ${n}×${n}`
    : `Você abriu ${abertas} de ${n * n - minas} casas seguras.`;
  $("jogar-novamente").textContent = ganhou ? "Próximo campo" : (diarioAtivo ? "Tentar de novo" : "Novo jogo");

  let info = null;
  if (ganhou) {
    const xp = XP_BASE[nivel] + (seg <= PAR[nivel] ? 5 : 0);
    info = Portal.concluir({ jogo: "campominado", xp, diario: diarioAtivo });
    tb.refresh();
  }
  const [, m, d] = Portal.hoje().split("-");
  const titulo = diarioAtivo ? `💣 Campo minado · Desafio do dia ${d}/${m}` : `💣 Campo minado · ${NOME_NIVEL[nivel]} ${n}×${n}`;
  const linha = ganhou ? `✅ Limpei o campo em ${formatarTempo(seg)}` : "💥 Pisei numa mina";
  Portal.anexarFim(r, { jogo: "campominado", texto: `${titulo}\n${linha}\nConsegue mais rápido?`, info, som: ganhou });
}

function atualizarModo() {
  const b = $("modo-bandeira");
  b.setAttribute("aria-pressed", modoBandeira ? "true" : "false");
  b.textContent = modoBandeira ? "🚩 Modo bandeira: ligado" : "🚩 Modo bandeira: desligado";
}

function novo() {
  est = tb.estado();
  clearInterval(timer);
  diarioAtivo = !!est.diario;
  nivel = diarioAtivo ? "medio" : est.dificuldade;
  n = CFG[nivel].n; minas = CFG[nivel].m;
  aberta = new Uint8Array(n * n); bandeira = new Uint8Array(n * n);
  mina = null; vizin = null;
  iniciado = false; fim = false; venceu = false; abertas = 0; bandeiras = 0;
  $("nivel-atual").textContent = diarioAtivo ? "Desafio do dia" : `${NOME_NIVEL[nivel]} ${n}×${n}`;
  $("tempo").textContent = "0:00";
  $("resultado").hidden = true;
  $("resultado").querySelectorAll(".pm-extra").forEach(e => e.remove());
  montar();
  if (diarioAtivo) { // mesmo campo para todos: o sorteio inclui a casa inicial, que já nasce aberta
    const r = Portal.rngDiario("campominado");
    const ini = Math.floor(r() * n * n);
    colocarMinas(new Set([ini, ...vizinhos(ini)]), r);
    abrirCelula(ini);
    $("mensagem").textContent = "Desafio do dia! Já abrimos uma região para você começar. Concluir vale +50 XP.";
  } else {
    $("mensagem").textContent = "Clique numa casa para abrir. Botão direito, toque longo ou modo bandeira marcam uma mina.";
  }
  contadores();
}

/* ---------- Eventos (um ouvinte só no tabuleiro) ---------- */
const casaDe = e => e.target.closest && e.target.closest(".cm-cel");
const cancelarPressao = () => { clearTimeout(pressao); pressao = null; };

tab.addEventListener("pointerdown", e => {
  tipoPonteiro = e.pointerType || "mouse";
  const b = casaDe(e);
  pressaoDisparou = false;
  if (!b || tipoPonteiro === "mouse") return;
  cancelarPressao();
  pressao = setTimeout(() => {
    pressaoDisparou = true;
    alternarBandeira(+b.dataset.i);
    if (navigator.vibrate) navigator.vibrate(15);
  }, PRESSAO_LONGA);
});
["pointerup", "pointerleave", "pointercancel"].forEach(ev => tab.addEventListener(ev, cancelarPressao));

tab.addEventListener("click", e => {
  const b = casaDe(e);
  if (!b) return;
  if (pressaoDisparou) { pressaoDisparou = false; return; } // o toque longo já marcou a bandeira
  acao(+b.dataset.i, false);
});

tab.addEventListener("contextmenu", e => {
  const b = casaDe(e);
  if (!b) return;
  e.preventDefault();
  if (tipoPonteiro === "mouse") acao(+b.dataset.i, true); // no toque, o menu de contexto vem do toque longo (já tratado acima)
});

tab.addEventListener("focusin", e => {
  const b = casaDe(e);
  if (!b || !celulas[foco]) return;
  celulas[foco].tabIndex = -1; foco = +b.dataset.i; b.tabIndex = 0;
});

tab.addEventListener("keydown", e => {
  const b = casaDe(e);
  if (!b || e.ctrlKey || e.altKey || e.metaKey) return;
  const i = +b.dataset.i, r = (i / n) | 0, c = i % n;
  let j = -1;
  if (e.key === "ArrowUp" && r > 0) j = i - n;
  else if (e.key === "ArrowDown" && r < n - 1) j = i + n;
  else if (e.key === "ArrowLeft" && c > 0) j = i - 1;
  else if (e.key === "ArrowRight" && c < n - 1) j = i + 1;
  if (j >= 0) { e.preventDefault(); celulas[j].focus(); return; }
  if (e.key === "f" || e.key === "F") { e.preventDefault(); acao(i, true); }
});

$("modo-bandeira").addEventListener("click", () => { modoBandeira = !modoBandeira; atualizarModo(); });
$("novo-jogo").addEventListener("click", novo);
$("jogar-novamente").addEventListener("click", novo);

const tb = Portal.toolbar($("toolbar"), { jogo: "campominado", dificuldades: DIFICULDADES, dificuldadePadrao: "facil", onChange: novo });
atualizarModo();
novo();
})();
