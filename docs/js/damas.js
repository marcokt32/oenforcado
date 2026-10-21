(() => {
"use strict";
// Damas brasileiras: tabuleiro 8x8, captura obrigatória com lei da maioria,
// peças comuns capturam para trás e damas "voam". Você joga de claro (embaixo) contra o computador.
const DIFICULDADES = [
  { id: "facil", nome: "Fácil · computador iniciante" },
  { id: "medio", nome: "Médio · computador atento" },
  { id: "dificil", nome: "Difícil · computador estrategista" }
];
const XP_BASE = { facil: 15, medio: 30, dificil: 45 };
const NOME_NIVEL = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };
const PROF = { facil: 2, medio: 4, dificil: 6 };
const LIMITE_EMPATE = 40; // 20 lances de cada lado só com damas e sem captura
const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const $ = id => document.getElementById(id);
const dentro = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const lado = v => v > 0 ? 1 : v < 0 ? -1 : 0;

// ===== Motor =====
// Tabuleiro: array de 64 casas. 1 = peça sua, 2 = sua dama, -1 = peça do computador, -2 = dama do computador.
function inicial() {
  const b = Array(64).fill(0);
  for (let i = 0; i < 64; i++) {
    const r = i >> 3, c = i & 7;
    if ((r + c) % 2 === 1) b[i] = r < 3 ? -1 : r > 4 ? 1 : 0;
  }
  return b;
}

// Todas as sequências de captura possíveis a partir de uma peça (a peça capturada só sai no fim do lance)
function sequencias(b, from, who) {
  const rei = Math.abs(b[from]) === 2, out = [];
  const em = i => i === from ? 0 : b[i];
  function dfs(pos, path, caps) {
    let achou = false;
    for (const [dr, dc] of DIRS) {
      let r = (pos >> 3) + dr, c = (pos & 7) + dc;
      if (rei) while (dentro(r, c) && em(r * 8 + c) === 0) { r += dr; c += dc; }
      if (!dentro(r, c)) continue;
      const i = r * 8 + c;
      if (lado(em(i)) !== -who || caps.includes(i)) continue;
      let lr = r + dr, lc = c + dc;
      while (dentro(lr, lc) && em(lr * 8 + lc) === 0) {
        const li = lr * 8 + lc;
        achou = true;
        dfs(li, path.concat(li), caps.concat(i));
        if (!rei) break;
        lr += dr; lc += dc;
      }
    }
    if (!achou && caps.length) out.push({ path, caps });
  }
  dfs(from, [from], []);
  return out;
}

// Lances legais: se há captura ela é obrigatória, e vale a que captura mais peças
function gerar(b, who) {
  const caps = [];
  for (let i = 0; i < 64; i++) if (lado(b[i]) === who) for (const m of sequencias(b, i, who)) caps.push(m);
  if (caps.length) {
    const mx = Math.max(...caps.map(m => m.caps.length));
    return caps.filter(m => m.caps.length === mx);
  }
  const out = [];
  for (let i = 0; i < 64; i++) {
    if (lado(b[i]) !== who) continue;
    const r = i >> 3, c = i & 7;
    if (Math.abs(b[i]) === 2) {
      for (const [dr, dc] of DIRS) {
        let rr = r + dr, cc = c + dc;
        while (dentro(rr, cc) && b[rr * 8 + cc] === 0) { out.push({ path: [i, rr * 8 + cc], caps: [] }); rr += dr; cc += dc; }
      }
    } else {
      for (const dc of [-1, 1]) {
        const rr = r - who, cc = c + dc;
        if (dentro(rr, cc) && b[rr * 8 + cc] === 0) out.push({ path: [i, rr * 8 + cc], caps: [] });
      }
    }
  }
  return out;
}

function aplicar(b, m) {
  const n = b.slice(), from = m.path[0], to = m.path[m.path.length - 1];
  let p = n[from];
  n[from] = 0;
  for (const i of m.caps) n[i] = 0;
  if (Math.abs(p) === 1 && ((p > 0 && (to >> 3) === 0) || (p < 0 && (to >> 3) === 7))) p *= 2; // só vira dama se terminar na última fileira
  n[to] = p;
  return n;
}

// Avaliação do ponto de vista de quem joga embaixo (positivo = bom para você)
function avaliar(b) {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const v = b[i];
    if (!v) continue;
    const r = i >> 3, c = i & 7;
    let val;
    if (Math.abs(v) === 2) val = 320;
    else {
      val = 100 + (v > 0 ? 7 - r : r) * 4;
      if ((v > 0 && r === 7) || (v < 0 && r === 0)) val += 8; // fileira de trás protegida
    }
    val += 2 - Math.abs(c - 3.5) * 0.5;
    s += (v > 0 ? 1 : -1) * val;
  }
  return s;
}

