// script.js - Restaurado e Integrado
const SUPABASE_URL = 'https://vqocdowjdutfzmnvxqvz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm';
const _supabase = (SUPABASE_URL !== 'SUA_URL_DO_SUPABASE') ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    if (window.CAMPEONATO_DATA) {
        loadStandings();
        loadEstatisticas();
        loadArtilharia();
        initTeamSearch(); // Restaura a barra de pesquisa
    }
    
    if (_supabase) {
        loadLiveGames();
        setInterval(loadLiveGames, 30000); // Atualiza jogos a cada 30 segundos
    }
    
    updateTime();
    setupModal();
});

// --- JOGOS AO VIVO (PLACAR DE FUTEBOL VIA SUPABASE) ---
async function loadLiveGames() {
    const container = document.getElementById('liveGames');
    if (!container || !_supabase) return;

    try {
        const { data, error } = await _supabase.from('partidas_ao_vivo').select('*');
        if (error) throw error;

        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="no-games"><p>Nenhum jogo ao vivo no momento.</p></div>';
            return;
        }

        data.forEach(jogo => {
            const card = document.createElement('div');
            card.className = 'live-game-card';
            card.innerHTML = `
                <div class="game-teams">
                    <div class="team"><span>${jogo.home_team}</span></div>
                    <div class="game-score">
                        <span class="score">${jogo.home_score}</span>
                        <span class="divider">x</span>
                        <span class="score">${jogo.away_score}</span>
                    </div>
                    <div class="team"><span>${jogo.away_team}</span></div>
                </div>
                <div class="game-info">
                    <span class="game-status live-blink">${jogo.status || 'AO VIVO'}</span>
                    <span class="game-stadium">${jogo.league || 'Brasileirão'}</span>
                </div>
            `;
            container.appendChild(card);
        });

        document.getElementById('activeGames').textContent = data.length;
    } catch (err) {
        console.error("Erro ao carregar jogos:", err);
    }
}

// --- PESQUISA DE TIMES (RESTAURADA) ---
function initTeamSearch() {
    const searchInput = document.getElementById('teamSearch');
    const clearBtn = document.getElementById('clearSearch');
    const closeBtn = document.getElementById('closePanel');

    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) {
            clearBtn.style.display = 'block';
            searchTeams(query);
        } else {
            hideTeamStatsPanel();
        }
    });

    clearBtn.addEventListener('click', hideTeamStatsPanel);
    closeBtn.addEventListener('click', hideTeamStatsPanel);
}

function searchTeams(query) {
    const team = window.CAMPEONATO_DATA.estatisticas.find(t => 
        t.time.toLowerCase().includes(query.toLowerCase())
    );

    const panel = document.getElementById('teamStatsPanel');
    const general = document.getElementById('generalStats');

    if (team) {
        panel.style.display = 'block';
        general.style.display = 'none';
        
        // Preenche os dados no painel
        document.getElementById('teamInfoHeader').innerHTML = `<h3>${team.time}</h3>`;
        document.getElementById('totalCorners').textContent = team.escanteios_total;
        document.getElementById('yellowCards').textContent = team.cartoes_amarelos;
        document.getElementById('redCards').textContent = team.cartoes_vermelhos;
        document.getElementById('possession').textContent = team.posse_bola + '%';
        document.getElementById('foulsCommitted').textContent = team.faltas_cometidas;
    }
}

function hideTeamStatsPanel() {
    document.getElementById('teamStatsPanel').style.display = 'none';
    document.getElementById('generalStats').style.display = 'block';
    document.getElementById('teamSearch').value = '';
    document.getElementById('clearSearch').style.display = 'none';
}

// --- CLASSIFICAÇÃO E ESTATÍSTICAS GERAIS ---
function loadStandings() {
    const tbody = document.getElementById('standingsBody');
    tbody.innerHTML = '';
    window.CAMPEONATO_DATA.classificacao.forEach(c => {
        const row = `<tr>
            <td>${c.posicao}</td>
            <td><strong>${c.clube}</strong></td>
            <td>${c.pontos}</td>
            <td>${c.jogos}</td>
            <td>${c.vitorias}</td>
            <td>${c.empates}</td>
            <td>${c.derrotas}</td>
            <td>${c.golsPro}</td>
            <td>${c.golsContra}</td>
            <td>${c.saldoGols}</td>
            <td><span class="status">▲</span></td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function loadEstatisticas() {
    updateStatsList('escanteios');
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateStatsList(btn.dataset.stat);
        };
    });
}

function updateStatsList(type) {
    const list = document.getElementById('statsList');
    const field = type === 'escanteios' ? 'escanteios_total' : type === 'cartoes' ? 'total_cartoes' : 'faltas_cometidas';
    
    const sorted = [...window.CAMPEONATO_DATA.estatisticas].sort((a, b) => b[field] - a[field]);
    list.innerHTML = '';
    sorted.slice(0, 10).forEach((item, idx) => {
        list.innerHTML += `<div class="stats-item">
            <span>${idx + 1}. ${item.time}</span>
            <strong>${item[field]}</strong>
        </div>`;
    });
}

// Funções de Navegação e Tempo permanecem as mesmas...
function initNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.nav-tab, .tab-content').forEach(el => el.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        };
    });
}

function updateTime() {
    const el = document.getElementById('updateTime');
    if (el) el.textContent = new Date().toLocaleTimeString();
}

function loadArtilharia() {
    const list = document.getElementById('artilhariaList');
    if (!list) return;
    list.innerHTML = '';
    window.CAMPEONATO_DATA.artilharia.forEach(a => {
        list.innerHTML += `<div class="stats-item"><span>${a.jogador}</span><strong>${a.gols}</strong></div>`;
    });
}

function setupModal() {}
