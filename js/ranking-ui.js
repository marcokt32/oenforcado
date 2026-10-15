function abrirRanking(){

    document.getElementById("modalRanking").classList.remove("oculto");

    carregarRanking();

}

function fecharRanking(){

    document.getElementById("modalRanking").classList.add("oculto");

}

function carregarRanking(){

    const topDiv = document.getElementById("ranking-top10");
    topDiv.innerHTML = "<p class='ranking-vazio'>Carregando...</p>";

    if (typeof atualizarBlocosAuth === "function") atualizarBlocosAuth();

    db.ref("ranking").orderByChild("xp").limitToLast(10).once("value").then(snapshot =>{

        const top10 = [];

        snapshot.forEach(filho => { top10.push([filho.key, filho.val()]); });

        top10.sort((a,b)=> (b[1].xp || 0) - (a[1].xp || 0));

        topDiv.innerHTML = "";

        if (!top10.length) {
            topDiv.innerHTML = "<p class='ranking-vazio'>Ninguém no ranking ainda. Seja o primeiro!</p>";
        }

        top10.forEach(([id,player],index)=>{

            topDiv.innerHTML += `
                <div class="ranking-linha">
                    <div class="left-ui-info">
                        <span>${index+1}º</span>
                        <img src="${escaparHTML(player.avatar)}" alt="">
                    </div>
                    <span>${escaparHTML(player.nome)}</span>
                    <span>${Number(player.xp) || 0}</span>
                </div>
            `;

        });

    }).catch(()=>{

        topDiv.innerHTML = "<p class='ranking-vazio'>Não foi possível carregar o ranking agora.</p>";

    });

    carregarMinhaPosicao();

}

function carregarMinhaPosicao(){

    const meuDiv = document.getElementById("ranking-meu");
    const conta = firebase.auth().currentUser;

    meuDiv.innerHTML = "";

    if (!conta) return;

    db.ref("ranking/" + conta.uid).once("value").then(snap =>{

        const eu = snap.val();
        if (!eu) return null;

        // conta só quem tem mais XP que eu (máx. 101, para não baixar o ranking inteiro)
        return db.ref("ranking").orderByChild("xp").startAt((eu.xp || 0) + 1).limitToFirst(101).once("value")
            .then(acima => {

                const total = acima.numChildren();
                const posicao = total > 100 ? "100+" : (total + 1);

                meuDiv.innerHTML = `
                    <h3># Sua posição</h3>
                    <div class="ranking-linha">
                        <span>${posicao}º</span>
                        <img src="${escaparHTML(eu.avatar)}" alt="">
                        <span>${escaparHTML(eu.nome)}</span>
                        <span>${Number(eu.xp) || 0}</span>
                    </div>
                `;

            });

    }).catch(()=>{});

}
