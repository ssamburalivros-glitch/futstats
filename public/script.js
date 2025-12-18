// script.js - Atualizado com dados do Brasileirão 2025
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar todas as funcionalidades
    initNavigation();
    loadStandings();
    loadEstatisticas();
    loadLiveGames();
    loadArtilharia();
    setupModal();
    
    // Atualizar tempo
    updateTime();
    setInterval(updateTime, 60000); // Atualizar a cada minuto
});

// Navegação entre abas
function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            
            // Remover classe active de todas as abas e conteúdos
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Adicionar classe active na aba e conteúdo selecionados
            tab.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });
}

// Carregar classificação
function loadStandings() {
    const tbody = document.getElementById('standingsBody');
    if (!tbody) return;
    
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

// Determinar status do time
function getStatus(posicao) {
    if (posicao <= 4) return { class: 'libertadores', text: 'LIB' };
    if (posicao <= 6) return { class: 'pre-libertadores', text: 'PRE-LIB' };
    if (posicao <= 12) return { class: 'sul-americana', text: 'SUL-AM' };
    if (posicao >= 17) return { class: 'rebaixamento', text: 'REB' };
    return { class: '', text: '' };
}

// Carregar estatísticas
function loadEstatisticas() {
    const statsList = document.getElementById('statsList');
    if (!statsList) return;
    
    // Carregar estatísticas iniciais (escanteios)
    updateStatsList('escanteios');
    
    // Configurar filtros de estatísticas
    setupStatsFilters();
    
    // Inicializar pesquisa de times
    initTeamSearch();
}

// Configurar filtros de estatísticas
function setupStatsFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const statsList = document.getElementById('statsList');
    
    if (!filterBtns.length || !statsList) return;
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover active de todos os botões
            filterBtns.forEach(b => b.classList.remove('active'));
            // Adicionar active no botão clicado
            btn.classList.add('active');
            
            const statType = btn.getAttribute('data-stat');
            updateStatsList(statType);
        });
    });
}

// Atualizar lista de estatísticas
function updateStatsList(statType) {
    const statsList = document.getElementById('statsList');
    if (!statsList) return;
    
    let estatisticasOrdenadas = [];
    let title = '';
    let icon = '';
    
    switch(statType) {
        case 'escanteios':
            estatisticasOrdenadas = [...CAMPEONATO_DATA.estatisticas]
                .sort((a, b) => b.escanteios_total - a.escanteios_total)
                .slice(0, 10);
            title = 'ESCANTEIOS (TOP 10)';
            icon = 'fa-flag';
            break;
        case 'cartoes':
            estatisticasOrdenadas = [...CAMPEONATO_DATA.estatisticas]
                .sort((a, b) => b.total_cartoes - a.total_cartoes)
                .slice(0, 10);
            title = 'CARTÕES (TOP 10)';
            icon = 'fa-card';
            break;
        case 'faltas':
            estatisticasOrdenadas = [...CAMPEONATO_DATA.estatisticas]
                .sort((a, b) => b.faltas_cometidas - a.faltas_cometidas)
                .slice(0, 10);
            title = 'FALTAS (TOP 10)';
            icon = 'fa-running';
            break;
        case 'posse':
            estatisticasOrdenadas = [...CAMPEONATO_DATA.estatisticas]
                .sort((a, b) => b.posse_bola - a.posse_bola)
                .slice(0, 10);
            title = 'POSSE DE BOLA (TOP 10)';
            icon = 'fa-bullseye';
            break;
    }
    
    // Atualizar título
    const titleElement = statsList.parentElement.querySelector('h3');
    if (titleElement) {
        titleElement.innerHTML = `<i class="fas ${icon}"></i> ${title}`;
    }
    
    statsList.innerHTML = '';
    
    estatisticasOrdenadas.forEach((estat, index) => {
        const item = document.createElement('div');
        item.className = 'stats-item';
        
        let value = '';
        switch(statType) {
            case 'escanteios': value = estat.escanteios_total; break;
            case 'cartoes': value = estat.total_cartoes; break;
            case 'faltas': value = estat.faltas_cometidas; break;
            case 'posse': value = `${estat.posse_bola || 0}%`; break;
        }
        
        item.innerHTML = `
            <div class="stats-pos">${index + 1}</div>
            <div class="stats-team">${estat.time}</div>
            <div class="stats-value">${value}</div>
        `;
        
        // Adicionar clique para mostrar estatísticas do time
        item.addEventListener('click', () => {
            document.getElementById('teamSearch').value = estat.time;
            searchTeams(estat.time);
        });
        
        statsList.appendChild(item);
    });
}

