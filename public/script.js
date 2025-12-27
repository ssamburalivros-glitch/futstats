// CONFIGURAÇÕES SUPABASE
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_FALLBACK = 'https://cdn-icons-png.flaticon.com/512/53/53283.png';

let dadosTimesGlobal = [];
let timeA_Selecionado = null;
let timeB_Selecionado = null;

// 1. INICIALIZAÇÃO DO SISTEMA
async function init() {
    console.log("Iniciando Motores Neurais...");
    await carregarIA();
    await carregarAoVivo();
    await buscarDadosTabela();
    configurarFiltrosLiga();
}

// 2. BUSCAR DADOS (TABELA E H2H)
async function buscarDadosTabela() {
    try {
        const { data, error } = await _supabase
            .from('tabelas_ligas')
            .select('*')
            .order('pontos', { ascending: false });

        if (data) {
            dadosTimesGlobal = data;
            popularSelectsH2H(data);
            renderizarTabela('BR'); // Inicia exibindo Brasil
        }
    } catch (e) {
        console.error("Erro na conexão com Supabase:", e);
    }
}

// 3. ORGANIZAR SELECTS H2H POR LIGAS (CLASSIFICAÇÃO)
function popularSelectsH2H(times) {
    const selects = [document.getElementById('time-a'), document.getElementById('time-b')];
    const ligasNomes = { 
        'BR': 'Brasil', 'PL': 'Inglaterra', 'ES': 'Espanha', 
        'IT': 'Itália', 'DE': 'Alemanha', 'PT': 'Portugal' 
    };

    selects.forEach(sel => {
        if (!sel) return;
        
        let html = '<option value="">Selecione um Time</option>';
        
        // Cria grupos por liga para organização
        Object.keys(ligasNomes).forEach(sigla => {
            const timesDaLiga = times.filter(t => t.liga === sigla);
            
            if (timesDaLiga.length > 0) {
                html += `<optgroup label="--- ${ligasNomes[sigla]} ---">`;
                timesDaLiga.forEach(t => {
                    html += `<option value="${t.time}">${t.time}</option>`;
                });
                html += `</optgroup>`;
            }
        });
        
        sel.innerHTML = html;
    });
}

// 4. RENDERIZAR TABELA COM NOMES INCORPORADOS
function renderizarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    if (!corpo) return;

    const filtrados = dadosTimesGlobal.filter(t => t.liga === liga);

    corpo.innerHTML = filtrados.map((t, i) => `
        <tr>
            <td style="text-align:center; color:#555;">${i + 1}</td>
            <td>
                <div class="team-link">
                    <img src="${t.escudo || ESCUDO_FALLBACK}" alt="logo">
                    <span class="team-name-text">${t.time}</span>
                </div>
            </td>
            <td style="text-align:center;">${t.jogos}</td>
            <td style="text-align:center;">${t.sg}</td>
            <td style="text-align:center; font-weight:bold; color:var(--neon-blue);">${t.pontos}</td>
        </tr>
    `).join('');
}

// 5. LÓGICA DE COMPARAÇÃO H2H
function atualizarComparativo() {
    const nomeA = document.getElementById('time-a')?.value;
    const nomeB = document.getElementById('time-b')?.value;

    if (!nomeA || !nomeB) return;

    timeA_Selecionado = dadosTimesGlobal.find(t => t.time === nomeA);
    timeB_Selecionado = dadosTimesGlobal.find(t => t.time === nomeB);

    const display = document.getElementById('h2h-display');
    if (display) display.style.display = 'block';

    // Atualiza nomes e imagens (com segurança)
    const elNameA = document.getElementById('name-a');
    const elNameB = document.getElementById('name-b');
    const elImgA = document.getElementById('img-a');
    const elImgB = document.getElementById('img-b');

    if (elNameA) elNameA.innerText = timeA_Selecionado.time;
    if (elNameB) elNameB.innerText = timeB_Selecionado.time;
    if (elImgA) elImgA.src = timeA_Selecionado.escudo || ESCUDO_FALLBACK;
    if (elImgB) elImgB.src = timeB_Selecionado.escudo || ESCUDO_FALLBACK;

    // Power Ranking e Barras
    const pA = timeA_Selecionado.power_ranking || 70;
    const pB = timeB_Selecionado.power_ranking || 70;
    
    const elPA = document.getElementById('power-a');
    const elPB = document.getElementById('power-b');
    
    if (elPA && elPB) {
        elPA.innerText = pA;
        elPB.innerText = pB;
        pA >= 90 ? elPA.classList.add('on-fire') : elPA.classList.remove('on-fire');
        pB >= 90 ? elPB.classList.add('on-fire') : elPB.classList.remove('on-fire');
    }

    renderBarrasStats();
}

