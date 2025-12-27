// --- CONFIGURAÇÃO DO NÚCLEO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";

const ESCUDO_PADRAO = "https://cdn-icons-png.flaticon.com/512/53/53244.png";

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // Se estiver na Home
    if (document.getElementById('tabela-corpo')) {
        carregarIA();
        carregarAoVivo();
        carregarTabela('BR');
        configurarFiltrosLigas();
    }

    // Se estiver na Arena
    if (document.getElementById('liga-a')) {
        configurarH2H();
    }
});

// --- FUNÇÕES DA HOME ---
async function carregarIA() {
    try {
        const { data } = await _supabase.from('site_info').select('comentario_ia').eq('id', 1).single();
        if (data?.comentario_ia) document.getElementById('ia-box').innerText = data.comentario_ia;
    } catch (e) { console.error("IA Offline"); }
}

async function carregarAoVivo() {
    try {
        const { data } = await _supabase.from('jogos_ao_vivo').select('*');
        const container = document.getElementById('lista-ao-vivo');
        if (!data || data.length === 0) return;

        container.innerHTML = data.map(jogo => `
            <div class="card-hero">
                <div style="font-size:0.55rem; color:var(--neon-blue); font-weight:bold;">${jogo.tempo || 'LIVE'}</div>
                <div class="hero-score">${jogo.placar_casa ?? 0} - ${jogo.placar_fora ?? 0}</div>
                <div class="team-v">
                    <img src="${jogo.escudo_casa || ESCUDO_PADRAO}" class="img-mini" onerror="this.src='${ESCUDO_PADRAO}'">
                    <img src="${jogo.escudo_fora || ESCUDO_PADRAO}" class="img-mini" onerror="this.src='${ESCUDO_PADRAO}'">
                </div>
                <div style="font-size:0.5rem; color:#666;">${jogo.time_casa}</div>
            </div>
        `).join('');
    } catch (e) { console.error("Erro Live"); }
}

async function carregarTabela(liga) {
    const { data } = await _supabase.from('tabelas_ligas').select('*').eq('liga', liga).order('posicao');
    const corpo = document.getElementById('tabela-corpo');
    if (!corpo) return;
    corpo.innerHTML = data.map(item => `
        <tr class="row-interativa" onclick="abrirModalTime(${JSON.stringify(item)})">
            <td style="font-size:0.7rem; color:#444;">${item.posicao}</td>
            <td>
                <div class="team-clickable">
                    <img src="${item.escudo || ESCUDO_PADRAO}" class="team-cell-img" onerror="this.src='${ESCUDO_PADRAO}'">
                    <span>${item.time}</span>
                </div>
            </td>
            <td align="center">${item.jogos}</td>
            <td align="center" style="color:var(--neon-blue); font-weight:bold;">${item.pontos}</td>
        </tr>
    `).join('');
}

// --- FUNÇÕES DA ARENA H2H (ATUALIZADO COM DETALHES) ---
function configurarH2H() {
    ['liga-a', 'liga-b'].forEach(id => {
        document.getElementById(id).addEventListener('change', async function() {
            const lado = id.split('-')[1];
            const selectTime = document.getElementById(`time-${lado}`);
            const { data } = await _supabase.from('tabelas_ligas').select('*').eq('liga', this.value).order('time');
            
            selectTime.innerHTML = '<option value="">Selecione o Time</option>';
            data.forEach(t => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(t);
                opt.innerText = t.time;
                selectTime.appendChild(opt);
            });
            selectTime.disabled = false;
        });
    });

    document.getElementById('time-b').addEventListener('change', () => {
        const timeA = JSON.parse(document.getElementById('time-a').value);
        const timeB = JSON.parse(document.getElementById('time-b').value);
        processarDuelo(timeA, timeB);
    });
}

function processarDuelo(a, b) {
    document.getElementById('h2h-display').style.display = 'block';

    // Imagens e Nomes
    document.getElementById('img-a').src = a.escudo || ESCUDO_PADRAO;
    document.getElementById('img-b').src = b.escudo || ESCUDO_PADRAO;
    document.getElementById('name-a').innerText = a.time;
    document.getElementById('name-b').innerText = b.time;

    // Dados Estatísticos
    document.getElementById('pos-a').innerText = `${a.posicao}º`;
    document.getElementById('pos-b').innerText = `${b.posicao}º`;
    document.getElementById('pts-a').innerText = a.pontos;
    document.getElementById('pts-b').innerText = b.pontos;
    document.getElementById('sg-a').innerText = a.sg || 0;
    document.getElementById('sg-b').innerText = b.sg || 0;

    // Cálculo de Probabilidade Neural
    // Fórmula: (Pontos * 0.7) + (Saldo de Gols * 0.3)
    const powerA = (a.pontos * 0.7) + ((a.sg || 0) * 0.3) + 1; // +1 para evitar divisão por zero
    const powerB = (b.pontos * 0.7) + ((b.sg || 0) * 0.3) + 1;
    
    const total = powerA + powerB;
    const winA = Math.round((powerA / total) * 100);
    const winB = 100 - winA;

    // Atualiza Barras e Porcentagens
    document.getElementById('bar-a').style.width = `${winA}%`;
    document.getElementById('bar-b').style.width = `${winB}%`;
    document.getElementById('perc-a').innerText = `${winA}%`;
    document.getElementById('perc-b').innerText = `${winB}%`;

    // Veredito
    const pred = document.getElementById('prediction-text');
    if (winA > winB + 10) {
        pred.innerText = `PROGNÓSTICO: VITÓRIA DO ${a.time.toUpperCase()}`;
        pred.style.borderColor = "var(--neon-blue)";
    } else if (winB > winA + 10) {
        pred.innerText = `PROGNÓSTICO: VITÓRIA DO ${b.time.toUpperCase()}`;
        pred.style.borderColor = "var(--neon-purple)";
    } else {
        pred.innerText = "PROGNÓSTICO: ALTO RISCO DE EMPATE";
        pred.style.borderColor = "#888";
    }
}

// --- AUXILIARES ---
function configurarFiltrosLigas() {
    document.querySelectorAll('.league-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.league-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            carregarTabela(this.dataset.liga);
        });
    });
}
