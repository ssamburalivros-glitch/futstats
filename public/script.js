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

async function carregarAoVivo() {
    const container = document.getElementById('lista-ao-vivo');
    if (!container) return;

    try {
        const { data, error } = await _supabase.from('jogos_ao_vivo').select('*');
        
        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p style="color:#888; padding:20px; width:100%; text-align:center;">Aguardando jogos começarem...</p>';
            return;
        }

        container.innerHTML = data.map(j => {
            // Garante que valores nulos não quebrem o HTML
            const placar = j.placar || "0 - 0";
            const timeC = j.time_casa || "Mandante";
            const timeF = j.time_fora || "Visitante";
            const status = j.status || "Tempo Real";

            return `
                <div class="card-hero">
                    <div class="hero-teams">
                        <div class="hero-team-box">
                            <img src="${j.logo_casa || ESCUDO_PADRAO}" class="hero-logo" onerror="this.src='${ESCUDO_PADRAO}'">
                            <span class="hero-name">${timeC}</span>
                        </div>
                        <div class="hero-score">${placar}</div>
                        <div class="hero-team-box">
                            <img src="${j.logo_fora || ESCUDO_PADRAO}" class="hero-logo" onerror="this.src='${ESCUDO_PADRAO}'">
                            <span class="hero-name">${timeF}</span>
                        </div>
                    </div>
                    <div class="hero-status"><span class="live-dot"></span> ${status}</div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error("Erro ao vivo:", e);
        container.innerHTML = '<p style="color:#555; text-align:center; width:100%;">Serviço de placares temporariamente indisponível.</p>';
    }
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