function negamax(b, who, d, a, be, ext) {
  const ms = gerar(b, who);
  if (!ms.length) return -(10000 + d);
  if (d <= 0 && (ms[0].caps.length === 0 || ext >= 4)) return who * avaliar(b);
  const ne = d <= 0 ? ext + 1 : ext;
  let best = -Infinity;
  for (const m of ms) {
    const s = -negamax(aplicar(b, m), -who, d - 1, -be, -a, ne);
    if (s > best) best = s;
    if (best > a) a = best;
    if (a >= be) break;
  }
  return best;
}

function melhor(b, who, prof) {
  let best = null, bs = -Infinity;
  for (const m of gerar(b, who)) {
    const s = -negamax(aplicar(b, m), -who, prof - 1, -Infinity, Infinity, 0) + Math.random() * 3;
    if (s > bs) { bs = s; best = m; }
  }
  return best;
}

// Desafio do dia: mesma abertura para todos (4 lances sorteados pela semente do dia)
function aberturaDiaria(rng) {
  let q = inicial(), who = 1;
  for (let k = 0; k < 4; k++) {
    const ms = gerar(q, who);
    if (!ms.length) break;
    q = aplicar(q, ms[Math.floor(rng() * ms.length)]);
    who = -who;
  }
  return q;
}

// ===== Interface =====
let est, nivel, b, turn, legais, prefix, ultimo, dica, dicas, jogadas, quiet, over, pensando, token = 0;
const cells = [];

function montar() {
  const t = $("tabuleiro");
  t.replaceChildren(); cells.length = 0;
  for (let i = 0; i < 64; i++) {
    const r = i >> 3, c = i & 7;
    if ((r + c) % 2 === 0) {
      const d = document.createElement("div");
      d.className = "dm-sq claro"; d.setAttribute("aria-hidden", "true");
      t.appendChild(d); cells.push(null);
    } else {
      const el = document.createElement("button");
      el.type = "button";
      el.addEventListener("click", () => clicar(i));
      t.appendChild(el); cells.push(el);
    }
  }
}

const filtrar = () => legais.filter(m => prefix.every((x, k) => m.path[k] === x));

function atualizar() {
  const mov = new Set(), alvos = new Set();
  if (turn === 1 && !over) {
    if (!prefix.length) legais.forEach(m => mov.add(m.path[0]));
    else filtrar().forEach(m => alvos.add(m.path[prefix.length]));
  }
  let np = 0, nc = 0;
  b.forEach(v => { if (v > 0) np++; else if (v < 0) nc++; });
  cells.forEach((el, i) => {
    if (!el) return;
    const v = b[i], r = i >> 3, c = i & 7;
    el.className = "dm-sq escuro"
      + (mov.has(i) ? " mov" : "") + (prefix[0] === i ? " sel" : "")
      + (alvos.has(i) ? " alvo" : "") + (prefix.length > 1 && prefix.indexOf(i) > 0 ? " rota" : "")
      + (ultimo.includes(i) ? " ult" : "") + (dica && dica.includes(i) ? " dica" : "");
    el.innerHTML = v ? `<span class="dm-p ${v > 0 ? "jog" : "cpu"}${Math.abs(v) === 2 ? " dama" : ""}"></span>` : "";
    const desc = !v ? "vazia" : (v > 0 ? "sua " : "do computador, ") + (Math.abs(v) === 2 ? "dama" : "peça");
    el.setAttribute("aria-label", `Linha ${r + 1}, coluna ${c + 1}, ${desc}${alvos.has(i) ? ", destino possível" : ""}`);
  });
  $("pecas").textContent = `${np} × ${nc}`;
  $("jogadas").textContent = String(jogadas);
}

function msgVez() {
  if (over) return;
  $("mensagem").textContent = legais.length && legais[0].caps.length
    ? "Captura obrigatória: toque na peça que vai capturar (vale o lance que captura mais peças)."
    : "Sua vez: toque numa peça sua e depois na casa de destino.";
}

function clicar(i) {
  if (over || turn !== 1 || pensando) return;
  dica = null;
  if (prefix.length && filtrar().some(m => m.path[prefix.length] === i)) {
    prefix.push(i);
    const pronto = legais.find(m => m.path.length === prefix.length && m.path.every((x, k) => x === prefix[k]));
    if (pronto) { jogar(pronto); return; }
    $("mensagem").textContent = "Continue capturando: toque na próxima casa.";
    atualizar(); return;
  }
  if (legais.some(m => m.path[0] === i)) {
    prefix = [i]; $("mensagem").textContent = "Agora toque na casa de destino.";
  } else {
    prefix = []; msgVez();
  }
  atualizar();
}