// Função para inicializar a pesquisa de times
function initTeamSearch() {
    const searchInput = document.getElementById('teamSearch');
    const clearSearchBtn = document.getElementById('clearSearch');
    const teamStatsPanel = document.getElementById('teamStatsPanel');
    const generalStats = document.getElementById('generalStats');
    
    if (!searchInput) return;
    
    // Popular times rápidos
    loadQuickTeams();
    
    // Mostrar/ocultar botão de limpar
    searchInput.addEventListener('input', function() {
        if (this.value.trim() !== '') {
            clearSearchBtn.style.display = 'block';
            searchTeams(this.value);
        } else {
            clearSearchBtn.style.display = 'none';
            hideTeamStatsPanel();
        }
    });
    
    // Limpar pesquisa
    clearSearchBtn.addEventListener('click', function() {
        searchInput.value = '';
        this.style.display = 'none';
        hideTeamStatsPanel();
    });
    
    // Pesquisar ao pressionar Enter
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchTeams(this.value);
        }
    });
    
    // Fechar painel do time
    document.getElementById('closePanel').addEventListener('click', hideTeamStatsPanel);
}

// Pesquisar times
function searchTeams(query) {
    const queryLower = query.toLowerCase().trim();
    if (queryLower === '') return;
    
    // Encontrar time nos dados
    const teamStats = CAMPEONATO_DATA.estatisticas.find(estat => 
        estat.time.toLowerCase().includes(queryLower)
    );
    
    if (teamStats) {
        showTeamStatsPanel(teamStats);
    } else {
        // Mostrar mensagem de não encontrado
        const teamStatsPanel = document.getElementById('teamStatsPanel');
        const generalStats = document.getElementById('generalStats');
        
        teamStatsPanel.style.display = 'block';
        generalStats.style.display = 'none';
        
        document.getElementById('teamInfoHeader').innerHTML = `
            <div class="team-not-found">
                <i class="fas fa-search"></i>
                <h4>Time não encontrado</h4>
                <p>Não encontramos estatísticas para "${query}"</p>
                <p class="suggestion">Verifique a grafia ou tente outro time</p>
            </div>
        `;
    }
}

// Mostrar painel de estatísticas do time
function showTeamStatsPanel(teamStats) {
    const teamStatsPanel = document.getElementById('teamStatsPanel');
    const generalStats = document.getElementById('generalStats');
    
    teamStatsPanel.style.display = 'block';
    generalStats.style.display = 'none';
    
    // Preencher informações do time
    document.getElementById('teamInfoHeader').innerHTML = `
        <div class="team-header">
            <div class="team-logo-large">
                <i class="fas fa-futbol"></i>
            </div>
            <div class="team-details">
                <h4>${teamStats.time}</h4>
                <div class="team-meta">
                    <span class="team-position">${getTeamPosition(teamStats.time)}º na classificação</span>
                    <span class="team-points">${getTeamPoints(teamStats.time)} pontos</span>
                </div>
            </div>
        </div>
    `;
    
    // Preencher estatísticas
    document.getElementById('totalCorners').textContent = teamStats.escanteios_total || 0;
    document.getElementById('cornersPerGame').textContent = (teamStats.escanteios_total / 38).toFixed(1);
    document.getElementById('cornersRank').textContent = getStatRanking(teamStats.time, 'escanteios_total') + 'º';
    
    document.getElementById('yellowCards').textContent = teamStats.cartoes_amarelos || 0;
    document.getElementById('redCards').textContent = teamStats.cartoes_vermelhos || 0;
    document.getElementById('totalCards').textContent = teamStats.total_cartoes || 0;
    
    document.getElementById('foulsCommitted').textContent = teamStats.faltas_cometidas || 0;
    document.getElementById('foulsSuffered').textContent = teamStats.faltas_sofridas || 0;
    document.getElementById('foulsPerGame').textContent = (teamStats.faltas_cometidas / 38).toFixed(1);
    
    document.getElementById('possession').textContent = teamStats.posse_bola ? `${teamStats.posse_bola}%` : '0%';
    document.getElementById('shotsPerGame').textContent = teamStats.chutes_por_jogo ? teamStats.chutes_por_jogo.toFixed(1) : '0';
    document.getElementById('shotAccuracy').textContent = teamStats.precisao_chutes ? `${teamStats.precisao_chutes}%` : '0%';
    
    // Carregar últimos jogos do time
    loadRecentGames(teamStats.time);
}

