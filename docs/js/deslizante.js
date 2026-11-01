(() => {
"use strict";
// Quebra-cabeça deslizante (Jogo dos 15): deslize as peças para o espaço vazio até deixar os números em ordem.
// O embaralhamento parte do tabuleiro resolvido e faz só movimentos válidos, então todo puzzle tem solução.
// No desafio do dia, o embaralhamento é o mesmo para todos os jogadores.
const DIFICULDADES = [
  { id: "facil", nome: "Fácil · 3×3" },
  { id: "medio", nome: "Médio · 4×4" },
  { id: "dificil", nome: "Difícil · 5×5" }
];
const CFG = {
  facil: { n: 3, passos: 60 },
  medio: { n: 4, passos: 160 },
  dificil: { n: 5, passos: 320 }
};
const XP_BASE = { facil: 15, medio: 30, dificil: 45 };
const PAR = { facil: 30, medio: 90, dificil: 200 };     // movimentos sem perda de XP
const PASSO = { facil: 10, medio: 20, dificil: 30 };    // a cada tantos movimentos acima, perde 1 XP
const NOME_NIVEL = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };
const $ = id => document.getElementById(id);

let est, nivel, n, estado, inicial, movimentos, iniciado, venceu, t0, timer;
let pecas = {};

function vizinhos(pos) {
  const r = (pos / n) | 0, c = pos % n, v = [];
  if (r > 0) v.push(pos - n);
  if (r < n - 1) v.push(pos + n);
  if (c > 0) v.push(pos - 1);
  if (c < n - 1) v.push(pos + 1);
  return v;
}

function resolvido(a) { return a.every((v, i) => i === a.length - 1 ? v === 0 : v === i + 1); }

function embaralhar(tam, passos, r) {
  n = tam;
  let a;
  do {
    a = Array.from({ length: n * n }, (_, i) => (i + 1) % (n * n)); // 1..n²-1 e o vazio (0) no fim
    let vazio = n * n - 1, anterior = -1;
    for (let k = 0; k < passos; k++) {
      const opcoes = vizinhos(vazio).filter(p => p !== anterior);
      const p = opcoes[Math.floor(r() * opcoes.length)];
      a[vazio] = a[p]; a[p] = 0; anterior = vazio; vazio = p;
    }
  } while (resolvido(a));
  return a;
}

// Desliza a peça em "pos" (e as que estiverem no caminho) em direção ao espaço vazio. Devolve quantas peças andaram.
function mover(pos) {
  const v = estado.indexOf(0);
  const rp = (pos / n) | 0, cp = pos % n, rv = (v / n) | 0, cv = v % n;
  if (pos === v || (rp !== rv && cp !== cv)) return 0;
  const passo = rp === rv ? (cp < cv ? 1 : -1) : (rp < rv ? n : -n);
  let k = v, andou = 0;
  while (k !== pos) { estado[k] = estado[k - passo]; k -= passo; andou++; }
  estado[pos] = 0;
  return andou;
}

function formatarTempo(seg) { return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`; }

function montar() {
  const b = $("tabuleiro");
  b.replaceChildren(); b.classList.remove("ganhou");
  b.style.setProperty("--n", n);
  pecas = {};
  for (let v = 1; v < n * n; v++) {
    const el = document.createElement("button");
    el.type = "button"; el.className = "dz-peca";
    el.style.setProperty("--h", Math.round((v - 1) / (n * n - 2) * 300)); // cada número tem a sua cor
    el.innerHTML = `<span class="dz-face">${v}</span>`;
    el.addEventListener("click", () => { if (!venceu) tentar(estado.indexOf(v)); });
    b.appendChild(el); pecas[v] = el;
  }
}

function atualizar() {
  const vazio = estado.indexOf(0), rv = (vazio / n) | 0, cv = vazio % n;
  let certas = 0;
  estado.forEach((v, pos) => {
    if (!v) return;
    const el = pecas[v], r = (pos / n) | 0, c = pos % n, certa = v === pos + 1;
    if (certa) certas++;
    el.style.setProperty("--x", c); el.style.setProperty("--y", r);
    el.classList.toggle("certa", certa);
    el.classList.toggle("movel", r === rv || c === cv);
    el.setAttribute("aria-label", `Peça ${v}, linha ${r + 1}, coluna ${c + 1}${certa ? ", no lugar certo" : ""}`);
  });
  $("certas").textContent = `${certas} / ${n * n - 1}`;
  $("movimentos").textContent = movimentos;
  return certas;
}

function tentar(pos) {
  const andou = mover(pos);
  if (!andou) { $("mensagem").textContent = "Só dá para mover peças que estejam na mesma linha ou coluna do espaço vazio."; return; }
  if (!iniciado) {
    iniciado = true; t0 = Date.now();
    timer = setInterval(() => { if (!venceu) $("tempo").textContent = formatarTempo(Math.round((Date.now() - t0) / 1000)); }, 1000);
  }
  movimentos += andou;
  const certas = atualizar();
  if (resolvido(estado)) terminar();
  else $("mensagem").textContent = `${certas} de ${n * n - 1} peças no lugar.`;
}

function terminar() {
  venceu = true; clearInterval(timer);
  const seg = Math.round((Date.now() - t0) / 1000);
  $("tempo").textContent = formatarTempo(seg);
  $("mensagem").textContent = "Resolvido! Todas as peças estão em ordem.";
  $("tabuleiro").classList.add("ganhou");
  const extra = Math.max(0, movimentos - PAR[nivel]);
  const xp = Math.max(5, XP_BASE[nivel] - Math.floor(extra / PASSO[nivel]));
  const info = Portal.concluir({ jogo: "deslizante", xp, diario: est.diario });
  tb.refresh();
  const r = $("resultado");
  r.hidden = false;
  $("resultado-titulo").textContent = "Você resolveu!";
  $("resultado-detalhe").textContent = `Tempo: ${formatarTempo(seg)} · ${movimentos} movimentos`;
  const [, m, d] = Portal.hoje().split("-");
  const titulo = est.diario ? `🔢 Quebra-cabeça deslizante · Desafio do dia ${d}/${m}` : `🔢 Quebra-cabeça deslizante · ${NOME_NIVEL[nivel]} ${n}×${n}`;
  const linha = `✅ Resolvi em ${formatarTempo(seg)} com ${movimentos} movimentos`;
  Portal.anexarFim(r, { jogo: "deslizante", texto: `${titulo}\n${linha}\nConsegue com menos?`, info });
}

// Volta ao embaralhamento inicial do puzzle atual
function reiniciar() {
  clearInterval(timer);
  estado = inicial.slice();
  movimentos = 0; iniciado = false; venceu = false;
  $("tempo").textContent = "0:00";
  $("resultado").hidden = true;
  $("resultado").querySelectorAll(".pm-extra").forEach(e => e.remove());
  $("tabuleiro").classList.remove("ganhou");
  $("mensagem").textContent = "Toque numa peça ao lado do espaço vazio para deslizá-la. Também vale usar as setas do teclado.";
  atualizar();
}

function novo() {
  est = tb.estado();
  let r = Math.random;
  if (est.diario) { r = Portal.rngDiario("deslizante"); nivel = "medio"; }
  else nivel = est.dificuldade;
  const cfg = CFG[nivel];
  inicial = embaralhar(cfg.n, cfg.passos, r);
  $("nivel-atual").textContent = est.diario ? "Desafio do dia" : `${NOME_NIVEL[nivel]} ${n}×${n}`;
  montar(); reiniciar();
}

// Setas: a peça vizinha ao espaço vazio desliza na direção da seta
document.addEventListener("keydown", e => {
  if (!estado || venceu || e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.target.closest && e.target.closest("select, input, textarea")) return;
  const v = estado.indexOf(0), r = (v / n) | 0, c = v % n;
  let pos = -1;
  if (e.key === "ArrowUp" && r < n - 1) pos = v + n;
  else if (e.key === "ArrowDown" && r > 0) pos = v - n;
  else if (e.key === "ArrowLeft" && c < n - 1) pos = v + 1;
  else if (e.key === "ArrowRight" && c > 0) pos = v - 1;
  if (pos < 0) return;
  e.preventDefault(); tentar(pos);
});

$("novo-jogo").addEventListener("click", novo);
$("jogar-novamente").addEventListener("click", novo);
$("reiniciar").addEventListener("click", reiniciar);

const tb = Portal.toolbar($("toolbar"), { jogo: "deslizante", dificuldades: DIFICULDADES, dificuldadePadrao: "facil", onChange: novo });
novo();
})();
