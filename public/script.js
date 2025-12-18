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
    const escanteiosList = document.getElementById('escanteiosList');
    if (!escanteiosList) return;
    
    // Ordenar por escanteios
    const estatisticasOrdenadas = [...CAMPEONATO_DATA.estatisticas]
        .sort((a, b) => b.escanteios_total - a.escanteios_total)
        .slice(0, 10);
    
    escanteiosList.innerHTML = '';
    
    estatisticasOrdenadas.forEach((estat, index) => {
        const item = document.createElement('div');
        item.className = 'stats-item';
        item.innerHTML = `
            <div class="stats-pos">${index + 1}</div>
            <div class="stats-team">${estat.time}</div>
            <div class="stats-value">${estat.escanteios_total}</div>
        `;
        escanteiosList.appendChild(item);
    });
    
    // Configurar filtros de estatísticas
    setupStatsFilters();
}

// Configurar filtros de estatísticas
function setupStatsFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const escanteiosList = document.getElementById('escanteiosList');
    
    if (!filterBtns.length || !escanteiosList) return;
    
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
    const escanteiosList = document.getElementById('escanteiosList');
    if (!escanteiosList) return;
    
    let estatisticasOrdenadas = [];
    let title = '';
    
    switch(statType) {
        case 'escanteios':
            estatisticasOrdenadas = [...CAMPEONATO_DATA.estatisticas]
                .sort((a, b) => b.escanteios_total - a.escanteios_total)
                .slice(0, 10);
            title = 'ESCANTEIOS (TOP 10)';
            break;
        case 'cartoes':
            estatisticasOrdenadas = [...CAMPEONATO_DATA.estatisticas]
                .sort((a, b) => b.total_cartoes - a.total_cartoes)
                .slice(0, 10);
            title = 'CARTÕES (TOP 10)';
            break;
        case 'faltas':
            estatisticasOrdenadas = [...CAMPEONATO_DATA.estatisticas]
                .sort((a, b) => b.faltas_cometidas - a.faltas_cometidas)
                .slice(0, 10);
            title = 'FALTAS (TOP 10)';
            break;
    }
    
    // Atualizar título
    const titleElement = escanteiosList.parentElement.querySelector('h3');
    if (titleElement) {
        const icon = titleElement.querySelector('i').outerHTML;
        titleElement.innerHTML = `${icon} ${title}`;
    }
    
    escanteiosList.innerHTML = '';
    
    estatisticasOrdenadas.forEach((estat, index) => {
        const item = document.createElement('div');
        item.className = 'stats-item';
        
        let value = '';
        switch(statType) {
            case 'escanteios': value = estat.escanteios_total; break;
            case 'cartoes': value = estat.total_cartoes; break;
            case 'faltas': value = estat.faltas_cometidas; break;
        }
        
        item.innerHTML = `
            <div class="stats-pos">${index + 1}</div>
            <div class="stats-team">${estat.time}</div>
            <div class="stats-value">${value}</div>
        `;
        escanteiosList.appendChild(item);
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
    
    // Criar card de artilharia
    const artilhariaCard = document.createElement('div');
    artilhariaCard.className = 'stats-card';
    artilhariaCard.innerHTML = `
        <h3><i class="fas fa-crown"></i> ARTILHARIA (TOP 10)</h3>
        <div class="stats-list" id="artilhariaList">
            <!-- Artilharia será carregada aqui -->
        </div>
    `;
    
    // Adicionar após os cards existentes
    statsContainer.appendChild(artilhariaCard);
    
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
