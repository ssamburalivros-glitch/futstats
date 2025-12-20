// script.js - Atualizado com integração Supabase e Dados 2025
const SUPABASE_URL = 'SUA_URL_DO_SUPABASE_AQUI';
const SUPABASE_KEY = 'SUA_CHAVE_ANON_AQUI';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar todas as funcionalidades
    initNavigation();
    loadStandings();
    loadEstatisticas();
    loadArtilharia();
    setupModal();
    
    // Iniciar busca de dados ao vivo do Supabase
    loadLiveGamesFromSupabase();
    
    // Atualizar tempo
    updateTime();
    setInterval(updateTime, 60000); 
    
    // Atualizar jogos ao vivo automaticamente a cada 1 minuto
    setInterval(loadLiveGamesFromSupabase, 60000);
});

// --- INTEGRAÇÃO SUPABASE (JOGOS AO VIVO) ---

async function loadLiveGamesFromSupabase() {
    const liveGamesContainer = document.getElementById('liveGames');
    if (!liveGamesContainer) return;

    try {
        // Busca os dados da tabela que o seu crawler preenche
        const { data, error } = await _supabase
            .from('partidas_ao_vivo')
            .select('*');

        if (error) throw error;

        liveGamesContainer.innerHTML = '';

        if (!data || data.length === 0) {
            liveGamesContainer.innerHTML = `
                <div class="no-games">
                    <i class="fas fa-calendar-times"></i>
                    <p>Nenhum jogo ao vivo acontecendo agora.</p>
                </div>
            `;
            updateLiveStats([]);
            return;
        }

        data.forEach(jogo => {
            const gameCard = document.createElement('div');
            gameCard.className = 'live-game-card'; // Use a mesma classe do seu CSS
            gameCard.innerHTML = `
                <div class="game-teams">
                    <div class="team">
                        <div class="team-name">${jogo.home_team}</div>
                        <div class="team-logo"><i class="fas fa-futbol"></i></div>
                    </div>
                    <div class="game-score">
                        <span class="score">${jogo.home_score}</span>
                        <span class="divider">x</span>
                        <span class="score">${jogo.away_score}</span>
                    </div>
                    <div class="team">
                        <div class="team-logo"><i class="fas fa-futbol"></i></div>
                        <div class="team-name">${jogo.away_team}</div>
                    </div>
                </div>
                <div class="game-info">
                    <span class="game-status live-blink">${jogo.status}</span>
                    <span class="game-stadium">${jogo.league}</span>
                </div>
            `;
            liveGamesContainer.appendChild(gameCard);
        });

        updateLiveStats(data);
        updateTime();

    } catch (err) {
        console.error('Erro Supabase:', err);
        liveGamesContainer.innerHTML = '<p style="text-align:center; padding:20px;">Erro ao conectar com o servidor de resultados.</p>';
    }
}

function updateLiveStats(jogos) {
    document.getElementById('activeGames').textContent = jogos.length;
    
    const totalGols = jogos.reduce((total, jogo) => {
        return total + parseInt(jogo.home_score || 0) + parseInt(jogo.away_score || 0);
    }, 0);
    
    document.getElementById('totalGoals').textContent = totalGols;
}

// --- FUNÇÕES DE NAVEGAÇÃO E UI (MANTIDAS) ---

function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });

    // Botão de atualizar manual
    const refreshBtn = document.getElementById('refreshLive');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadLiveGamesFromSupabase);
    }
}

function loadStandings() {
    const tbody = document.getElementById('standingsBody');
    if (!tbody || !window.CAMPEONATO_DATA) return;
    
    tbody.innerHTML = '';
    CAMPEONATO_DATA.classificacao.forEach(clube => {
        const status = getStatus(clube.posicao);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${clube.posicao}</td>
            <td><strong>${clube.clube}</strong></td>
            <td><strong>${clube.pontos}</strong></td>
            <td>${clube.jogos}</td>
            <td>${clube.vitorias}</td>
            <td>${clube.empates}</td>
            <td>${clube.derrotas}</td>
            <td>${clube.golsPro}</td>
            <td>${clube.golsContra}</td>
            <td>${clube.saldoGols}</td>
            <td><span class="status ${status.class}">${status.text}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function getStatus(posicao) {
    if (posicao <= 4) return { class: 'libertadores', text: 'LIB' };
    if (posicao <= 6) return { class: 'pre-libertadores', text: 'PRE-LIB' };
    if (posicao <= 12) return { class: 'sul-americana', text: 'SUL-AM' };
    if (posicao >= 17) return { class: 'rebaixamento', text: 'REB' };
    return { class: '', text: '' };
}

function loadEstatisticas() {
    updateStatsList('escanteios');
    setupStatsFilters();
    initTeamSearch();
}

function setupStatsFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateStatsList(btn.getAttribute('data-stat'));
        });
    });
}

