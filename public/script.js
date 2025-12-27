// --- CONFIGURAÇÃO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_FALLBACK = 'https://cdn-icons-png.flaticon.com/512/53/53283.png';

let dadosTimesGlobal = [];
let timeA_Selecionado = null;
let timeB_Selecionado = null;
let chartInstance = null;

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Sistema Neural Iniciado.");
    await carregarIA();
    await carregarAoVivo();
    await buscarDadosTabela();
    
    configurarEventosH2H();
    configurarFiltrosLigaTabela();
});

// --- 1. BUSCA DE DADOS ---
async function buscarDadosTabela() {
    try {
        const { data } = await _supabase.from('tabelas_ligas').select('*').order('pontos', { ascending: false });
        if (data) {
            dadosTimesGlobal = data;
            renderizarTabela('BR');
        }
    } catch (e) { console.error("Erro dados:", e); }
}

async function carregarAoVivo() {
    const { data } = await _supabase.from('jogos_ao_vivo').select('*');
    const container = document.getElementById('lista-ao-vivo');
    
    if (container && data) {
        container.innerHTML = data.map(j => `
            <div class="card-hero">
                <div style="font-size:0.7rem; color:var(--neon-purple); margin-bottom:10px;">● ${j.status}</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="team-v">
                        <img src="${j.logo_casa || ESCUDO_FALLBACK}">
                        <span style="font-size:0.8rem; display:block; margin-top:5px;">${j.time_casa}</span>
                    </div>
                    <div class="hero-score">${j.placar}</div>
                    <div class="team-v">
                        <img src="${j.logo_fora || ESCUDO_FALLBACK}">
                        <span style="font-size:0.8rem; display:block; margin-top:5px;">${j.time_fora}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// --- IA COM EFEITO TYPEWRITER ---
async function carregarIA() {
    try {
        const { data, error } = await _supabase.from('site_info').select('comentario_ia').eq('id', 1).single();
        const boxIA = document.getElementById('ia-box');

        if (!boxIA) return;

        if (data && data.comentario_ia) {
            let texto = data.comentario_ia;
            boxIA.innerText = "";
            let i = 0;

            // Efeito de digitação letra por letra
            function digitar() {
                if (i < texto.length) {
                    boxIA.innerText += texto.charAt(i);
                    i++;
                    setTimeout(digitar, 35); // Velocidade da digitação
                }
            }
            digitar();
            
            const scanner = document.querySelector('.ia-scanner');
            if(scanner) scanner.style.background = 'var(--neon-blue)';
        }
    } catch (e) { console.error("Erro IA:", e); }
}

// --- 2. LÓGICA DO H2H ---
function configurarEventosH2H() {
    document.getElementById('liga-a').addEventListener('change', (e) => preencherSelectTime('a', e.target.value));
    document.getElementById('time-a').addEventListener('change', atualizarComparativo);
    document.getElementById('liga-b').addEventListener('change', (e) => preencherSelectTime('b', e.target.value));
    document.getElementById('time-b').addEventListener('change', atualizarComparativo);
}

function preencherSelectTime(lado, liga) {
    const selectTime = document.getElementById(`time-${lado}`);
    const timesFiltrados = dadosTimesGlobal.filter(t => t.liga === liga);
    
    let html = '<option value="">Selecione o Time</option>';
    timesFiltrados.forEach(t => { html += `<option value="${t.time}">${t.time}</option>`; });
    selectTime.innerHTML = html;
    selectTime.disabled = false;
}

function atualizarComparativo() {
    const nomeA = document.getElementById('time-a').value;
    const nomeB = document.getElementById('time-b').value;

    if (!nomeA || !nomeB) return;

    timeA_Selecionado = dadosTimesGlobal.find(t => t.time === nomeA);
    timeB_Selecionado = dadosTimesGlobal.find(t => t.time === nomeB);

    document.getElementById('h2h-display').style.display = 'block';
    document.getElementById('name-a').innerText = timeA_Selecionado.time;
    document.getElementById('img-a').src = timeA_Selecionado.escudo || ESCUDO_FALLBACK;
    document.getElementById('name-b').innerText = timeB_Selecionado.time;
    document.getElementById('img-b').src = timeB_Selecionado.escudo || ESCUDO_FALLBACK;

    renderBarrasStats(timeA_Selecionado, timeB_Selecionado);
}

function renderBarrasStats(tA, tB) {
    const container = document.getElementById('stats-rows');
    const stats = [
        { l: 'PONTOS', a: tA.pontos, b: tB.pontos },
        { l: 'SALDO', a: tA.sg, b: tB.sg }
    ];

    container.innerHTML = stats.map(s => {
        const total = (Math.abs(s.a) + Math.abs(s.b)) || 1;
        const widthA = (Math.abs(s.a) / total) * 100;
        return `
            <div style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; font-size:0.7rem;">
                    <span>${s.a}</span> <span style="color:#666">${s.l}</span> <span>${s.b}</span>
                </div>
                <div style="display:flex; height:4px; background:#111; border-radius:2px; overflow:hidden; margin-top:3px;">
                    <div style="width:${widthA}%; background:var(--neon-blue);"></div>
                    <div style="width:${100 - widthA}%; background:var(--neon-purple);"></div>
                </div>
            </div>
        `;
    }).join('');
}

// --- 3. TABELA ---
function renderizarTabela(liga) {
    const tbody = document.getElementById('tabela-corpo');
    const times = dadosTimesGlobal.filter(t => t.liga === liga);

    tbody.innerHTML = times.map((t, i) => `
        <tr onclick="abrirModalUnico('${t.time}')" style="cursor:pointer">
            <td style="text-align:center; color:#444;">${i+1}</td>
            <td>
                <div class="team-clickable">
                    <img src="${t.escudo || ESCUDO_FALLBACK}" class="team-cell-img">
                    <span>${t.time}</span>
                </div>
            </td>
            <td style="text-align:center;">${t.jogos}</td>
            <td style="text-align:center; color:var(--neon-blue); font-weight:bold;">${t.pontos}</td>
        </tr>
    `).join('');
}

function configurarFiltrosLigaTabela() {
    document.querySelectorAll('.league-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelector('.league-btn.active').classList.remove('active');
            btn.classList.add('active');
            renderizarTabela(btn.dataset.liga);
        };
    });
}

// --- 4. GRÁFICOS E MODAL ---
async function abrirModalUnico(nomeTime) {
    const time = dadosTimesGlobal.find(t => t.time === nomeTime);
    if(time) {
        timeA_Selecionado = time;
        timeB_Selecionado = null;
        abrirEstatisticasCompletas(true);
    }
}

async function abrirEstatisticasCompletas(modoSingle = false) {
    const loader = document.getElementById('neural-loader');
    const modal = document.getElementById('modal-stats');
    
    loader.style.display = 'flex';
    await new Promise(r => setTimeout(r, 500));
    loader.style.display = 'none';
    modal.style.display = 'flex';

    renderizarGrafico(modoSingle);
}

function renderizarGrafico(modoSingle) {
    const ctx = document.getElementById('statsChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    const containerText = document.getElementById('conteudo-detalhado');

    if (modoSingle) {
        // MODO BARRAS (UM TIME)
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Pontos', 'Saldo', 'Vitórias'],
                datasets: [{
                    label: timeA_Selecionado.time,
                    data: [timeA_Selecionado.pontos, timeA_Selecionado.sg, timeA_Selecionado.vitorias || 0],
                    backgroundColor: '#4834d4'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
        containerText.innerHTML = `<h3 style="color:var(--neon-blue)">Análise: ${timeA_Selecionado.time}</h3>`;
    } else {
        // MODO PIZZA (PROBABILIDADE H2H)
        const forcaA = (timeA_Selecionado.pontos * 0.6) + (timeA_Selecionado.sg * 0.4) + 5;
        const forcaB = (timeB_Selecionado.pontos * 0.6) + (timeB_Selecionado.sg * 0.4) + 5;
        const total = forcaA + forcaB;
        const probA = Math.round((forcaA / total) * 100);
        const probB = 100 - probA;

        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [timeA_Selecionado.time, timeB_Selecionado.time],
                datasets: [{
                    data: [probA, probB],
                    backgroundColor: ['#4834d4', '#be2edd'],
                    hoverOffset: 15,
                    borderWidth: 0
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#fff' } } }
            }
        });
        containerText.innerHTML = `<h3 style="color:#00ff41; text-align:center;">CHANCE DE VITÓRIA: ${probA}% VS ${probB}%</h3>`;
    }
}

function fecharModal() {
    document.getElementById('modal-stats').style.display = 'none';
}