function renderBarrasStats() {
    const container = document.getElementById('stats-rows');
    if (!container) return;

    const stats = [
        { label: 'PONTOS', a: timeA_Selecionado.pontos, b: timeB_Selecionado.pontos },
        { label: 'SALDO', a: timeA_Selecionado.sg, b: timeB_Selecionado.sg },
        { label: 'VITORIAS', a: timeA_Selecionado.vitorias || 0, b: timeB_Selecionado.vitorias || 0 }
    ];

    container.innerHTML = stats.map(s => {
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

// 6. LOADER NEURAL E MODAL DE ESTATÍSTICAS
async function abrirEstatisticasCompletas() {
    const loader = document.getElementById('neural-loader');
    const modal = document.getElementById('modal-stats');
    if (!loader || !modal) return;

    loader.style.display = 'flex';
    const progressBar = document.getElementById('neural-progress-bar');
    const statusText = document.getElementById('loader-status');

    const etapas = [
        { p: 30, t: "Sincronizando Banco de Dados...", d: 600 },
        { p: 65, t: "Processando Métricas de IA...", d: 800 },
        { p: 100, t: "Gerando Dashboard Completo...", d: 500 }
    ];

    for (let e of etapas) {
        if (progressBar) progressBar.style.width = e.p + "%";
        if (statusText) statusText.innerText = e.t;
        await new Promise(r => setTimeout(r, e.d));
    }

    preencherDadosModal();
    loader.style.display = 'none';
    modal.style.display = 'flex';
}

function preencherDadosModal() {
    const target = document.getElementById('conteudo-detalhado');
    if (!target) return;

    const provavelGanhador = timeA_Selecionado.power_ranking > timeB_Selecionado.power_ranking ? timeA_Selecionado.time : timeB_Selecionado.time;

    target.innerHTML = `
        <div class="glass-panel">
            <h4 style="color:var(--neon-blue); margin-bottom:10px;">📊 EFICIÊNCIA TÉCNICA</h4>
            <p><strong>${timeA_Selecionado.time}:</strong> ${timeA_Selecionado.power_ranking} PR</p>
            <p><strong>${timeB_Selecionado.time}:</strong> ${timeB_Selecionado.power_ranking} PR</p>
        </div>
        <div class="glass-panel">
            <h4 style="color:var(--neon-purple); margin-bottom:10px;">🛡️ DEFESA & SALDO</h4>
            <p>Saldo Total: ${timeA_Selecionado.sg} vs ${timeB_Selecionado.sg}</p>
            <p>Média de Saldo: ${(timeA_Selecionado.sg / (timeA_Selecionado.jogos || 1)).toFixed(2)} por jogo.</p>
        </div>
        <div class="glass-panel">
            <h4 style="color:#ff4757; margin-bottom:10px;">🧠 VEREDITO IA</h4>
            <p>Probabilidade favorece o <strong>${provavelGanhador}</strong> baseada na consistência de pontos.</p>
        </div>
    `;
}

function fecharModal() {
    const modal = document.getElementById('modal-stats');
    if (modal) modal.style.display = 'none';
}

// 7. FUNÇÕES AUXILIARES E EVENTOS
function configurarFiltrosLiga() {
    document.querySelectorAll('.league-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelector('.league-btn.active')?.classList.remove('active');
            btn.classList.add('active');
            renderizarTabela(btn.dataset.liga);
        };
    });
}

async function carregarIA() {
    const { data } = await _supabase.from('site_info').select('comentario_ia').eq('id', 1).single();
    const box = document.getElementById('ia-box');
    if (box && data) box.innerText = data.comentario_ia;
}

async function carregarAoVivo() {
    const { data } = await _supabase.from('jogos_ao_vivo').select('*');
    const container = document.getElementById('lista-ao-vivo');
    if (container && data) {
        container.innerHTML = data.map(j => `
            <div class="card-hero">
                <div style="font-size:0.6rem; color:var(--neon-purple)">● ${j.status}</div>
                <div style="display:flex; align-items:center; justify-content:space-between">
                    <div class="team-v"><img src="${j.logo_casa || ESCUDO_FALLBACK}"><span>${j.time_casa}</span></div>
                    <div class="hero-score">${j.placar}</div>
                    <div class="team-v"><img src="${j.logo_fora || ESCUDO_FALLBACK}"><span>${j.time_fora}</span></div>
                </div>
            </div>
        `).join('');
    }
}

// INICIALIZAR QUANDO O DOM ESTIVER PRONTO
document.addEventListener('DOMContentLoaded', () => {
    init();
    document.getElementById('time-a')?.addEventListener('change', atualizarComparativo);
    document.getElementById('time-b')?.addEventListener('change', atualizarComparativo);
});
