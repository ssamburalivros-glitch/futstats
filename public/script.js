// --- CONFIGURAÇÃO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_FALLBACK = 'https://cdn-icons-png.flaticon.com/512/53/53283.png';

let dadosTimesGlobal = [];
let timeA_Selecionado = null;
let timeB_Selecionado = null;
let chartInstance = null; // Variável para guardar o gráfico e destruí-lo antes de criar outro

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Sistema Iniciado.");
    await carregarIA();
    await carregarAoVivo();
    await buscarDadosTabela();
    
    configurarEventosH2H(); // Configura os selects complexos
    configurarFiltrosLigaTabela();
});

// --- 1. BUSCA DE DADOS ---
async function buscarDadosTabela() {
    try {
        const { data } = await _supabase.from('tabelas_ligas').select('*').order('pontos', { ascending: false });
        if (data) {
            dadosTimesGlobal = data;
            renderizarTabela('BR'); // Tabela inicial: Brasil
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

async function carregarIA() {
    try {
        // Busca o comentário no Supabase (tabela site_info, id 1)
        const { data, error } = await _supabase
            .from('site_info')
            .select('comentario_ia')
            .eq('id', 1)
            .single();

        // Pega o elemento HTML onde o texto vai aparecer
        const boxIA = document.getElementById('ia-box');

        // VERIFICAÇÃO DE SEGURANÇA (Isso corrige o erro do seu print)
        if (!boxIA) {
            console.error("Erro: Elemento 'ia-box' não encontrado no HTML.");
            return;
        }

        if (error) {
            console.error("Erro Supabase IA:", error);
            boxIA.innerText = "⚠️ Falha na conexão neural.";
            return;
        }

        if (data && data.comentario_ia) {
            // Efeito de digitação (Typewriter) opcional ou texto direto
            boxIA.innerText = data.comentario_ia;
            
            // Remove a animação de "scanner" se quiser, ou deixa ela lá
            const scanner = document.querySelector('.ia-scanner');
            if(scanner) scanner.style.background = 'var(--neon-blue)'; // Fica azul quando carrega
        } else {
            boxIA.innerText = "Sem dados neurais no momento.";
        }

    } catch (e) {
        console.error("Erro fatal na função carregarIA:", e);
    }
}

// --- 2. LÓGICA DO H2H (CASCATA: LIGA -> TIME) ---
function configurarEventosH2H() {
    // LADO A
    document.getElementById('liga-a').addEventListener('change', (e) => preencherSelectTime('a', e.target.value));
    document.getElementById('time-a').addEventListener('change', atualizarComparativo);
    
    // LADO B
    document.getElementById('liga-b').addEventListener('change', (e) => preencherSelectTime('b', e.target.value));
    document.getElementById('time-b').addEventListener('change', atualizarComparativo);
}

function preencherSelectTime(lado, liga) {
    const selectTime = document.getElementById(`time-${lado}`);
    selectTime.innerHTML = '<option value="">Carregando...</option>';
    selectTime.disabled = true;

    // Filtra times da liga escolhida
    const timesFiltrados = dadosTimesGlobal.filter(t => t.liga === liga);
    
    if (timesFiltrados.length > 0) {
        let html = '<option value="">Selecione o Time</option>';
        timesFiltrados.forEach(t => {
            html += `<option value="${t.time}">${t.time}</option>`;
        });
        selectTime.innerHTML = html;
        selectTime.disabled = false;
    } else {
        selectTime.innerHTML = '<option value="">Nenhum time encontrado</option>';
    }
}

function atualizarComparativo() {
    const nomeA = document.getElementById('time-a').value;
    const nomeB = document.getElementById('time-b').value;

    if (!nomeA || !nomeB) return; // Só roda se os dois tiverem selecionados

    timeA_Selecionado = dadosTimesGlobal.find(t => t.time === nomeA);
    timeB_Selecionado = dadosTimesGlobal.find(t => t.time === nomeB);

    document.getElementById('h2h-display').style.display = 'block';

    // Atualiza Visual
    document.getElementById('name-a').innerText = timeA_Selecionado.time;
    document.getElementById('img-a').src = timeA_Selecionado.escudo || ESCUDO_FALLBACK;
    document.getElementById('power-a').innerText = timeA_Selecionado.power_ranking || 70;

    document.getElementById('name-b').innerText = timeB_Selecionado.time;
    document.getElementById('img-b').src = timeB_Selecionado.escudo || ESCUDO_FALLBACK;
    document.getElementById('power-b').innerText = timeB_Selecionado.power_ranking || 70;

    // Barras Simples
    renderBarrasStats(timeA_Selecionado, timeB_Selecionado);
}

function renderBarrasStats(tA, tB) {
    const container = document.getElementById('stats-rows');
    const stats = [
        { l: 'PONTOS', a: tA.pontos, b: tB.pontos },
        { l: 'SALDO', a: tA.sg, b: tB.sg },
        { l: 'JOGOS', a: tA.jogos, b: tB.jogos }
    ];

    container.innerHTML = stats.map(s => {
        const total = (Math.abs(s.a) + Math.abs(s.b)) || 1;
        const widthA = (Math.abs(s.a) / total) * 100;
        return `
            <div style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:2px;">
                    <span>${s.a}</span> <span style="color:#888">${s.l}</span> <span>${s.b}</span>
                </div>
                <div style="display:flex; height:6px; background:#222; border-radius:3px; overflow:hidden;">
                    <div style="width:${widthA}%; background:var(--neon-blue);"></div>
                    <div style="width:${100 - widthA}%; background:var(--neon-purple);"></div>
                </div>
            </div>
        `;
    }).join('');
}

// --- 3. TABELA E CLIQUE NO TIME ---
function renderizarTabela(liga) {
    const tbody = document.getElementById('tabela-corpo');
    const times = dadosTimesGlobal.filter(t => t.liga === liga);

    tbody.innerHTML = times.map((t, i) => `
        <tr>
            <td style="text-align:center; color:#666;">${i+1}</td>
            <td>
                <div class="team-clickable" onclick="abrirModalUnico('${t.time}')">
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

// --- 4. MODAL, LOADER E GRÁFICO ---

// Caso 1: Clicou na tabela (Abre só 1 time)
async function abrirModalUnico(nomeTime) {
    const time = dadosTimesGlobal.find(t => t.time === nomeTime);
    if(time) {
        timeA_Selecionado = time;
        timeB_Selecionado = null; // Reseta o B
        await abrirEstatisticasCompletas(true); // true = modo single
    }
}

// Caso 2: Clicou no H2H (Compara 2 times)
async function abrirEstatisticasCompletas(modoSingle = false) {
    const loader = document.getElementById('neural-loader');
    const modal = document.getElementById('modal-stats');
    
    // Animação de Loading
    loader.style.display = 'flex';
    document.getElementById('loader-status').innerText = "Carregando Gráficos...";
    document.getElementById('neural-progress-bar').style.width = "70%";
    await new Promise(r => setTimeout(r, 600)); // Delay fake para efeito
    
    // Esconde loader e mostra modal
    loader.style.display = 'none';
    modal.style.display = 'flex';

    // Gera o Gráfico
    renderizarGrafico(modoSingle);

    // Preenche textos
    const container = document.getElementById('conteudo-detalhado');
    if (modoSingle) {
        container.innerHTML = `
            <div class="glass-panel">
                <h3 style="color:var(--neon-blue)">${timeA_Selecionado.time}</h3>
                <p>Power Ranking: <strong>${timeA_Selecionado.power_ranking || '--'}</strong></p>
                <p>Total de Pontos: ${timeA_Selecionado.pontos}</p>
                <p>Saldo de Gols: ${timeA_Selecionado.sg}</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="glass-panel">
                <h4 style="color:var(--neon-blue)">${timeA_Selecionado.time}</h4>
                <p>PR: ${timeA_Selecionado.power_ranking}</p>
            </div>
            <div class="glass-panel">
                <h4 style="color:var(--neon-purple)">${timeB_Selecionado.time}</h4>
                <p>PR: ${timeB_Selecionado.power_ranking}</p>
            </div>
        `;
    }
}

function renderizarGrafico(modoSingle) {
    const ctx = document.getElementById('statsChart').getContext('2d');
    
    // Se já existe gráfico anterior, destrói para criar o novo
    if (chartInstance) {
        chartInstance.destroy();
    }

    let labels = ['Pontos', 'Saldo de Gols', 'Vitórias', 'Jogos'];
    let dataA = [
        timeA_Selecionado.pontos, 
        timeA_Selecionado.sg, 
        timeA_Selecionado.vitorias || 0,
        timeA_Selecionado.jogos
    ];

    let datasets = [{
        label: timeA_Selecionado.time,
        data: dataA,
        backgroundColor: 'rgba(72, 52, 212, 0.6)', // Azul Neon
        borderColor: '#4834d4',
        borderWidth: 1
    }];

    // Se NÃO for modo single, adiciona o time B
    if (!modoSingle && timeB_Selecionado) {
        datasets.push({
            label: timeB_Selecionado.time,
            data: [
                timeB_Selecionado.pontos, 
                timeB_Selecionado.sg, 
                timeB_Selecionado.vitorias || 0,
                timeB_Selecionado.jogos
            ],
            backgroundColor: 'rgba(190, 46, 221, 0.6)', // Roxo Neon
            borderColor: '#be2edd',
            borderWidth: 1
        });
    }

    // Criação do Gráfico Chart.js
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#ccc' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#ccc' }
                }
            },
            plugins: {
                legend: { labels: { color: '#fff' } }
            }
        }
    });
}

function fecharModal() {
    document.getElementById('modal-stats').style.display = 'none';
}
