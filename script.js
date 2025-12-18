// Configurações
const GAMES_DATA_URL = 'games.json'; // Arquivo local atualizado pelo GitHub Actions
const UPDATE_INTERVAL = 300000; // 5 minutos
let currentGames = [];
let updateTimer = null;
let countdown = 300; // 5 minutos em segundos

// Elementos DOM
const gamesContainer = document.getElementById('gamesContainer');
const liveCount = document.getElementById('liveCount');
const leaguesCount = document.getElementById('leaguesCount');
const totalGoals = document.getElementById('totalGoals');
const lastUpdate = document.getElementById('lastUpdate');
const updateTimerSpan = document.getElementById('updateTimer');
const totalCountries = document.getElementById('totalCountries');
const nextUpdate = document.getElementById('nextUpdate');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const countriesGrid = document.getElementById('countriesGrid');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Carregar dados iniciais
    loadGamesData();
    
    // Configurar busca
    searchInput.addEventListener('input', filterGames);
    
    // Configurar filtros
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterGames();
        });
    });
    
    // Configurar atualização automática
    startAutoUpdate();
    
    // Configurar modal
    setupModal();
});

// Carregar dados dos jogos
async function loadGamesData() {
    try {
        showLoading();
        
        // Tentar carregar do arquivo local
        const response = await fetch(GAMES_DATA_URL + '?t=' + Date.now());
        const data = await response.json();
        
        if (data.success && data.games) {
            currentGames = data.games;
            renderAllGames(currentGames);
            updateStats(data);
            updateCountries(data.games);
            showSuccess('Dados atualizados!');
        } else {
            // Fallback para dados de exemplo
            loadFallbackData();
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        loadFallbackData();
    }
}

function renderAllGames(games) {
    if (!games || games.length === 0) {
        gamesContainer.innerHTML = `
            <div class="no-games">
                <i class="fas fa-calendar-times fa-3x"></i>
                <h3>Nenhum jogo ao vivo no momento</h3>
                <p>Os jogos aparecerão aqui quando começarem</p>
            </div>
        `;
        return;
    }
    
    // Ordenar: brasileirão primeiro, depois ao vivo, depois por país
    const sortedGames = [...games].sort((a, b) => {
        if (a.is_brasileirao && !b.is_brasileirao) return -1;
        if (!a.is_brasileirao && b.is_brasileirao) return 1;
        if (a.is_live && !b.is_live) return -1;
        if (!a.is_live && b.is_live) return 1;
        return a.country.localeCompare(b.country);
    });
    
    gamesContainer.innerHTML = sortedGames.map(game => createGameCard(game)).join('');
    
    // Adicionar eventos de clique
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => showGameDetails(card.dataset.match));
    });
}

function createGameCard(game) {
    const isLive = game.is_live;
    const isBrasil = game.country === 'Brasil';
    const cardClass = `game-card ${isLive ? 'live' : ''} ${isBrasil ? 'brasil' : ''}`;
    
    // Formatar status
    let statusClass = 'game-status';
    let statusText = game.status;
    
    if (game.status.includes('INTERVALO')) {
        statusClass += ' interval';
    } else if (game.status.includes('AO VIVO')) {
        statusClass += ' live-badge';
    }
    
    // Obter emoji da bandeira
    const flagEmoji = getCountryFlag(game.country);
    
    return `
        <div class="${cardClass}" data-match="${game.match}">
            <div class="${statusClass}">${statusText}</div>
            <div class="game-teams">
                <div class="team home">
                    <div class="team-logo">${getTeamAbbreviation(game.home_team)}</div>
                    <div class="team-name">${game.home_team}</div>
                </div>
                <div class="score">${game.home_score} - ${game.away_score}</div>
                <div class="team away">
                    <div class="team-logo">${getTeamAbbreviation(game.away_team)}</div>
                    <div class="team-name">${game.away_team}</div>
                </div>
            </div>
            <div class="game-info">
                <div class="league-info">
                    <span class="country-flag">${flagEmoji}</span>
                    <span>${game.league}</span>
                </div>
                <div class="game-time">${formatTime(game.timestamp)}</div>
            </div>
        </div>
    `;
}