// Ocultar painel de estatísticas do time
function hideTeamStatsPanel() {
    const teamStatsPanel = document.getElementById('teamStatsPanel');
    const generalStats = document.getElementById('generalStats');
    const searchInput = document.getElementById('teamSearch');
    
    teamStatsPanel.style.display = 'none';
    generalStats.style.display = 'block';
    searchInput.value = '';
    document.getElementById('clearSearch').style.display = 'none';
}

// Obter posição do time na classificação
function getTeamPosition(teamName) {
    const team = CAMPEONATO_DATA.classificacao.find(clube => 
        clube.clube.toLowerCase() === teamName.toLowerCase()
    );
    return team ? team.posicao : '-';
}

// Obter pontos do time
function getTeamPoints(teamName) {
    const team = CAMPEONATO_DATA.classificacao.find(clube => 
        clube.clube.toLowerCase() === teamName.toLowerCase()
    );
    return team ? team.pontos : 0;
}

// Obter ranking de uma estatística
function getStatRanking(teamName, statType) {
    const sortedStats = [...CAMPEONATO_DATA.estatisticas]
        .sort((a, b) => b[statType] - a[statType]);
    
    const index = sortedStats.findIndex(estat => 
        estat.time.toLowerCase() === teamName.toLowerCase()
    );
    
    return index + 1; // +1 porque index começa em 0
}

// Carregar últimos jogos do time
function loadRecentGames(teamName) {
    const recentGamesList = document.getElementById('recentGamesList');
    if (!recentGamesList) return;
    
    // Filtrar jogos do time (últimas 5 rodadas)
    const teamGames = CAMPEONATO_DATA.partidas.filter(jogo => 
        jogo.time_mandante.toLowerCase() === teamName.toLowerCase() || 
        jogo.time_visitante.toLowerCase() === teamName.toLowerCase()
    ).slice(0, 5); // Pegar apenas os 5 últimos
    
    recentGamesList.innerHTML = '';
    
    if (teamGames.length === 0) {
        recentGamesList.innerHTML = `
            <div class="no-games">
                <i class="fas fa-calendar-times"></i>
                <p>Não há jogos recentes disponíveis</p>
            </div>
        `;
        return;
    }
    
    teamGames.forEach(jogo => {
        const [golsMandante, golsVisitante] = jogo.placar.split('-');
        const isHome = jogo.time_mandante.toLowerCase() === teamName.toLowerCase();
        const opponent = isHome ? jogo.time_visitante : jogo.time_mandante;
        const teamScore = isHome ? golsMandante : golsVisitante;
        const opponentScore = isHome ? golsVisitante : golsMandante;
        
        const gameItem = document.createElement('div');
        gameItem.className = 'recent-game-item';
        
        // Determinar resultado
        let resultClass = 'draw';
        let resultText = 'E';
        
        if (parseInt(teamScore) > parseInt(opponentScore)) {
            resultClass = 'win';
            resultText = 'V';
        } else if (parseInt(teamScore) < parseInt(opponentScore)) {
            resultClass = 'loss';
            resultText = 'D';
        }
        
        gameItem.innerHTML = `
            <div class="game-result ${resultClass}">${resultText}</div>
            <div class="game-details">
                <div class="game-opponent">${isHome ? 'vs' : '@'} ${opponent}</div>
                <div class="game-score">${teamScore} - ${opponentScore}</div>
                <div class="game-meta">
                    <span class="game-round">Rodada ${jogo.rodada}</span>
                    <span class="game-stadium">${jogo.estadio}</span>
                </div>
            </div>
        `;
        
        recentGamesList.appendChild(gameItem);
    });
}

// Carregar times rápidos
function loadQuickTeams() {
    const quickTeams = document.getElementById('quickTeams');
    if (!quickTeams) return;
    
    // Times mais populares (top 8)
    const popularTeams = CAMPEONATO_DATA.estatisticas
        .sort((a, b) => b.escanteios_total - a.escanteios_total)
        .slice(0, 8);
    
    quickTeams.innerHTML = '';
    
    popularTeams.forEach(team => {
        const teamBtn = document.createElement('button');
        teamBtn.className = 'quick-team-btn';
        teamBtn.innerHTML = `
            <i class="fas fa-futbol"></i>
            <span>${team.time}</span>
        `;
        
        teamBtn.addEventListener('click', () => {
            document.getElementById('teamSearch').value = team.time;
            searchTeams(team.time);
        });
        
        quickTeams.appendChild(teamBtn);
    });
}

