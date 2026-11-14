/* ============================================================
   sons.js  v1.0.0  (14/11/2026)
   Efeitos sonoros do O Enforcado, sintetizados com Web Audio API.
   Sem arquivos de áudio: custo zero, sem licença, sem rede.

   Uso:  Sons.tocar("acerto");   Sons.tocar("tecla", 3);
   Nomes: arrasto, flip, acerto, erro, vitoria, derrota, tecla(n),
          digitar, peca, explosao, bandeira, moeda, dica, clique
   ============================================================ */
(() => {
  "use strict";

  const CHAVE = "sons_off";
  let ctx = null, master = null, ruidoBuf = null, mudo = false;
  const ultimo = {};

  try { mudo = localStorage.getItem(CHAVE) === "1"; } catch (e) { /* armazenamento bloqueado */ }

  /* ---------- Motor ---------- */
  function iniciar() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); // evita estouro quando sons se sobrepõem
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(comp);
    comp.connect(ctx.destination);
    return ctx;
  }

  function bufferRuido() {
    if (ruidoBuf) return ruidoBuf;
    const n = ctx.sampleRate * 1.5;
    ruidoBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = ruidoBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return ruidoBuf;
  }

  function envelope(g, t, d, v, atk) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t + (atk || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  }

  // Nota/tom: f = frequência, t = início, d = duração
  function tom(f, t, d, o = {}) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.tipo || "sine";
    osc.frequency.setValueAtTime(f, t);
    if (o.ate) osc.frequency.exponentialRampToValueAtTime(o.ate, t + d);
    envelope(g, t, d, o.vol ?? 0.3, o.atk);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + d + 0.03);
  }

  // Ruído filtrado (cliques, arrastos, explosão)
  function ruido(t, d, o = {}) {
    const src = ctx.createBufferSource();
    src.buffer = bufferRuido();
    const f = ctx.createBiquadFilter();
    f.type = o.tipo || "bandpass";
    f.frequency.setValueAtTime(o.f0 || 1000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + d);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    envelope(g, t, d, o.vol ?? 0.3, o.atk);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random() * 0.5); src.stop(t + d + 0.03);
  }

  const PENTA = [0, 2, 4, 7, 9]; // escala pentatônica: qualquer sequência soa bem
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- Catálogo de sons (t = instante atual) ---------- */
  const SONS = {
    // Quebra-cabeça deslizante: peça raspando na bandeja
    arrasto(t) {
      ruido(t, 0.13, { tipo: "bandpass", f0: 700, f1: 2200, q: 2, vol: 0.22 });
      tom(220, t, 0.08, { ate: 150, vol: 0.07 });
    },
    // Memória e Kyudoku: carta/número virando
    flip(t) {
      ruido(t, 0.035, { tipo: "highpass", f0: 3200, vol: 0.28 });
      tom(540, t + 0.01, 0.1, { tipo: "triangle", ate: 260, vol: 0.18 });
      ruido(t + 0.07, 0.03, { tipo: "bandpass", f0: 1500, q: 3, vol: 0.12 });
    },
    // Acerto breve (forca, anagrama, termo...)
    acerto(t) {
      tom(660, t, 0.09, { tipo: "triangle", vol: 0.26 });
      tom(990, t + 0.08, 0.16, { tipo: "triangle", vol: 0.26 });
    },
    // Erro breve
    erro(t) {
      tom(165, t, 0.22, { tipo: "sawtooth", ate: 90, vol: 0.2 });
      tom(155, t, 0.22, { tipo: "square", ate: 85, vol: 0.08 });
    },
    // Fanfarra de vitória
    vitoria(t) {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        tom(f, t + i * 0.11, 0.2, { tipo: "triangle", vol: 0.26 });
        tom(f, t + i * 0.11, 0.2, { tipo: "square", vol: 0.05 });
      });
      [523.25, 659.25, 783.99, 1046.5].forEach(f => {
        tom(f, t + 0.46, 0.75, { tipo: "triangle", vol: 0.17, atk: 0.01 });
      });
      tom(1568, t + 0.62, 0.5, { vol: 0.08 }); // brilho final
    },
    // Fanfarra de derrota (descendente, "wah wah")
    derrota(t) {
      [392, 349.23, 311.13].forEach((f, i) => {
        tom(f, t + i * 0.22, 0.28, { tipo: "sawtooth", vol: 0.12 });
        tom(f * 0.5, t + i * 0.22, 0.28, { tipo: "triangle", vol: 0.12 });
      });
      tom(261.63, t + 0.68, 0.9, { tipo: "sawtooth", ate: 196, vol: 0.13, atk: 0.02 });
      tom(130.8, t + 0.68, 0.9, { tipo: "triangle", ate: 98, vol: 0.15, atk: 0.02 });
    },
    // Anagrama: cada letra escolhida sobe um degrau (n = 0, 1, 2...)
    tecla(t, n = 0) {
      n = Math.max(0, Math.min(n | 0, 14));
      const f = 392 * Math.pow(2, PENTA[n % 5] / 12) * Math.pow(2, Math.floor(n / 5));
      tom(f, t, 0.13, { tipo: "triangle", vol: 0.24 });
      ruido(t, 0.02, { tipo: "highpass", f0: 4000, vol: 0.1 });
    },
    // Termo: digitação mecânica (varia um pouco a cada toque)
    digitar(t) {
      ruido(t, 0.03, { tipo: "highpass", f0: rnd(2500, 4000), vol: 0.3 });
      tom(rnd(170, 220), t, 0.045, { vol: 0.14 });
    },
    // Damas (e peças em geral): "toc" de madeira no tabuleiro
    peca(t) {
      const k = rnd(0.94, 1.06);
      tom(210 * k, t, 0.11, { ate: 115 * k, vol: 0.4 });
      ruido(t, 0.05, { tipo: "lowpass", f0: 1900, f1: 400, vol: 0.28 });
    },
    // Campo minado: explosão
    explosao(t) {
      ruido(t, 0.09, { tipo: "highpass", f0: 1500, vol: 0.4 });
      ruido(t, 1.15, { tipo: "lowpass", f0: 2400, f1: 55, q: 0.7, vol: 0.75, atk: 0.008 });
      tom(115, t, 0.95, { ate: 34, vol: 0.6, atk: 0.008 });
    },
    // Extras
    bandeira(t) { tom(440, t, 0.07, { tipo: "triangle", vol: 0.22 }); tom(330, t + 0.06, 0.1, { tipo: "triangle", vol: 0.2 }); },
    moeda(t) { tom(988, t, 0.07, { tipo: "square", vol: 0.12 }); tom(1319, t + 0.07, 0.25, { tipo: "square", vol: 0.12 }); },
    dica(t) { tom(880, t, 0.12, { ate: 1320, vol: 0.18 }); tom(1760, t + 0.1, 0.18, { vol: 0.1 }); },
    clique(t) { ruido(t, 0.025, { tipo: "bandpass", f0: 2200, q: 2, vol: 0.2 }); }
  };

  /* ---------- API pública ---------- */
  function tocar(nome, arg) {
    if (mudo || document.hidden || !SONS[nome]) return;
    const agora = performance.now();
    if (ultimo[nome] && agora - ultimo[nome] < 25) return; // evita rajadas do mesmo som
    ultimo[nome] = agora;
    try {
      if (!iniciar()) return;
      if (ctx.state === "suspended") ctx.resume();
      SONS[nome](ctx.currentTime + 0.001, arg);
    } catch (e) { /* som nunca pode quebrar o jogo */ }
  }

  function definirMudo(v) {
    mudo = !!v;
    try { localStorage.setItem(CHAVE, mudo ? "1" : "0"); } catch (e) { }
    atualizarBotao();
    if (!mudo) tocar("clique");
    if (typeof gtag === "function") gtag("event", "sons_toggle", { ligado: !mudo });
  }

  /* ---------- Botão liga/desliga ---------- */
  let botao = null;
  function atualizarBotao() {
    if (!botao) return;
    botao.textContent = mudo ? "🔇" : "🔊";
    botao.setAttribute("aria-pressed", mudo ? "false" : "true");
    botao.title = mudo ? "Ativar sons" : "Desativar sons";
    botao.setAttribute("aria-label", botao.title);
  }

  function criarBotao() {
    if (document.getElementById("sons-botao")) return;
    const css = document.createElement("style");
    css.textContent =
      ".sons-botao{position:fixed;left:14px;bottom:14px;z-index:70;display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;border-radius:50%;" +
      "background:linear-gradient(180deg,rgba(255,255,255,.42) 0,rgba(255,255,255,.14) 48%,rgba(255,255,255,0) 50%),linear-gradient(180deg,#fff 0,#f1f5fb 55%,#e0e8f3 100%);" +
      "box-shadow:0 3px 0 #c3d0e2,0 7px 12px rgba(10,37,64,.14),inset 0 2px 1px rgba(255,255,255,.7);font-size:1.2rem;line-height:1;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease}" +
      "body:has(.tema-botao) .sons-botao{left:66px}" +
      ".sons-botao:hover{transform:translateY(-1px)}" +
      ".sons-botao:active{transform:translateY(2px);box-shadow:0 1px 0 #c3d0e2,inset 0 2px 3px rgba(10,37,64,.16)}" +
      ".sons-botao:focus-visible{outline:3px solid #93c5fd;outline-offset:3px}" +
      ".sons-botao[aria-pressed=false]{opacity:.65}" +
      "@media print{.sons-botao{display:none}}";
    document.head.appendChild(css);
    botao = document.createElement("button");
    botao.type = "button"; botao.id = "sons-botao"; botao.className = "sons-botao";
    botao.addEventListener("click", () => definirMudo(!mudo));
    document.body.appendChild(botao);
    atualizarBotao();
  }

  // Navegadores só liberam áudio após um gesto do usuário: destrava no primeiro toque
  const destravar = () => { iniciar(); if (ctx && ctx.state === "suspended") ctx.resume(); };
  ["pointerdown", "keydown", "touchstart"].forEach(ev => document.addEventListener(ev, destravar, { once: true, passive: true }));

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", criarBotao); else criarBotao();

  window.Sons = { tocar, mudo: () => mudo, alternar: () => definirMudo(!mudo), nomes: () => Object.keys(SONS) };
})();