function updateStats(data) {
    // Atualizar contadores
    liveCount.textContent = data.live_games || 0;
    
    // Contar campeonatos únicos
    const leagues = new Set(data.games.map(g => g.league));
    leaguesCount.textContent = leagues.size;
    
    // Calcular total de gols
    const total = data.games.reduce((sum, game) => {
        const home = parseInt(game.home_score) || 0;
        const away = parseInt(game.away_score) || 0;
        return sum + home + away;
    }, 0);
    totalGoals.textContent = total;
    
    // Atualizar horário
    lastUpdate.textContent = formatUpdateTime(data.updated_at);
    document.title = `FutStats LIVE (${data.live_games} jogos)`;
}

function updateCountries(games) {
    // Agrupar por país
    const countries = {};
    games.forEach(game => {
        const country = game.country || 'Internacional';
        if (!countries[country]) {
            countries[country] = {
                count: 0,
                leagues: new Set()
            };
        }
        countries[country].count++;
        countries[country].leagues.add(game.league);
    });
    
    // Ordenar por quantidade de jogos
    const sortedCountries = Object.entries(countries)
        .sort((a, b) => b[1].count - a[1].count);
    
    totalCountries.textContent = `${sortedCountries.length} países`;
    
    // Renderizar países
    countriesGrid.innerHTML = sortedCountries.map(([country, data]) => {
        const flag = getCountryFlag(country);
        const leagueCount = data.leagues.size;
        
        return `
            <div class="country-card">
                <div class="country-flag-lg">${flag}</div>
                <div class="country-info">
                    <h4>${country}</h4>
                    <p>${data.count} jogos • ${leagueCount} camp.</p>
                </div>
            </div>
        `;
    }).join('');
}

function filterGames() {
    const searchTerm = searchInput.value.toLowerCase();
    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
    
    const filtered = currentGames.filter(game => {
        // Aplicar filtro
        let passesFilter = true;
        if (activeFilter === 'brasil') {
            passesFilter = game.country === 'Brasil';
        } else if (activeFilter === 'europa') {
            passesFilter = ['Inglaterra', 'Espanha', 'Itália', 'Alemanha', 'França', 'Portugal']
                .includes(game.country);
        } else if (activeFilter === 'live') {
            passesFilter = game.is_live;
        }
        
        // Aplicar busca
        const passesSearch = !searchTerm || 
            game.match.toLowerCase().includes(searchTerm) ||
            game.league.toLowerCase().includes(searchTerm) ||
            game.home_team.toLowerCase().includes(searchTerm) ||
            game.away_team.toLowerCase().includes(searchTerm);
        
        return passesFilter && passesSearch;
    });
    
    renderAllGames(filtered);
    
    // Atualizar contador de resultados
    const resultsCount = document.getElementById('resultsCount') || 
        document.createElement('div');
    resultsCount.id = 'resultsCount';
    resultsCount.className = 'results-count';
    resultsCount.textContent = `${filtered.length} jogos encontrados`;
    
    if (!document.getElementById('resultsCount')) {
        gamesContainer.parentNode.insertBefore(resultsCount, gamesContainer);
    }
}

// Funções utilitárias
function getCountryFlag(country) {
    const flags = {
        'Brasil': '🇧🇷',
        'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        'Espanha': '🇪🇸',
        'Itália': '🇮🇹',
        'Alemanha': '🇩🇪',
        'França': '🇫🇷',
        'Portugal': '🇵🇹',
        'Argentina': '🇦🇷'
    };
    return flags[country] || '🌍';
}