function updateStatsList(statType) {
    const statsList = document.getElementById('statsList');
    if (!statsList || !window.CAMPEONATO_DATA) return;
    
    let estatisticasOrdenadas = [];
    let title = '';
    let icon = '';
    
    const data = CAMPEONATO_DATA.estatisticas;

    if (statType === 'escanteios') {
        estatisticasOrdenadas = [...data].sort((a, b) => b.escanteios_total - a.escanteios_total);
        title = 'ESCANTEIOS (TOP 10)'; icon = 'fa-flag';
    } else if (statType === 'cartoes') {
        estatisticasOrdenadas = [...data].sort((a, b) => b.total_cartoes - a.total_cartoes);
        title = 'CARTÕES (TOP 10)'; icon = 'fa-copy';
    } else if (statType === 'faltas') {
        estatisticasOrdenadas = [...data].sort((a, b) => b.faltas_cometidas - a.faltas_cometidas);
        title = 'FALTAS (TOP 10)'; icon = 'fa-running';
    } else {
        estatisticasOrdenadas = [...data].sort((a, b) => b.posse_bola - a.posse_bola);
        title = 'POSSE DE BOLA (TOP 10)'; icon = 'fa-bullseye';
    }

    const titleElement = statsList.parentElement.querySelector('h3');
    if (titleElement) titleElement.innerHTML = `<i class="fas ${icon}"></i> ${title}`;

    statsList.innerHTML = '';
    estatisticasOrdenadas.slice(0, 10).forEach((estat, index) => {
        const item = document.createElement('div');
        item.className = 'stats-item';
        let val = statType === 'posse' ? `${estat.posse_bola}%` : estat[statType === 'escanteios' ? 'escanteios_total' : statType === 'cartoes' ? 'total_cartoes' : 'faltas_cometidas'];
        
        item.innerHTML = `
            <div class="stats-pos">${index + 1}</div>
            <div class="stats-team">${estat.time}</div>
            <div class="stats-value">${val}</div>
        `;
        statsList.appendChild(item);
    });
}

function initTeamSearch() {
    const searchInput = document.getElementById('teamSearch');
    if (!searchInput) return;
    loadQuickTeams();
    searchInput.addEventListener('input', function() {
        if (this.value.trim() !== '') {
            searchTeams(this.value);
        } else {
            hideTeamStatsPanel();
        }
    });
    document.getElementById('closePanel').addEventListener('click', hideTeamStatsPanel);
}

function searchTeams(query) {
    const teamStats = CAMPEONATO_DATA.estatisticas.find(estat => 
        estat.time.toLowerCase().includes(query.toLowerCase().trim())
    );
    if (teamStats) {
        document.getElementById('teamStatsPanel').style.display = 'block';
        document.getElementById('generalStats').style.display = 'none';
        // Preencher cards de estatísticas (Exemplo simplificado)
        document.getElementById('teamInfoHeader').innerHTML = `<h4>${teamStats.time}</h4>`;
        document.getElementById('totalCorners').textContent = teamStats.escanteios_total;
    }
}

function hideTeamStatsPanel() {
    document.getElementById('teamStatsPanel').style.display = 'none';
    document.getElementById('generalStats').style.display = 'block';
}

function loadQuickTeams() {
    const quickTeams = document.getElementById('quickTeams');
    if (!quickTeams) return;
    CAMPEONATO_DATA.estatisticas.slice(0, 8).forEach(team => {
        const btn = document.createElement('button');
        btn.className = 'quick-team-btn';
        btn.innerHTML = `<span>${team.time}</span>`;
        btn.onclick = () => searchTeams(team.time);
        quickTeams.appendChild(btn);
    });
}

function loadArtilharia() {
    const artilhariaList = document.getElementById('artilhariaList');
    if (!artilhariaList || !CAMPEONATO_DATA.artilharia) return;
    CAMPEONATO_DATA.artilharia.slice(0, 10).forEach(art => {
        const item = document.createElement('div');
        item.className = 'stats-item';
        item.innerHTML = `<div class="stats-pos">${art.posicao}</div><div class="stats-team">${art.jogador} (${art.clube})</div><div class="stats-value">${art.gols}</div>`;
        artilhariaList.appendChild(item);
    });
}

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (document.getElementById('lastUpdate')) document.getElementById('lastUpdate').textContent = `Sincronizado: ${timeString}`;
    if (document.getElementById('updateTime')) document.getElementById('updateTime').textContent = timeString;
}

function setupModal() {
    const modal = document.getElementById('gameModal');
    const close = document.querySelector('.close-modal');
    if (close) close.onclick = () => modal.classList.remove('active');
}
