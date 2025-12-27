// Configurações do Supabase
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_FALLBACK = 'https://cdn-icons-png.flaticon.com/512/53/53283.png';
let dadosTimesGlobal = [];
let timeA_Selecionado = null;
let timeB_Selecionado = null;

// 1. INICIALIZAÇÃO
async function init() {
    await carregarIA();
    await carregarAoVivo();
    await buscarDadosTabela();
    configurarFiltrosLiga();
}

// 2. BUSCAR DADOS DO SUPABASE
async function buscarDadosTabela() {
    const { data, error } = await _supabase
        .from('tabelas_ligas')
        .select('*')
        .order('pontos', { ascending: false });

    if (data) {
        dadosTimesGlobal = data;
        popularSelectsH2H(data);
        renderizarTabela('BR'); // Inicia com Brasil
    }
}

// 3. POPULAR SELECTS H2H
function popularSelectsH2H(times) {
    const selectA = document.getElementById('time-a');
    const selectB = document.getElementById('time-b');
    
    const options = times.map(t => `<option value="${t.time}">${t.time}</option>`).join('');
    selectA.innerHTML = '<option value="">Selecione o Time 1</option>' + options;
    selectB.innerHTML = '<option value="">Selecione o Time 2</option>' + options;
}

// 4. LÓGICA DE COMPARAÇÃO H2H
function atualizarComparativo() {
    const nomeA = document.getElementById('time-a').value;
    const nomeB = document.getElementById('time-b').value;

    if (!nomeA || !nomeB) return;

    timeA_Selecionado = dadosTimesGlobal.find(t => t.time === nomeA);
    timeB_Selecionado = dadosTimesGlobal.find(t => t.time === nomeB);

    document.getElementById('h2h-display').style.display = 'block';

    // Update UI Básica
    document.getElementById('img-a').src = timeA_Selecionado.escudo || ESCUDO_FALLBACK;
    document.getElementById('img-b').src = timeB_Selecionado.escudo || ESCUDO_FALLBACK;
    document.getElementById('name-a').innerText = timeA_Selecionado.time;
    document.getElementById('name-b').innerText = timeB_Selecionado.time;

    // Power Ranking & Efeito On-Fire
    const pA = timeA_Selecionado.power_ranking || 75;
    const pB = timeB_Selecionado.power_ranking || 72;
    
    const elA = document.getElementById('power-a');
    const elB = document.getElementById('power-b');
    
    elA.innerText = pA;
    elB.innerText = pB;
    
    pA >= 90 ? elA.classList.add('on-fire') : elA.classList.remove('on-fire');
    pB >= 90 ? elB.classList.add('on-fire') : elB.classList.remove('on-fire');

    // Barras de Stats
    const stats = [
        { label: 'Pontos', a: timeA_Selecionado.pontos, b: timeB_Selecionado.pontos },
        { label: 'Saldo Gols', a: timeA_Selecionado.sg, b: timeB_Selecionado.sg },
        { label: 'Vitorias', a: timeA_Selecionado.vitorias || 0, b: timeB_Selecionado.vitorias || 0 }
    ];

    document.getElementById('stats-rows').innerHTML = stats.map(s => {
        const total = (Math.abs(s.a) + Math.abs(s.b)) || 1;
        const percA = (Math.abs(s.a) / total) * 100;
        return `
            <div class="stat-item">
                <div class="stat-info"><span>${s.a}</span><label>${s.label}</label><span>${s.b}</span></div>
                <div class="bar-container">
                    <div class="bar-fill-left" style="width: ${percA}%"></div>
                    <div class="bar-fill-right" style="width: ${100 - percA}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// 5. ABA DE ESTATÍSTICAS COMPLETAS (MODAL)
function abrirEstatisticasCompletas() {
    if (!timeA_Selecionado || !timeB_Selecionado) return;

    const modal = document.getElementById('modal-stats');
    const conteudo = document.getElementById('conteudo-detalhado');
    
    modal.style.display = 'flex';

    // Cálculo de métricas avançadas fictícias baseadas nos dados reais
    const mediaGolsA = (timeA_Selecionado.sg / (timeA_Selecionado.jogos || 1)).toFixed(2);
    const mediaGolsB = (timeB_Selecionado.sg / (timeB_Selecionado.jogos || 1)).toFixed(2);

    conteudo.innerHTML = `
        <div class="glass-panel">
            <h4 style="color: var(--neon-blue); font-family: var(--font-cyber); margin-bottom: 15px;">📊 PERFORMANCE GERAL</h4>
            <p><strong>${timeA_Selecionado.time}:</strong> Aproveitamento de ${calcAprov(timeA_Selecionado)}%</p>
            <p><strong>${timeB_Selecionado.time}:</strong> Aproveitamento de ${calcAprov(timeB_Selecionado)}%</p>
        </div>
        <div class="glass-panel">
            <h4 style="color: var(--neon-purple); font-family: var(--font-cyber); margin-bottom: 15px;">⚽ MÉTRICAS DE ATAQUE</h4>
            <p>Média de Saldo/Jogo (${timeA_Selecionado.time}): ${mediaGolsA}</p>
            <p>Média de Saldo/Jogo (${timeB_Selecionado.time}): ${mediaGolsB}</p>
        </div>
        <div class="glass-panel">
            <h4 style="color: #ff4757; font-family: var(--font-cyber); margin-bottom: 15px;">🧠 ANÁLISE PREDITIVA</h4>
            <p>Com base no Power Ranking de ${timeA_Selecionado.power_ranking}, a probabilidade de vitória da casa é de ${Math.round((timeA_Selecionado.power_ranking/1.8))}%.</p>
        </div>
    `;
}

function fecharModal() {
    document.getElementById('modal-stats').style.display = 'none';
}

// 6. FILTROS DE LIGA (BOTÕES ESTILIZADOS)
function configurarFiltrosLiga() {
    document.querySelectorAll('.league-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.league-btn.active').classList.remove('active');
            btn.classList.add('active');
            renderizarTabela(btn.dataset.liga);
        });
    });
}

function renderizarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    const filtrados = dadosTimesGlobal.filter(t => t.liga === liga);

    corpo.innerHTML = filtrados.map((t, i) => `
        <tr>
            <td style="text-align: center; color: #666;">${i + 1}</td>
            <td>
                <div class="team-cell">
                    <img src="${t.escudo || ESCUDO_FALLBACK}">
                    <span>${t.time}</span>
                </div>
            </td>
            <td style="text-align: center;">${t.jogos}</td>
            <td style="text-align: center; font-weight: bold; color: var(--neon-blue);">${t.pontos}</td>
        </tr>
    `).join('');
}

// AUXILIARES
function calcAprov(t) {
    if (!t.jogos || t.jogos === 0) return 0;
    return Math.round((t.pontos / (t.jogos * 3)) * 100);
}

async function carregarIA() {
    const { data } = await _supabase.from('site_info').select('comentario_ia').eq('id', 1).single();
    if (data) document.getElementById('ia-box').innerText = data.comentario_ia;
}

async function carregarAoVivo() {
    const { data } = await _supabase.from('jogos_ao_vivo').select('*');
    const container = document.getElementById('lista-ao-vivo');
    if (data && data.length > 0) {
        container.innerHTML = data.map(j => `
            <div class="card-hero">
                <div style="font-size: 0.6rem; color: var(--neon-purple); margin-bottom: 5px;">● ${j.status}</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="team-v"><img src="${j.logo_casa || ESCUDO_FALLBACK}"><span>${j.time_casa}</span></div>
                    <div class="hero-score">${j.placar}</div>
                    <div class="team-v"><img src="${j.logo_fora || ESCUDO_FALLBACK}"><span>${j.time_fora}</span></div>
                </div>
            </div>
        `).join('');
    }
}

// Listeners
document.getElementById('time-a').addEventListener('change', atualizarComparativo);
document.getElementById('time-b').addEventListener('change', atualizarComparativo);

// Iniciar tudo
window.onload = init;