function getTeamAbbreviation(name) {
    const words = name.split(' ');
    if (words.length === 1) return name.substring(0, 3).toUpperCase();
    
    // Times brasileiros
    const brasilTeams = {
        'Flamengo': 'FLA',
        'Palmeiras': 'PAL',
        'Corinthians': 'COR',
        'São Paulo': 'SAO',
        'Santos': 'SAN',
        'Grêmio': 'GRE',
        'Internacional': 'INT',
        'Atlético-MG': 'CAM',
        'Cruzeiro': 'CRU',
        'Fluminense': 'FLU',
        'Vasco': 'VAS',
        'Botafogo': 'BOT',
        'Bahia': 'BAH',
        'Sport': 'SPO',
        'Fortaleza': 'FOR',
        'Ceará': 'CEA',
        'Atlético-PR': 'CAP',
        'Chapecoense': 'CHA'
    };
    
    if (brasilTeams[name]) return brasilTeams[name];
    
    // Times europeus comuns
    const euroTeams = {
        'Real Madrid': 'RMA',
        'Barcelona': 'BAR',
        'Manchester United': 'MUN',
        'Manchester City': 'MCI',
        'Liverpool': 'LIV',
        'Chelsea': 'CHE',
        'Arsenal': 'ARS',
        'Bayern Munich': 'BAY',
        'Borussia Dortmund': 'BVB',
        'Juventus': 'JUV',
        'Milan': 'MIL',
        'Inter': 'INT',
        'Paris Saint-Germain': 'PSG'
    };
    
    if (euroTeams[name]) return euroTeams[name];
    
    // Se não encontrar, usar sigla padrão
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    
    return name.substring(0, 3).toUpperCase();
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function formatUpdateTime(timestamp) {
    const now = new Date();
    const update = new Date(timestamp);
    const diff = Math.floor((now - update) / 1000); // diferença em segundos
    
    if (diff < 60) return 'Agora mesmo';
    if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Há ${Math.floor(diff / 3600)}h`;
    return update.toLocaleTimeString('pt-BR');
}

// Sistema de atualização automática
function startAutoUpdate() {
    // Atualizar contador
    updateCountdown();
    
    // Atualizar dados a cada X minutos
    updateTimer = setInterval(() => {
        loadGamesData();
        countdown = 300; // Reset para 5 minutos
    }, UPDATE_INTERVAL);
    
    // Atualizar contador a cada segundo
    setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    updateTimerSpan.textContent = `Atualizando em ${minutes}:${seconds.toString().padStart(2, '0')}`;
    nextUpdate.textContent = `${minutes} min ${seconds} s`;
    
    if (countdown > 0) {
        countdown--;
    }
}

// Modal
function setupModal() {
    const modal = document.getElementById('gameModal');
    const closeBtn = document.querySelector('.close-modal');
    
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
    
    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });
}

function showGameDetails(match) {
    const game = currentGames.find(g => g.match === match);
    if (!game) return;
    
    const modal = document.getElementById('gameModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    title.textContent = game.match;
    
    body.innerHTML = `
        <div class="modal-game-details">
            <div class="detail-row">
                <strong>Campeonato:</strong>
                <span>${game.league}</span>
            </div>
            <div class="detail-row">
                <strong>País:</strong>
                <span>${game.country} ${getCountryFlag(game.country)}</span>
            </div>
            <div class="detail-row">
                <strong>Status:</strong>
                <span class="status-badge">${game.status}</span>
            </div>
            <div class="detail-row">
                <strong>Placar:</strong>
                <span class="score-large">${game.home_score} - ${game.away_score}</span>
            </div>
            <div class="detail-row">
                <strong>Atualizado:</strong>
                <span>${formatUpdateTime(game.timestamp)}</span>
            </div>
            <div class="detail-actions">
                <button class="btn-refresh" onclick="loadGamesData()">
                    <i class="fas fa-redo"></i> Atualizar Dados
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

// Funções de UI
function showLoading() {
    gamesContainer.innerHTML = `
        <div class="loading">
            <i class="fas fa-satellite fa-spin"></i>
            <p>Conectando ao servidor de dados...</p>
        </div>
    `;
}

function showSuccess(message) {
    // Criar notificação temporária
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 255, 136, 0.9);
        color: #000;
        padding: 15px 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Fallback data
function loadFallbackData() {
    const fallbackData = {
        success: true,
        games: [
            {
                match: "Real Madrid x Barcelona",
                status: "AO VIVO 65'",
                league: "La Liga",
                home_team: "Real Madrid",
                away_team: "Barcelona",
                home_score: "2",
                away_score: "1",
                is_live: true,
                is_brasileirao: false,
                country: "Espanha",
                timestamp: new Date().toISOString()
            },
            {
                match: "Manchester United x Liverpool",
                status: "AO VIVO 45'",
                league: "Premier League",
                home_team: "Manchester United",
                away_team: "Liverpool",
                home_score: "1",
                away_score: "1",
                is_live: true,
                is_brasileirao: false,
                country: "Inglaterra",
                timestamp: new Date().toISOString()
            }
        ],
        total: 2,
        live_games: 2,
        brasileirao_games: 0,
        updated_at: new Date().toISOString()
    };
    
    currentGames = fallbackData.games;
    renderAllGames(currentGames);
    updateStats(fallbackData);
    updateCountries(fallbackData.games);
    
    showSuccess("Usando dados de exemplo");
}

// Recarregar manualmente (para botão F5)
document.addEventListener('keydown', (e) => {
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
        loadGamesData();
    }
});

// Atualizar quando a página ganha foco
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        loadGamesData();
    }
});

// Service Worker para cache (opcional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    });
}
