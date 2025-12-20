// ==========================================
// 1. CONFIGURAÇÕES
// ==========================================

// SUPABASE (Para jogos ao vivo - Crawler)
const SUPABASE_URL = 'https://vqocdowjdutfzmnvxqvz.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// API FOOTBALL (Para Tabelas e Estatísticas)
const API_KEY = '8238d6b41d6cd9deb1a027865989c3e4'; // <--- INSIRA SUA CHAVE AQUI
const BASE_URL = 'https://v3.football.api-sports.io';

// IDs das Ligas (Temporada 2024 ou 2025 conforme disponibilidade)
const LEAGUES = {
    71:  { name: "Brasileirão Série A", season: 2024 }, // Verifique se 2025 já começou
    39:  { name: "Premier League", season: 2024 },
    140: { name: "La Liga", season: 2024 },
    78:  { name: "Bundesliga", season: 2024 }
};

let currentLeagueId = 71; // Começa com Brasileirão

// ==========================================
// 2. INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    
    // Inicia Ao Vivo (Supabase)
    loadLiveGames();
    setInterval(loadLiveGames, 30000);

    // Inicia Dados da API Football (Cacheada)
    loadLeagueData(currentLeagueId);
});

// ==========================================
// 3. API FOOTBALL COM CACHE (IMPORTANTE)
// ==========================================

// Função global para mudar a liga pelos botões
window.mudarLiga = function(id) {
    currentLeagueId = id;
    
    // Atualiza botões visuais
    document.querySelectorAll('.league-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active'); // O botão clicado
    
    // Atualiza Título
    document.getElementById('leagueTitle').textContent = LEAGUES[id].name;
    
    // Carrega dados
    loadLeagueData(id);
}

async function loadLeagueData(id) {
    const season = LEAGUES[id].season;
    
    // Carrega Classificação
    const standingsData = await fetchWithCache(`standings_${id}`, `/standings?league=${id}&season=${season}`);
    if(standingsData) renderStandings(standingsData);

    // Carrega Artilharia
    const scorersData = await fetchWithCache(`scorers_${id}`, `/players/topscorers?league=${id}&season=${season}`);
    if(scorersData) renderStats(scorersData, 'scorersList');
    
    // Carrega Assistências (opcional, gasta +1 req se não estiver em cache)
    // const assistsData = await fetchWithCache(`assists_${id}`, `/players/topassists?league=${id}&season=${season}`);
    // if(assistsData) renderStats(assistsData, 'assistsList');
}

// SISTEMA DE CACHE INTELIGENTE
// Só faz a requisição se não tiver dados ou se os dados tiverem mais de 24 horas
async function fetchWithCache(key, endpoint) {
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
    const cached = localStorage.getItem(key);
    
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < CACHE_DURATION) {
            console.log(`⚡ Usando Cache para ${key} (Economizou requisição)`);
            return data;
        }
    }

    console.log(`🌍 Baixando dados novos da API para ${key}...`);
    
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            "method": "GET",
            "headers": {
                "x-rapidapi-host": "v3.football.api-sports.io",
                "x-rapidapi-key": API_KEY
            }
        });

        const json = await response.json();
        
        if (json.errors && Object.keys(json.errors).length > 0) {
            console.error("Erro API Football:", json.errors);
            return null;
        }

        // Salva no Cache
        const saveObject = { data: json.response, timestamp: Date.now() };
        localStorage.setItem(key, JSON.stringify(saveObject));
        
        return json.response;
    } catch (e) {
        console.error("Erro de conexão API:", e);
        return null;
    }
}

// ==========================================
// 4. RENDERIZAÇÃO (TABELAS E ESTATÍSTICAS)
// ==========================================

