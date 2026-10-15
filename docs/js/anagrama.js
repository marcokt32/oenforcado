(() => {
"use strict";
const niveis = [
 {letras:"PEDRAS", palavras:["PEDRA","PERDA","PARES","PRESA","PESAR","SER","PAR","ERA"]},
 {letras:"CAMISA", palavras:["CAMISA","CASA","SAI","SACA","CAMA","MICA","MAIS","ASIA"]},
 {letras:"ROMETA", palavras:["AMOR","MORTE","TERMO","META","REMO","MATO","TEMA","RAMO"]},
 {letras:"PLANET", palavras:["PLANTE","PLENA","PENAL","PENA","LENTA","TELA","ANTE","LATE"]},
 {letras:"CARTAS", palavras:["CARTAS","CARTA","CASTA","TACAR","RASTA","CASA","ARCA","ATAR"]}
];
const $=id=>document.getElementById(id);
const letrasEl=$("letras"), input=$("palavra"), form=$("form-palavra"), msg=$("mensagem");
let nivel=0, pontos=0, encontrados=new Set(), letras=[];
const normalizar=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z]/g,"");
function embaralhar(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function renderLetras(){letrasEl.replaceChildren();embaralhar(letras).forEach((l,i)=>{const b=document.createElement("button");b.type="button";b.className="ana-letter";b.textContent=l;b.setAttribute("aria-label","Adicionar letra "+l);b.addEventListener("click",()=>{input.value+=l;input.focus();});letrasEl.appendChild(b);});}
function render(){const dados=niveis[nivel];letras=[...dados.letras];renderLetras();$("pontos").textContent=pontos;$("contador").textContent=`${encontrados.size} / ${dados.palavras.length}`;$("nivel").textContent=nivel+1;$("barra").style.width=`${encontrados.size/dados.palavras.length*100}%`;const area=$("encontradas");area.replaceChildren();if(!encontrados.size){const span=document.createElement("span");span.className="ana-empty";span.textContent="Suas descobertas aparecerão aqui.";area.appendChild(span);}else [...encontrados].sort().forEach(p=>{const span=document.createElement("span");span.className="ana-word";span.textContent=p;span.setAttribute("role","listitem");area.appendChild(span);});$("fim").hidden=encontrados.size!==dados.palavras.length;}
function avisar(texto,tipo=""){msg.textContent=texto;msg.className="ana-message "+tipo;}
function podeFormar(palavra, letrasOrigem){
 const disponiveis=[...normalizar(letrasOrigem)];
 for(const letra of [...normalizar(palavra)]){const i=disponiveis.indexOf(letra);if(i<0)return false;disponiveis.splice(i,1);}
 return true;
}
// Valida o banco antes de exibi-lo: palavras impossíveis nunca entram na contagem ou nas dicas.
for(const dados of niveis){
 dados.letras=normalizar(dados.letras);
 dados.palavras=[...new Set(dados.palavras.map(normalizar).filter(p=>p.length>=2&&podeFormar(p,dados.letras)))];
}
form.addEventListener("submit",e=>{e.preventDefault();const palavra=normalizar(input.value.trim());input.value="";if(palavra.length<2){avisar("Digite uma palavra com pelo menos 2 letras.","bad");return;}const dados=niveis[nivel];if(encontrados.has(palavra)){avisar("Você já encontrou essa palavra!","bad");return;}if(!dados.palavras.includes(palavra)||!podeFormar(palavra,dados.letras)){avisar("Essa palavra não faz parte deste desafio. Tente outra!","bad");return;}encontrados.add(palavra);pontos+=palavra.length*10;render();avisar(`Boa! +${palavra.length*10} pontos.`,"good");});
$("embaralhar").addEventListener("click",()=>{renderLetras();avisar("Letras embaralhadas!");});
$("limpar").addEventListener("click",()=>{input.value="";input.focus();avisar("Campo limpo.");});
$("dica").addEventListener("click",()=>{const dados=niveis[nivel];const faltam=dados.palavras.filter(p=>!encontrados.has(p)&&podeFormar(p,dados.letras));if(!faltam.length){avisar("Você já encontrou todas as palavras deste nível.");return;}const menor=Math.min(...faltam.map(p=>p.length));const candidatas=faltam.filter(p=>p.length===menor);const alvo=candidatas[Math.floor(Math.random()*candidatas.length)];avisar(`Dica: uma das palavras tem ${alvo.length} letras e começa com “${alvo[0]}”.`);});
$("proximo").addEventListener("click",()=>{nivel=(nivel+1)%niveis.length;encontrados=new Set();render();avisar("Novo nível! Descubra as palavras escondidas.");});
render();
})();