// Carregar jogos ao vivo (última rodada)
function loadLiveGames() {
    const liveGamesContainer = document.getElementById('liveGames');
    if (!liveGamesContainer) return;
    
    // Filtrar apenas a última rodada (rodada 38)
    const ultimaRodada = CAMPEONATO_DATA.partidas.filter(jogo => jogo.rodada === 38);
    
    liveGamesContainer.innerHTML = '';
    
    if (ultimaRodada.length === 0) {
        liveGamesContainer.innerHTML = `
            <div class="no-games">
                <i class="fas fa-calendar-times"></i>
                <p>Não há jogos ao vivo no momento</p>
            </div>
        `;
        return;
    }
    
    ultimaRodada.forEach(jogo => {
        const [golsMandante, golsVisitante] = jogo.placar.split('-');
        
        const gameCard = document.createElement('div');
        gameCard.className = 'live-game-card';
        gameCard.innerHTML = `
            <div class="game-teams">
                <div class="team">
                    <div class="team-name">${jogo.time_mandante}</div>
                    <div class="team-logo">
                        <i class="fas fa-futbol"></i>
                    </div>
                </div>
                <div class="game-score">
                    <span class="score">${golsMandante}</span>
                    <span class="divider">x</span>
                    <span class="score">${golsVisitante}</span>
                </div>
                <div class="team">
                    <div class="team-logo">
                        <i class="fas fa-futbol"></i>
                    </div>
                    <div class="team-name">${jogo.time_visitante}</div>
                </div>
            </div>
            <div class="game-info">
                <span class="game-status">Encerrado</span>
                <span class="game-stadium">${jogo.estadio}</span>
            </div>
        `;
        
        liveGamesContainer.appendChild(gameCard);
    });
    
    // Atualizar estatísticas
    updateLiveStats(ultimaRodada);
    
    // Configurar botão de atualizar
    document.getElementById('refreshLive').addEventListener('click', () => {
        loadLiveGames();
        updateTime();
    });
}

// Atualizar estatísticas ao vivo
function updateLiveStats(jogos) {
    // Contar jogos ativos (encerrados na última rodada)
    document.getElementById('activeGames').textContent = jogos.length;
    
    // Calcular total de gols
    const totalGols = jogos.reduce((total, jogo) => {
        const [golsMandante, golsVisitante] = jogo.placar.split('-');
        return total + parseInt(golsMandante) + parseInt(golsVisitante);
    }, 0);
    
    document.getElementById('totalGoals').textContent = totalGols;
}

// Carregar artilharia
function loadArtilharia() {
    // Adicionar artilharia na seção de estatísticas
    const statsContainer = document.querySelector('.stats-container');
    if (!statsContainer || !CAMPEONATO_DATA.artilharia) return;
    
    // Preencher artilharia
    const artilhariaList = document.getElementById('artilhariaList');
    const top10Artilheiros = CAMPEONATO_DATA.artilharia.slice(0, 10);
    
    top10Artilheiros.forEach(artilheiro => {
        const item = document.createElement('div');
        item.className = 'stats-item';
        item.innerHTML = `
            <div class="stats-pos">${artilheiro.posicao}</div>
            <div class="stats-team">${artilheiro.jogador} (${artilheiro.clube})</div>
            <div class="stats-value">${artilheiro.gols}</div>
        `;
        
        // Adicionar clique para pesquisar o time do artilheiro
        item.addEventListener('click', () => {
            document.getElementById('teamSearch').value = artilheiro.clube;
            searchTeams(artilheiro.clube);
        });
        
        artilhariaList.appendChild(item);
    });
}

// Atualizar tempo
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const lastUpdate = document.getElementById('lastUpdate');
    const updateTime = document.getElementById('updateTime');
    
    if (lastUpdate) {
        lastUpdate.textContent = `Atualizado às ${timeString}`;
    }
    
    if (updateTime) {
        updateTime.textContent = timeString;
    }
}

// Configurar modal
function setupModal() {
    const modal = document.getElementById('gameModal');
    const closeModal = document.querySelector('.close-modal');
    
    if (!modal || !closeModal) return;
    
    // Fechar modal ao clicar no X
    closeModal.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}
