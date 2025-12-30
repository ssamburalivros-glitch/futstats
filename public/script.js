// --- CONFIGURAÇÃO DO NÚCLEO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DECLARAÇÃO ÚNICA DA CONSTANTE
const ESCUDO_PADRAO = "https://cdn-icons-png.flaticon.com/512/53/53244.png";

// --- INICIALIZAÇÃO SEGURA ---
document.addEventListener('DOMContentLoaded', () => {
    const ehHome = document.getElementById('tabela-corpo');
    const ehArena = document.getElementById('liga-a');

    if (ehHome) {
        carregarIA();
        carregarAoVivo();
        carregarTabela('BR');
        configurarFiltrosLigas();
    }

    if (ehArena) {
        configurarH2H();
    }

    // Listener global para fechar modal
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) closeBtn.onclick = fecharModalTime;
    
    window.onclick = (e) => {
        const modal = document.getElementById('modal-time');
        const modalLive = document.getElementById('modal-live');
        if (e.target == modal) fecharModalTime();
        if (e.target == modalLive) fecharModalLive();
    };
});

// --- FUNÇÕES DA HOME ---

async function carregarIA() {
    try {
        const { data } = await _supabase.from('site_info').select('comentario_ia').eq('id', 1).single();
        const boxIA = document.getElementById('ia-box');
        if (data?.comentario_ia && boxIA) {
            boxIA.innerText = data.comentario_ia;
        }
    } catch (e) { 
        console.warn("IA offline."); 
    }
}

