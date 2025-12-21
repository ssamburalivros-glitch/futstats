const SUPABASE_URL = 'https://vqocdowjdutfzmnvxqvz.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const API_KEY = '8238d6b41d6cd9deb1a027865989c3e4'; 
const BASE_URL = 'https://v3.football.api-sports.io';

const LEAGUES = {
    71:  { name: "Brasileirão Série A", season: 2025 },
    39:  { name: "Premier League", season: 2025 },
    140: { name: "La Liga", season: 2025 },
    78:  { name: "Bundesliga", season: 2025 },
    135: { name: "Serie A (Itália)", season: 2025 },
    94:  { name: "Liga Portugal", season: 2025 }
};

let currentLeagueId = 71;

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadLiveGames();
    setInterval(loadLiveGames, 30000);
    loadLeagueData(currentLeagueId);
});

// --- CACHE E API ---
async function fetchWithCache(key, endpoint) {
    const CACHE_TIME = 24 * 60 * 60 * 1000; 
    const cached = localStorage.getItem(key);
    
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TIME) return data;
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            headers: { "x-rapidapi-key": API_KEY, "x-rapidapi-host": "v3.football.api-sports.io" }
        });
        const json = await response.json();
        if (json.response && json.response.length > 0) {
            localStorage.setItem(key, JSON.stringify({ data: json.response, timestamp: Date.now() }));
            return json.response;
        }
        return null;
    } catch (e) { return null; }
}

async function loadLeagueData(id) {
    const season = LEAGUES[id].season;
    const standings = await fetchWithCache(`st_${id}`, `/standings?league=${id}&season=${season}`);
    if(standings) renderStandings(standings);

    const scorers = await fetchWithCache(`sc_${id}`, `/players/topscorers?league=${id}&season=${season}`);
    if(scorers) renderScorers(scorers);
}

function renderStandings(data) {
    const list = data[0].league.standings[0];
    document.getElementById('standingsBody').innerHTML = list.map(t => `
        <tr>
            <td>${t.rank}</td>
            <td class="t-name-cell"><img src="${t.team.logo}" width="20"> ${t.team.name}</td>
            <td><strong>${t.points}</strong></td>
            <td>${t.all.played}</td>
            <td>${t.goalsDiff}</td>
        </tr>`).join('');
}

function renderScorers(data) {
    document.getElementById('scorersList').innerHTML = data.slice(0, 10).map((p, i) => `
        <div class="stat-row">
            <span>${i+1}. ${p.player.name}</span>
            <strong>${p.statistics[0].goals.total}</strong>
        </div>`).join('');
}

window.mudarLiga = (id) => {
    currentLeagueId = id;
    document.querySelectorAll('.league-btn').forEach(b => b.classList.toggle('active', b.outerHTML.includes(id)));
    document.getElementById('leagueTitle').textContent = LEAGUES[id].name;
    loadLeagueData(id);
};

// --- AO VIVO (SUPABASE) ---
async function loadLiveGames() {
    const { data } = await _supabase.from('partidas_ao_vivo').select('*');
    const container = document.getElementById('liveGames');
    if (!data || data.length === 0) {
        container.innerHTML = '<p>Nenhum jogo agora.</p>';
        return;
    }
    container.innerHTML = data.map(j => {
        const isLive = (j.status || "").includes("'");
        return `
            <div class="live-card ${isLive ? 'live-border' : ''}">
                <div class="match">
                    <span>${j.home_team}</span>
                    <span class="score">${j.home_score} - ${j.away_score}</span>
                    <span>${j.away_team}</span>
                </div>
                <div class="status ${isLive ? 'blink' : ''}">${j.status}</div>
            </div>`;
    }).join('');
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
