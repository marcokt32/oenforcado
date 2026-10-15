(() => {
  'use strict';
  // Palavras e posições semânticas preparadas para o protótipo offline.
  // A posição 1 é sempre a resposta. Palpites fora desta lista não recebem ranking inventado.
  const desafios = [
    { alvo:'praia', dica:'Lugar associado ao mar, areia e descanso.', ranks:{praia:1,mar:2,areia:3,oceano:4,onda:5,banho:6,verao:7,sol:8,concha:9,coqueiro:10,ferias:11, litoral:12, barco:13,piscina:14,ilha:15,mergulho:16,protetor:17,biquini:18,calor:19,brisa:20,agua:21,peixe:22,navio:23,porto:24,hotel:25,viagem:26,descanso:27,guarda:28,esporte:29,vento:30,chuva:55,floresta:88,montanha:103,cidade:140,escola:210,livro:270,computador:340,panela:410,cachorro:460,musica:520,janela:610,planeta:720,teclado:810,cimento:920}},
    { alvo:'cachorro', dica:'Animal doméstico conhecido por latir e ser companheiro.', ranks:{cachorro:1,cão:2,filhote:3,latido:4,animal:5,canil:6,coleira:7,osso:8,pet:9,adestramento:10,canino:11,gato:14,veterinario:15,ração:16,passeio:17,brincar:18,guia:19,pata:20,pelo:21,amigo:22,doméstico:23,lobo:25,osso:8,abrigo:29,casinha:30,leite:48,coelho:54,cavalo:60,passaro:72,floresta:95,mar:150,praia:180,escola:220,livro:310,panela:430,música:500,janela:600,computador:700,planeta:810,cimento:930}},
    { alvo:'escola', dica:'Lugar onde alunos estudam e professores ensinam.', ranks:{escola:1,aluno:2,professor:3,estudar:4,aula:5,ensino:6,educação:7,caderno:8,prova:9,livro:10,quadro:11,carteira:12,lição:13,matéria:14,colegio:15,universidade:16,aprendizagem:17,estudante:18,mochila:19,lápis:20,caneta:21,intervalo:22,diretor:23,biblioteca:24,matemática:25,português:26,nota:27,curso:28,faculdade:29,infância:30,criança:31,brincadeira:42,amigo:45,emprego:75,escritório:90,cidade:110,livro:10,computador:130,mar:280,praia:320,cachorro:360,panela:420,música:70,planeta:700,cimento:910}},
    { alvo:'música', dica:'Arte feita com sons, ritmo e melodia.', ranks:{música:1,canção:2,som:3,melodia:4,ritmo:5,cantar:6,cantor:7,banda:8,instrumento:9,violão:10, guitarra:11,piano:12,bateria:13,rádio:14,show:15,concerto:16,compositor:17,letra:18,voz:19,dança:20,ouvir:21,disco:22,fone:23,orquestra:24,festival:25,artista:26,álbum:27,rock:28,samba:29,rap:30,escola:70,amigo:90,filme:42,teatro:43,livro:100,computador:140,praia:190,cachorro:330,panela:400,mar:220,planeta:680,cimento:930}},
    { alvo:'cozinha', dica:'Lugar da casa onde preparamos alimentos.', ranks:{cozinha:1,comida:2,cozinhar:3,panela:4,receita:5,forno:6,fogão:7,geladeira:8,alimento:9,prato:10,ingrediente:11,faca:12,colher:13,garfo:14,frigideira:15,mesa:16,tempero:17,assar:18,fritar:19,cozinheiro:20,refeição:21,almoço:22,jantar:23,café:24,água:25, pia:26,armário:27,bolo:28,pão:29,restaurante:30,mercado:31,família:44,casa:45,escola:110,livro:170,praia:240,cachorro:290,música:330,computador:390,mar:480,planeta:730,cimento:900}}
  ];
  const $ = id => document.getElementById(id);
  const form = $('form-palpite'), input = $('palpite'), list = $('ctx-lista');
  const normalizar = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g,' ');
  const hoje = new Date();
  const dataChave = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
  const inicio = Date.UTC(2026, 0, 1);
  const hojeUTC = Date.UTC(hoje.getFullYear(),hoje.getMonth(),hoje.getDate());
  const indice = Math.abs(Math.floor((hojeUTC-inicio)/86400000)) % desafios.length;
  const desafio = desafios[indice];
  const ranks = Object.fromEntries(Object.entries(desafio.ranks).map(([word,rank])=>[normalizar(word),rank]));
  const storageKey = `oenforcado-contexto-${dataChave}`;
  let palpites = [];
  let venceu = false;
  try { const saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); if(saved && Array.isArray(saved.palpites)){palpites=saved.palpites;venceu=Boolean(saved.venceu);} } catch (_) {}
  $('dia-desafio').textContent = `Desafio ${dataChave.split('-').reverse().join('/')}`;
  function salvar(){ try{localStorage.setItem(storageKey,JSON.stringify({palpites,venceu}));}catch(_){} }
  function posicao(rank){return rank===1?'Resposta':rank<=10?'Muito próximo':rank<=30?'Próximo':rank<=100?'No caminho':rank<=300?'Distante':'Muito distante';}
  function render(){
    list.innerHTML='';
    const ordenados=[...palpites].sort((a,b)=>a.rank-b.rank);
    ordenados.forEach(item=>{
      const li=document.createElement('li');li.className='ctx-item'+(item.rank===1?' won':'');
      const rank=document.createElement('span');rank.className='ctx-rank '+(item.rank<=10?'hot':item.rank<=100?'warm':'cold');rank.textContent=item.rank;
      const word=document.createElement('span');word.className='ctx-word';word.textContent=item.word;
      const dist=document.createElement('span');dist.className='ctx-distance';dist.textContent=posicao(item.rank);
      li.append(rank,word,dist);list.appendChild(li);
    });
    $('ctx-vazio').hidden=palpites.length>0;
    $('ctx-total').textContent=palpites.length;
    $('ctx-melhor').textContent=palpites.length?Math.min(...palpites.map(p=>p.rank)):'—';
    $('ctx-vitoria').hidden=!venceu;
    $('ctx-resposta').textContent=desafio.alvo.toLocaleUpperCase('pt-BR');
    $('ctx-resumo').textContent=`Você precisou de ${palpites.length} ${palpites.length===1?'palpite':'palpites'}.`;
    input.disabled=venceu;form.querySelector('button').disabled=venceu;
    $('dica-contexto').disabled=venceu;
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();if(venceu)return;
    const word=normalizar(input.value);
    if(!word || !/[a-z]/.test(word)){ $('ctx-mensagem').textContent='Digite uma palavra para tentar.';return; }
    if(palpites.some(p=>normalizar(p.word)===word)){ $('ctx-mensagem').textContent='Você já tentou essa palavra. Experimente outra!';input.select();return; }
    if(!Object.prototype.hasOwnProperty.call(ranks,word)){
      $('ctx-mensagem').textContent='Essa palavra ainda não tem uma posição contextual neste desafio. Tente outra palavra da lista de vocabulário.';return;
    }
    const rank=ranks[word];palpites.push({word:word.toLocaleUpperCase('pt-BR'),rank});
    if(rank===1){venceu=true;$('ctx-mensagem').textContent='Parabéns! Você encontrou a palavra secreta!';}
    else if(rank<=10){$('ctx-mensagem').textContent='Está muito perto! Continue explorando essa ideia.';}
    else if(rank<=30){$('ctx-mensagem').textContent='Boa! Você está chegando perto do contexto.';}
    else {$('ctx-mensagem').textContent='Palpite registrado. Pense em palavras relacionadas de forma mais direta.';}
    input.value='';salvar();render();input.focus();
  });
  $('dica-contexto').addEventListener('click',()=>{if(!venceu)$('ctx-mensagem').textContent=`Dica: ${desafio.dica}`;});
  $('reiniciar-contexto').addEventListener('click',()=>{if(!confirm('Apagar os palpites deste desafio e começar novamente?'))return;palpites=[];venceu=false;salvar();$('ctx-mensagem').textContent='Faça seu primeiro palpite para começar.';render();input.disabled=false;form.querySelector('button').disabled=false;input.focus();});
  $('ctx-proximo').addEventListener('click',()=>{window.location.href='/';});
  render();
  if(venceu)$('ctx-mensagem').textContent='Desafio concluído! Você já encontrou a palavra secreta de hoje.';
})();