async function carregarAoVivo() {
    try {
        const { data, error } = await _supabase.from('jogos_ao_vivo').select('*');
        const container = document.getElementById('lista-ao-vivo');

        if (error || !container) return;

        if (!data || data.length === 0) {
            container.innerHTML = "<p class='status-msg'>BUSCANDO TRANSMISSÕES...</p>";
            return;
        }

        container.innerHTML = data.map(jogo => {
            const casaNome = jogo.time_casa || "Time A";
            const foraNome = jogo.time_fora || "Time B";
            
            // Ajustado para os novos nomes de coluna: logo_casa e logo_fora
            const imgC = (jogo.logo_casa && jogo.logo_casa !== "null") ? jogo.logo_casa : ESCUDO_PADRAO;
            const imgF = (jogo.logo_fora && jogo.logo_fora !== "null") ? jogo.logo_fora : ESCUDO_PADRAO;

            // O ID agora é jogo.id (conforme o novo crawler)
            return `
                <div class="card-hero" onclick="abrirDetalhesAoVivo('${jogo.id}', '${casaNome}', '${foraNome}')">
                    <div class="tempo-tag">${jogo.status || "LIVE"}</div>
                    <div class="hero-score">
                        <span>${jogo.placar || "0 - 0"}</span>
                    </div>
                    <div class="team-v">
                        <img src="${imgC}" class="img-mini" onerror="this.src='${ESCUDO_PADRAO}'" alt="casa">
                        <img src="${imgF}" class="img-mini" onerror="this.src='${ESCUDO_PADRAO}'" alt="fora">
                    </div>
                    <div class="team-names-mini">${casaNome.substring(0, 10)} vs ${foraNome.substring(0, 10)}</div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error("Erro ao carregar logos live:", e);
    }
}

async function abrirDetalhesAoVivo(idJogo, casa, fora) {
    const modal = document.getElementById('modal-live');
    if (!modal) return;

    modal.style.display = 'flex';
    document.getElementById('live-teams').innerText = `${casa} x ${fora}`;
    
    // Reset de carregamento
    const listHome = document.getElementById('list-home');
    const listAway = document.getElementById('list-away');
    listHome.innerHTML = "Carregando detalhes...";
    listAway.innerHTML = "";

    try {
        // Busca os detalhes usando o jogo_id
        const { data, error } = await _supabase
            .from('detalhes_partida')
            .select('*')
            .eq('jogo_id', idJogo)
            .single();

        if (error || !data) {
            listHome.innerHTML = "Estatísticas ainda não disponíveis para este jogo.";
            return;
        }

        // 1. ATUALIZAR BARRAS DE POSSE E CHUTES
        // Certifique-se de que esses IDs existam no seu HTML
        const barraCasa = document.getElementById('live-posse-casa');
        const barraFora = document.getElementById('live-posse-fora');
        
        if (barraCasa && barraFora) {
            const pCasa = data.posse_casa || 50;
            const pFora = data.posse_fora || 50;
            barraCasa.style.width = `${pCasa}%`;
            barraCasa.innerText = `${pCasa}%`;
            barraFora.style.width = `${pFora}%`;
            barraFora.innerText = `${pFora}%`;
        }

        // Exibir Chutes (se você tiver esses elementos no HTML)
        const chutesEl = document.getElementById('live-chutes');
        if (chutesEl) {
            chutesEl.innerText = `Finalizações: ${data.chutes_casa} - ${data.chutes_fora}`;
        }

        // 2. FORMATAR ESCALAÇÕES (Tratando como Array de Objetos)
        const formatarEscalacao = (lista) => {
            if (!lista || lista.length === 0) return "Não disponível";
            return lista.map(p => `<span><strong>${p.p}</strong> - ${p.n}</span>`).join('<br>');
        };

        listHome.innerHTML = `<h3>${casa}</h3>` + formatarEscalacao(data.escalacao_casa);
        listAway.innerHTML = `<h3>${fora}</h3>` + formatarEscalacao(data.escalacao_fora);

    } catch (e) {
        console.error("Erro ao abrir modal:", e);
        listHome.innerHTML = "Erro ao carregar dados.";
    }
}

async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    if (!corpo) return;

    try {
        const { data, error } = await _supabase.from('tabelas_ligas').select('*').eq('liga', liga).order('posicao');
        if (error) throw error;

        corpo.innerHTML = data.map(item => {
            const dadosTime = JSON.stringify(item).replace(/'/g, "&apos;");
            return `
                <tr class="row-interativa" onclick='abrirModalTime(${dadosTime})'>
                    <td>${item.posicao}º</td>
                    <td>
                        <div class="team-clickable">
                            <img src="${item.escudo || ESCUDO_PADRAO}" class="team-cell-img" onerror="this.src='${ESCUDO_PADRAO}'">
                            <span>${item.time}</span>
                        </div>
                    </td>
                    <td align="center">${item.jogos}</td>
                    <td align="center" style="color:#00ff88; font-weight:bold;">${item.pontos}</td>
                </tr>
            `;
        }).join('');
    } catch (e) { console.error(e); }
}

function abrirModalTime(time) {
    const modal = document.getElementById('modal-time');
    if (!modal) return;

    const campos = {
        'modal-nome-time': time.time,
        'modal-pos': (time.posicao || '0') + "º",
        'modal-pts': time.pontos || '0',
        'modal-v': time.vitorias || '0',
        'modal-e': time.empates || '0',
        'modal-d': time.derrotas || '0',
        'modal-sg': time.sg || '0'
    };

    for (let id in campos) {
        const el = document.getElementById(id);
        if (el) el.innerText = campos[id];
    }

    const img = document.getElementById('modal-escudo');
    if (img) img.src = time.escudo || ESCUDO_PADRAO;

    modal.style.display = 'flex';
}

function fecharModalTime() {
    const modal = document.getElementById('modal-time');
    if (modal) modal.style.display = 'none';
}

// --- ARENA H2H ---

function configurarH2H() {
    ['liga-a', 'liga-b'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', async function() {
                const lado = id.split('-')[1];
                const selectTime = document.getElementById(`time-${lado}`);
                const { data } = await _supabase.from('tabelas_ligas').select('*').eq('liga', this.value).order('time');
                
                if (selectTime) {
                    selectTime.innerHTML = '<option value="">Selecione o Time</option>';
                    data?.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = JSON.stringify(t);
                        opt.innerText = t.time;
                        selectTime.appendChild(opt);
                    });
                    selectTime.disabled = false;
                }
            });
        }
    });

    const timeB = document.getElementById('time-b');
    if (timeB) {
        timeB.addEventListener('change', () => {
            const valA = document.getElementById('time-a').value;
            const valB = document.getElementById('time-b').value;
            if (valA && valB) processarDuelo(JSON.parse(valA), JSON.parse(valB));
        });
    }
}

function processarDuelo(a, b) {
    const display = document.getElementById('h2h-display');
    if (!display) return;
    display.style.display = 'block';

    document.getElementById('img-a').src = a.escudo || ESCUDO_PADRAO;
    document.getElementById('img-b').src = b.escudo || ESCUDO_PADRAO;
    document.getElementById('name-a').innerText = a.time;
    document.getElementById('name-b').innerText = b.time;

    document.getElementById('pos-a').innerText = a.posicao || 0;
    document.getElementById('pos-b').innerText = b.posicao || 0;
    document.getElementById('pts-a').innerText = a.pontos || 0;
    document.getElementById('pts-b').innerText = b.pontos || 0;
    document.getElementById('sg-a').innerText = a.sg || 0;
    document.getElementById('sg-b').innerText = b.sg || 0;

    const pA = (a.pontos * 0.6) + ((a.sg || 0) * 0.4) + 10;
    const pB = (b.pontos * 0.6) + ((b.sg || 0) * 0.4) + 10;
    const winA = Math.round((pA / (pA + pB)) * 100);
    const winB = 100 - winA;

    document.getElementById('bar-a').style.width = `${winA}%`;
    document.getElementById('bar-b').style.width = `${winB}%`;
    document.getElementById('perc-a').innerText = `${winA}%`;
    document.getElementById('perc-b').innerText = `${winB}%`;

    const pred = document.getElementById('prediction-text');
    if(pred) {
        pred.innerText = winA > winB + 8 ? `PROBABILIDADE: ${a.time} FAVORITO` : 
                         winB > winA + 8 ? `PROBABILIDADE: ${b.time} FAVORITO` : 
                         "PROBABILIDADE: JOGO EQUILIBRADO";
    }
}

function configurarFiltrosLigas() {
    document.querySelectorAll('.league-btn').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('.league-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            carregarTabela(this.dataset.liga);
        };
    });
}
