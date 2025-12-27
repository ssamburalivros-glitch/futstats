// Configurações do Supabase
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_FALLBACK = 'https://cdn-icons-png.flaticon.com/512/53/53283.png';

// Variável global para armazenar os dados dos times (evita múltiplas requisições)
let dadosTimesGlobal = [];

// 1. CARREGAR COMENTÁRIO DA IA (RESUMO GERAL)
async function carregarIA() {
    try {
        const { data } = await _supabase
            .from('site_info')
            .select('comentario_ia')
            .eq('id', 1)
            .single();

        if (data && data.comentario_ia) {
            document.getElementById('ia-box').innerText = data.comentario_ia;
        }
    } catch (e) {
        console.log("Erro ao carregar IA");
    }
}

// 2. CARREGAR JOGOS AO VIVO
async function carregarAoVivo() {
    const container = document.getElementById('lista-ao-vivo');
    try {
        const { data } = await _supabase.from('jogos_ao_vivo').select('*');
        if (data && data.length > 0) {
            container.innerHTML = data.map(j => `
                <div class="card-hero">
                    <div class="hero-status-tag">${j.status}</div>
                    <div class="hero-teams">
                        <div class="team-v">
                            <img src="${j.logo_casa || ESCUDO_FALLBACK}">
                            <span>${j.time_casa}</span>
                        </div>
                        <div class="hero-score">${j.placar}</div>
                        <div class="team-v">
                            <img src="${j.logo_fora || ESCUDO_FALLBACK}">
                            <span>${j.time_fora}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="no-data">Nenhum jogo em direto agora.</p>';
        }
    } catch (e) { console.error(e); }
}

// 3. CARREGAR TABELA E POPULAR H2H
async function inicializarDados() {
    try {
        const { data } = await _supabase
            .from('tabelas_ligas')
            .select('*')
            .order('posicao', { ascending: true });

        if (data) {
            dadosTimesGlobal = data;
            popularSelectsH2H(data);
            carregarTabela('BR'); // Inicia com Brasil por padrão
        }
    } catch (e) { console.error(e); }
}

function popularSelectsH2H(times) {
    const selectA = document.getElementById('time-a');
    const selectB = document.getElementById('time-b');

    // Limpar e preencher
    const options = times.map(t => `<option value="${t.time}">${t.time} (${t.liga})</option>`).join('');
    selectA.innerHTML += options;
    selectB.innerHTML += options;
}

// 4. LÓGICA DO COMPARATIVO H2H
function compararGladiadores() {
    const nomeA = document.getElementById('time-a').value;
    const nomeB = document.getElementById('time-b').value;

    if (!nomeA || !nomeB) return;

    const timeA = dadosTimesGlobal.find(t => t.time === nomeA);
    const timeB = dadosTimesGlobal.find(t => t.time === nomeB);

    document.getElementById('h2h-display').style.display = 'block';

    // Update Visual
    document.getElementById('img-a').src = timeA.escudo || ESCUDO_FALLBACK;
    document.getElementById('img-b').src = timeB.escudo || ESCUDO_FALLBACK;
    document.getElementById('name-a').innerText = timeA.time;
    document.getElementById('name-b').innerText = timeB.time;

    // Power Ranking (Simulado ou do Banco)
    const powerA = timeA.power_ranking || Math.floor(Math.random() * (99 - 70) + 70);
    const powerB = timeB.power_ranking || Math.floor(Math.random() * (99 - 70) + 70);
    
    document.getElementById('power-a').innerText = powerA;
    document.getElementById('power-b').innerText = powerB;

    // Gerar Barras de Stats
    const stats = [
        { label: 'Pontos', a: timeA.pontos, b: timeB.pontos },
        { label: 'SG', a: timeA.sg, b: timeB.sg },
        { label: 'Aproveitamento', a: calcAprov(timeA), b: calcAprov(timeB) }
    ];

    document.getElementById('stats-rows').innerHTML = stats.map(s => {
        const total = (Math.abs(s.a) + Math.abs(s.b)) || 1;
        const percA = (Math.abs(s.a) / total) * 100;
        return `
            <div class="stat-item">
                <div class="stat-info">
                    <span>${s.a}</span>
                    <label>${s.label}</label>
                    <span>${s.b}</span>
                </div>
                <div class="bar-container">
                    <div class="bar-fill-left" style="width: ${percA}%"></div>
                    <div class="bar-fill-right" style="width: ${100 - percA}%"></div>
                </div>
            </div>
        `;
    }).join('');

    // Veredito da IA
    const veredito = document.getElementById('veredito-texto');
    if (powerA > powerB + 5) veredito.innerText = `Análise Neural: ${timeA.time} tem vantagem tática superior.`;
    else if (powerB > powerA + 5) veredito.innerText = `Análise Neural: ${timeB.time} é o favorito estatístico.`;
    else veredito.innerText = "Análise Neural: Confronto equilibrado. Decisão nos detalhes.";
}

function calcAprov(t) {
    if (!t.jogos || t.jogos === 0) return 0;
    return Math.round((t.pontos / (t.jogos * 3)) * 100);
}

// 5. FILTRO DA TABELA
function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    const filtrados = dadosTimesGlobal.filter(t => t.liga === liga);

    corpo.innerHTML = filtrados.map(t => `
        <tr>
            <td class="txt-center">${t.posicao}</td>
            <td class="team-cell">
                <img src="${t.escudo || ESCUDO_FALLBACK}">
                <span>${t.time}</span>
            </td>
            <td class="txt-center">${t.jogos}</td>
            <td class="txt-center">${t.sg}</td>
            <td class="txt-center"><strong>${t.pontos}</strong></td>
        </tr>
    `).join('');
}

// EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    carregarIA();
    carregarAoVivo();
    inicializarDados();

    // Selects H2H
    document.getElementById('time-a').addEventListener('change', compararGladiadores);
    document.getElementById('time-b').addEventListener('change', compararGladiadores);

    // Pills de Liga
    document.querySelectorAll('.pill').forEach(btn => {
        btn.onclick = () => {
            document.querySelector('.pill.active').classList.remove('active');
            btn.classList.add('active');
            carregarTabela(btn.dataset.liga);
        };
    });
});

// Atualização automática a cada 1 minuto para os jogos ao vivo
setInterval(carregarAoVivo, 60000);