function jogar(m) {
  const eraDama = Math.abs(b[m.path[0]]) === 2;
  b = aplicar(b, m);
  ultimo = [m.path[0], m.path[m.path.length - 1]];
  quiet = (m.caps.length || !eraDama) ? 0 : quiet + 1;
  if (turn === 1) jogadas++;
  turn = -turn; prefix = []; dica = null;
  const prox = gerar(b, turn);
  if (turn === 1) legais = prox;
  if (!prox.length) { fim(turn === -1 ? "win" : "lose"); return; }
  if (quiet >= LIMITE_EMPATE) { fim("draw"); return; }
  atualizar();
  if (turn === -1) pensarCPU(); else msgVez();
}

function escolherCPU() {
  const ms = gerar(b, -1);
  if (ms.length === 1) return ms[0];
  if (nivel === "facil" && Math.random() < 0.4) return ms[Math.floor(Math.random() * ms.length)];
  return melhor(b, -1, PROF[nivel]);
}

function pensarCPU() {
  pensando = true;
  $("mensagem").textContent = "O computador está pensando…";
  const meu = token;
  setTimeout(() => {
    if (meu !== token) return;
    pensando = false;
    jogar(escolherCPU());
  }, 450);
}

function fim(res) {
  over = true; pensando = false;
  atualizar();
  const r = $("resultado");
  r.hidden = false;
  r.classList.toggle("perdeu", res === "lose");
  if (res === "win") {
    const xp = Math.max(5, XP_BASE[nivel] - 5 * dicas);
    const info = Portal.concluir({ jogo: "damas", xp, diario: est.diario });
    tb.refresh();
    $("resultado-titulo").textContent = "Você venceu!";
    $("resultado-detalhe").textContent = `${jogadas} ${jogadas === 1 ? "lance" : "lances"}` + (dicas ? ` · ${dicas} ${dicas === 1 ? "dica" : "dicas"}` : "");
    $("mensagem").textContent = "Vitória! O computador ficou sem lances.";
    const [, m, d] = Portal.hoje().split("-");
    const titulo = est.diario ? `⚪ Damas · Desafio do dia ${d}/${m}` : `⚪ Damas · ${NOME_NIVEL[nivel]}`;
    const linha = `✅ Venci em ${jogadas} lances` + (dicas ? ` com ${dicas} ${dicas === 1 ? "dica" : "dicas"}` : " sem dicas");
    Portal.anexarFim(r, { jogo: "damas", texto: `${titulo}\n${linha}\nConsegue me vencer?`, info });
  } else if (res === "lose") {
    $("resultado-titulo").textContent = "O computador venceu";
    $("resultado-detalhe").textContent = "Você ficou sem lances. Tente de novo ou escolha um nível mais fácil.";
    $("mensagem").textContent = "Fim de jogo.";
  } else {
    $("resultado-titulo").textContent = "Empate";
    $("resultado-detalhe").textContent = "20 lances seguidos só com damas e sem captura.";
    $("mensagem").textContent = "Partida empatada.";
  }
}

function novo() {
  token++;
  est = tb.estado();
  nivel = est.diario ? "medio" : est.dificuldade;
  b = est.diario ? aberturaDiaria(Portal.rngDiario("damas")) : inicial();
  turn = 1; prefix = []; ultimo = []; dica = null; dicas = 0; jogadas = 0; quiet = 0; over = false; pensando = false;
  legais = gerar(b, 1);
  const r = $("resultado");
  r.hidden = true; r.classList.remove("perdeu");
  r.querySelectorAll(".pm-extra").forEach(e => e.remove());
  $("nivel-atual").textContent = est.diario ? "Desafio do dia" : NOME_NIVEL[nivel];
  montar(); atualizar(); msgVez();
}

$("dica-btn").addEventListener("click", () => {
  if (over || turn !== 1 || pensando) return;
  const m = melhor(b, 1, 4);
  if (!m) return;
  dicas++; prefix = [];
  dica = m.path.slice(0, 2);
  atualizar();
  $("mensagem").textContent = "Dica: a peça e a casa destacadas em amarelo são um bom lance. Cada dica reduz 5 XP.";
});
$("desistir").addEventListener("click", () => {
  if (over || pensando) return;
  token++; fim("lose");
});
$("novo-jogo").addEventListener("click", novo);
$("jogar-novamente").addEventListener("click", novo);

const tb = Portal.toolbar($("toolbar"), { jogo: "damas", dificuldades: DIFICULDADES, dificuldadePadrao: "facil", onChange: novo });
novo();
})();
