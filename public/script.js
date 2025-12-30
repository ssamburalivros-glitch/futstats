// --- CONFIGURAÇÃO DO NÚCLEO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_PADRAO = "https://cdn-icons-png.flaticon.com/512/53/53244.png";

// --- INICIALIZAÇÃO SEGURA ---
document.addEventListener('DOMContentLoaded', () => {
    // Detecta em qual página estamos para não rodar script onde não deve
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
        if (e.target == modal) fecharModalTime();
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
        console.warn("IA offline ou campo inexistente."); 
    }
}

// Função para carregar os cards de jogos ao vivo
// --- CONFIGURAÇÃO ---
const ESCUDO_PADRAO = "https://cdn-icons-png.flaticon.com/512/53/53244.png";

// --- FUNÇÃO PRINCIPAL: CARREGAR JOGOS AO VIVO ---
async function carregarAoVivo() {
    try {
        // Buscamos os dados da tabela 'jogos_ao_vivo'
        const { data, error } = await _supabase.from('jogos_ao_vivo').select('*');
        const container = document.getElementById('lista-ao-vivo');

        if (error) throw error;
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = "<p class='status-msg'>BUSCANDO TRANSMISSÕES...</p>";
            return;
        }

        // Mapeamento dos dados para o HTML
        container.innerHTML = data.map(jogo => {
            // SEGURANÇA: Se o valor for null/undefined, vira 0 ou texto padrão
            const casaNome = jogo.time_casa || "Time A";
            const foraNome = jogo.time_fora || "Time B";
            const casaPlacar = jogo.placar_casa ?? 0;
            const foraPlacar = jogo.placar_fora ?? 0;
            const tempoPartida = jogo.tempo || "LIVE";
            
            // Tratamento de imagens
            const imgC = (jogo.escudo_casa && jogo.escudo_casa.includes('http')) ? jogo.escudo_casa : ESCUDO_PADRAO;
            const imgF = (jogo.escudo_fora && jogo.escudo_fora.includes('http')) ? jogo.escudo_fora : ESCUDO_PADRAO;

            return `
                <div class="card-hero" onclick="abrirDetalhesAoVivo('${jogo.id_espn}', '${casaNome}', '${foraNome}')">
                    <div class="tempo-tag">${tempoPartida}</div>
                    <div class="hero-score">
                        <span>${casaPlacar}</span>
                        <span class="divider">-</span>
                        <span>${foraPlacar}</span>
                    </div>
                    <div class="team-v">
                        <img src="${imgC}" class="img-mini" onerror="this.src='${ESCUDO_PADRAO}'" alt="${casaNome}">
                        <img src="${imgF}" class="img-mini" onerror="this.src='${ESCUDO_PADRAO}'" alt="${foraNome}">
                    </div>
                    <div class="team-names-mini">${casaNome.substring(0, 10)} vs ${foraNome.substring(0, 10)}</div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error("Erro ao renderizar jogos ao vivo:", e);
    }
}

// --- FUNÇÃO: ABRIR DETALHES (MODAL) ---
async function abrirDetalhesAoVivo(idEspn, casa, fora) {
    const modal = document.getElementById('modal-live');
    if (!modal) return;

    // Mostra o modal imediatamente com um "loading"
    modal.style.display = 'flex';
    document.getElementById('live-teams').innerText = `${casa} x ${fora}`;
    
    // Limpa dados anteriores
    document.getElementById('list-home').innerHTML = "Carregando escalação...";
    document.getElementById('list-away').innerHTML = "";

    try {
        const { data, error } = await _supabase
            .from('detalhes_partida')
            .select('*')
            .eq('jogo_id', idEspn)
            .single();

        if (error || !data) {
            document.getElementById('list-home').innerHTML = "Estatísticas ainda não disponíveis para este jogo.";
            return;
        }

        // Atualiza Barras de Posse
        const posseC = data.posse_casa || 50;
        const posseF = data.posse_fora || 50;
        document.getElementById('live-posse-casa').style.width = `${posseC}%`;
        document.getElementById('live-posse-fora').style.width = `${posseF}%`;

        // Atualiza Escalações (Trabalhando com JSONB)
        const listaCasa = Array.isArray(data.escalacao_casa) ? data.escalacao_casa : [];
        const listaFora = Array.isArray(data.escalacao_fora) ? data.escalacao_fora : [];

        document.getElementById('list-home').innerHTML = `<strong>${casa}</strong><br>` + listaCasa.join('<br>');
        document.getElementById('list-away').innerHTML = `<strong>${fora}</strong><br>` + listaFora.join('<br>');

    } catch (e) {
        console.error("Erro ao buscar detalhes:", e);
    }
}

function fecharModalLive() {
    document.getElementById('modal-live').style.display = 'none';
}

async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    if (!corpo) return;

    try {
        const { data, error } = await _supabase.from('tabelas_ligas').select('*').eq('liga', liga).order('posicao');
        
        if (error) throw error;

        corpo.innerHTML = data.map(item => {
            // Proteção contra aspas no nome do time ao converter para JSON
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
    } catch (e) { 
        console.error("Erro tabela:", e); 
    }
}

// --- FUNÇÕES DO MODAL ---

function abrirModalTime(time) {
    const modal = document.getElementById('modal-time');
    if (!modal) return;

    // Atualiza os campos do modal com segurança
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
        if (!el) return;
        
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
    });

    const timeB = document.getElementById('time-b');
    if (timeB) {
        timeB.addEventListener('change', () => {
            const valA = document.getElementById('time-a').value;
            const valB = document.getElementById('time-b').value;
            if (valA && valB) {
                processarDuelo(JSON.parse(valA), JSON.parse(valB));
            }
        });
    }
}

function processarDuelo(a, b) {
    const display = document.getElementById('h2h-display');
    if (!display) return;
    display.style.display = 'block';

    // Imagens e Nomes
    document.getElementById('img-a').src = a.escudo || ESCUDO_PADRAO;
    document.getElementById('img-b').src = b.escudo || ESCUDO_PADRAO;
    document.getElementById('name-a').innerText = a.time;
    document.getElementById('name-b').innerText = b.time;

    // Estatísticas Base
    const stats = ['posicao', 'pontos', 'sg'];
    stats.forEach(s => {
        document.getElementById(`${s.substring(0,3)}-a`).innerText = a[s] || 0;
        document.getElementById(`${s.substring(0,3)}-b`).innerText = b[s] || 0;
    });

    // Probabilidade Realista
    const pA = (a.pontos * 0.6) + ((a.sg || 0) * 0.4) + 10;
    const pB = (b.pontos * 0.6) + ((b.sg || 0) * 0.4) + 10;
    
    const winA = Math.round((pA / (pA + pB)) * 100);
    const winB = 100 - winA;

    const barA = document.getElementById('bar-a');
    const barB = document.getElementById('bar-b');
    if(barA && barB) {
        barA.style.width = `${winA}%`;
        barB.style.width = `${winB}%`;
        document.getElementById('perc-a').innerText = `${winA}%`;
        document.getElementById('perc-b').innerText = `${winB}%`;
    }

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
