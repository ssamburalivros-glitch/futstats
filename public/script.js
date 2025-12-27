// Configurações do Supabase
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_FALLBACK = 'https://cdn-icons-png.flaticon.com/512/53/53283.png';
let dadosTimesGlobal = [];
let timeA_Selecionado = null;
let timeB_Selecionado = null;

// 1. INICIALIZAÇÃO SEGURA
async function init() {
    console.log("Sistema Neural Iniciado...");
    await carregarIA();
    await carregarAoVivo();
    await buscarDadosTabela();
    configurarFiltrosLiga();
}

// 2. CARREGAR COMENTÁRIO DA IA (Correção do erro de null)
async function carregarIA() {
    try {
        const { data } = await _supabase.from('site_info').select('comentario_ia').eq('id', 1).single();
        const iaBox = document.getElementById('ia-box');
        if (iaBox && data) {
            iaBox.innerText = data.comentario_ia;
        }
    } catch (e) {
        console.warn("Aguardando carregamento do elemento IA...");
    }
}

// 3. BUSCAR DADOS DA TABELA
async function buscarDadosTabela() {
    try {
        const { data } = await _supabase.from('tabelas_ligas').select('*').order('pontos', { ascending: false });
        if (data) {
            dadosTimesGlobal = data;
            popularSelectsH2H(data);
            renderizarTabela('BR');
        }
    } catch (e) { console.error("Erro ao buscar tabela:", e); }
}

function popularSelectsH2H(times) {
    const sA = document.getElementById('time-a');
    const sB = document.getElementById('time-b');
    if (!sA || !sB) return;

    const options = times.map(t => `<option value="${t.time}">${t.time}</option>`).join('');
    sA.innerHTML = '<option value="">Selecione o Time 1</option>' + options;
    sB.innerHTML = '<option value="">Selecione o Time 2</option>' + options;
}

// 4. LÓGICA DO H2H
function atualizarComparativo() {
    const nomeA = document.getElementById('time-a')?.value;
    const nomeB = document.getElementById('time-b')?.value;

    if (!nomeA || !nomeB) return;

    timeA_Selecionado = dadosTimesGlobal.find(t => t.time === nomeA);
    timeB_Selecionado = dadosTimesGlobal.find(t => t.time === nomeB);

    const display = document.getElementById('h2h-display');
    if (display) display.style.display = 'block';

    // Atualiza Imagens e Nomes com verificação
    setElText('name-a', timeA_Selecionado.time);
    setElText('name-b', timeB_Selecionado.time);
    setElSrc('img-a', timeA_Selecionado.escudo);
    setElSrc('img-b', timeB_Selecionado.escudo);

    // Power Ranking
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
        { label: 'PTS', a: timeA_Selecionado.pontos, b: timeB_Selecionado.pontos },
        { label: 'SG', a: timeA_Selecionado.sg, b: timeB_Selecionado.sg },
        { label: 'VIT', a: timeA_Selecionado.vitorias, b: timeB_Selecionado.vitorias }
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

// 5. LOADER NEURAL E ABA DE ESTATÍSTICAS
async function abrirEstatisticasCompletas() {
    const loader = document.getElementById('neural-loader');
    const modal = document.getElementById('modal-stats');
    if (!loader || !modal) return;

    loader.style.display = 'flex';
    const progressBar = document.getElementById('neural-progress-bar');
    const statusText = document.getElementById('loader-status');

    const etapas = [
        { p: 40, t: "Sincronizando Scrapers...", d: 500 },
        { p: 80, t: "Processando Power Ranking...", d: 700 },
        { p: 100, t: "Finalizando Relatório...", d: 400 }
    ];

    for (let e of etapas) {
        if (progressBar) progressBar.style.width = e.p + "%";
        if (statusText) statusText.innerText = e.t;
        await new Promise(r => setTimeout(r, e.d));
    }

    gerarConteudoModal();
    loader.style.display = 'none';
    modal.style.display = 'flex';
}

function gerarConteudoModal() {
    const target = document.getElementById('conteudo-detalhado');
    if (!target) return;

    target.innerHTML = `
        <div class="glass-panel">
            <h4 class="neon-blue">ANÁLISE DE ATAQUE</h4>
            <p>${timeA_Selecionado.time}: Média ${(timeA_Selecionado.sg / 10).toFixed(2)} p/jogo</p>
            <p>${timeB_Selecionado.time}: Média ${(timeB_Selecionado.sg / 10).toFixed(2)} p/jogo</p>
        </div>
        <div class="glass-panel">
            <h4 class="neon-purple">PROJEÇÃO FINAL</h4>
            <p>Favoritismo: ${timeA_Selecionado.power_ranking > timeB_Selecionado.power_ranking ? timeA_Selecionado.time : timeB_Selecionado.time}</p>
        </div>
    `;
}

function fecharModal() {
    const modal = document.getElementById('modal-stats');
    if (modal) modal.style.display = 'none';
}

// 6. FUNÇÕES AUXILIARES
function setElText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function setElSrc(id, src) {
    const el = document.getElementById(id);
    if (el) el.src = src || ESCUDO_FALLBACK;
}

function configurarFiltrosLiga() {
    document.querySelectorAll('.league-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelector('.league-btn.active')?.classList.remove('active');
            btn.classList.add('active');
            renderizarTabela(btn.dataset.liga);
        };
    });
}

function renderizarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    if (!corpo) return;
    const filtrados = dadosTimesGlobal.filter(t => t.liga === liga);
    corpo.innerHTML = filtrados.map((t, i) => `
        <tr>
            <td style="text-align:center">${i+1}</td>
            <td><div class="team-cell"><img src="${t.escudo || ESCUDO_FALLBACK}"><span>${t.time}</span></div></td>
            <td style="text-align:center">${t.jogos}</td>
            <td style="text-align:center; font-weight:bold">${t.pontos}</td>
        </tr>
    `).join('');
}

async function carregarAoVivo() {
    const { data } = await _supabase.from('jogos_ao_vivo').select('*');
    const container = document.getElementById('lista-ao-vivo');
    if (container && data) {
        container.innerHTML = data.map(j => `
            <div class="card-hero">
                <div style="font-size:0.6rem; color:var(--neon-blue)">● ${j.status}</div>
                <div style="display:flex; align-items:center; justify-content:space-between">
                    <div class="team-v"><img src="${j.logo_casa || ESCUDO_FALLBACK}"><span>${j.time_casa}</span></div>
                    <div class="hero-score">${j.placar}</div>
                    <div class="team-v"><img src="${j.logo_fora || ESCUDO_FALLBACK}"><span>${j.time_fora}</span></div>
                </div>
            </div>
        `).join('');
    }
}

// EVENT LISTENERS FINAIS
document.addEventListener('DOMContentLoaded', () => {
    init();
    document.getElementById('time-a')?.addEventListener('change', atualizarComparativo);
    document.getElementById('time-b')?.addEventListener('change', atualizarComparativo);
});