function renderStandings(data) {
    const tbody = document.getElementById('standingsBody');
    if (!data || !data[0]) return;
    
    const table = data[0].league.standings[0]; // Pega o primeiro grupo
    
    tbody.innerHTML = table.map(time => `
        <tr>
            <td>
                <span style="color:${getZoneColor(time.description)}">${time.rank}</span>
            </td>
            <td style="display:flex; align-items:center; gap:10px;">
                <img src="${time.team.logo}" width="25">
                ${time.team.name}
            </td>
            <td><strong>${time.points}</strong></td>
            <td>${time.all.played}</td>
            <td>${time.all.win}</td>
            <td>${time.goalsDiff}</td>
        </tr>
    `).join('');
}

function renderStats(data, elementId) {
    const list = document.getElementById(elementId);
    if (!data || !list) return;

    list.innerHTML = data.slice(0, 10).map((player, idx) => `
        <div class="stat-item">
            <div class="stat-rank">${idx + 1}</div>
            <img src="${player.player.photo}" class="player-face">
            <div class="player-info">
                <span class="p-name">${player.player.name}</span>
                <span class="p-team"><img src="${player.statistics[0].team.logo}" width="15"> ${player.statistics[0].team.name}</span>
            </div>
            <div class="stat-value">
                ${elementId === 'scorersList' ? player.statistics[0].goals.total : (player.statistics[0].goals.assists || 0)}
            </div>
        </div>
    `).join('');
}

// Auxiliar para cores da tabela (Libertadores, Rebaixamento, etc)
function getZoneColor(desc) {
    if (!desc) return '#fff';
    if (desc.includes('Libertadores') || desc.includes('Champions')) return '#00ff00';
    if (desc.includes('Sul-Americana') || desc.includes('Europa')) return '#0088ff';
    if (desc.includes('Relegation')) return '#ff4444';
    return '#fff';
}

// ==========================================
// 5. SUPABASE - JOGOS AO VIVO (SEU CRAWLER)
// ==========================================
async function loadLiveGames() {
    const container = document.getElementById('liveGames');
    if (!container) return;

    try {
        const { data, error } = await _supabase.from('partidas_ao_vivo').select('*');
        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="empty-msg">Nenhum jogo ao vivo encontrado no momento.</p>';
            return;
        }

        let htmlAoVivo = "";
        let htmlEncerrados = "";

        data.forEach(jogo => {
            // Auto-detecção de campos
            const casa = jogo.home_team || jogo.time_casa || "Mandante";
            const fora = jogo.away_team || jogo.time_fora || "Visitante";
            const placarC = jogo.home_score ?? 0;
            const placarF = jogo.away_score ?? 0;
            const statusRaw = jogo.status || jogo.tempo || "";
            const status = statusRaw.toUpperCase();
            
            const isLive = status.includes("'") || status.includes("INT") || status.includes("1T");

            // Tenta pegar logo da API Football (se tiver salvo) ou usa placeholder
            // Nota: Para ter logos perfeitos aqui, precisaríamos cruzar dados, mas usaremos placeholder por enquanto
            
            const card = `
                <div class="live-card ${isLive ? 'active-match' : 'ended-match'}">
                    <div class="match-info">
                        <div class="team-block">
                            <span class="t-name">${casa}</span>
                        </div>
                        <div class="score-block">
                            <span class="score-display">${placarC} - ${placarF}</span>
                            <span class="status-badge ${isLive ? 'blink' : ''}">${isLive ? statusRaw : 'FIM'}</span>
                        </div>
                        <div class="team-block">
                            <span class="t-name">${fora}</span>
                        </div>
                    </div>
                </div>`;

            if (isLive) htmlAoVivo += card;
            else htmlEncerrados += card;
        });

        container.innerHTML = (htmlAoVivo ? '<h4>🔥 EM ANDAMENTO</h4>' + htmlAoVivo : '') + 
                              (htmlEncerrados ? '<h4 style="margin-top:20px; opacity:0.7">🏁 ENCERRADOS</h4>' + htmlEncerrados : '');

    } catch (e) {
        console.error("Erro Supabase:", e);
    }
}

function initNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.nav-tab, .tab-content').forEach(el => el.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        };
    });
}
