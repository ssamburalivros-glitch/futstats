// script.js - Versão Final Otimizada para seus Dados
const SUPABASE_URL = 'https://vqocdowjdutfzmnvxqvz.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm';

let _supabase = null;
try {
    if (SUPABASE_URL !== 'SUA_URL_AQUI' && SUPABASE_URL !== "") {
        _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (e) { console.warn("Supabase não configurado."); }

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    
    if (window.CAMPEONATO_DATA) {
        renderStandings();
        renderArtilharia();
        renderStatsList('escanteios'); // Inicia com escanteios por padrão
        initSearch();
        initStatsFilters();
    }

    loadLiveGames();
    setInterval(loadLiveGames, 30000);
});

// --- CLASSIFICAÇÃO ---
function renderStandings() {
    const tbody = document.getElementById('standingsBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    window.CAMPEONATO_DATA.classificacao.forEach(item => {
        const row = `<tr>
            <td>${item.posicao}</td>
            <td><strong>${item.clube}</strong></td>
            <td><strong>${item.pontos}</strong></td>
            <td>${item.jogos}</td>
            <td>${item.vitorias}</td>
            <td>${item.empates}</td>
            <td>${item.derrotas}</td>
            <td>${item.saldoGols}</td>
            <td><span class="status-tag ${item.posicao <= 6 ? 'libertadores' : item.posicao >= 17 ? 'rebaixamento' : ''}">
                ${item.posicao <= 4 ? 'G4' : item.posicao >= 17 ? 'Z4' : '-'}
            </span></td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

// --- PESQUISA DE TIME ---
function initSearch() {
    const input = document.getElementById('teamSearch');
    const panel = document.getElementById('teamStatsPanel');
    const general = document.getElementById('generalStats');

    input.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase().trim();
        const timeData = window.CAMPEONATO_DATA.estatisticas.find(t => t.time.toLowerCase().includes(termo));

        if (timeData && termo !== "") {
            panel.style.display = 'block';
            general.style.display = 'none';
            
            document.getElementById('teamInfoHeader').innerHTML = `<h3>${timeData.time}</h3>`;
            document.getElementById('totalCorners').textContent = timeData.escanteios_total;
            document.getElementById('yellowCards').textContent = timeData.cartao_amarelo;
            document.getElementById('redCards').textContent = timeData.cartao_vermelho;
            document.getElementById('foulsCommitted').textContent = timeData.faltas_cometidas;
            // Usando pontos da classificação para o aproveitamento no painel se necessário
        } else {
            panel.style.display = 'none';
            general.style.display = 'block';
        }
    });
}

// --- FILTROS DE ESTATÍSTICAS (TOP 10) ---
function initStatsFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderStatsList(btn.dataset.stat);
        };
    });
}

function renderStatsList(tipo) {
    const list = document.getElementById('statsList');
    if (!list) return;
    list.innerHTML = '';

    // Mapeia o clique do botão para o nome da coluna no seu dados.js
    const mapa = {
        'escanteios': 'escanteios_total',
        'cartoes': 'total_cartoes',
        'faltas': 'faltas_cometidas'
    };

    const campo = mapa[tipo] || 'escanteios_total';
    const top10 = [...window.CAMPEONATO_DATA.estatisticas]
        .sort((a, b) => b[campo] - a[campo])
        .slice(0, 10);

    top10.forEach((item, idx) => {
        list.innerHTML += `
            <div class="stats-item">
                <span>${idx + 1}. ${item.time}</span>
                <strong>${item[campo]}</strong>
            </div>`;
    });
}

// --- ARTILHARIA ---
function renderArtilharia() {
    const list = document.getElementById('artilhariaList');
    if (!list) return;
    list.innerHTML = '';
    window.CAMPEONATO_DATA.artilharia.slice(0, 10).forEach(art => {
        list.innerHTML += `
            <div class="stats-item">
                <span>${art.jogador} (${art.clube})</span>
                <strong>${art.gols}</strong>
            </div>`;
    });
}

// --- JOGOS AO VIVO ---
async function loadLiveGames() {
    const container = document.getElementById('liveGames');
    if (!container) return;

    if (_supabase) {
        try {
            const { data, error } = await _supabase.from('partidas_ao_vivo').select('*');
            if (data && data.length > 0) {
                container.innerHTML = '';
                data.forEach(jogo => {
                    container.innerHTML += `
                        <div class="live-game-card">
                            <div class="game-teams">
                                <span>${jogo.home_team}</span>
                                <span class="score">${jogo.home_score} x ${jogo.away_score}</span>
                                <span>${jogo.away_team}</span>
                            </div>
                            <div class="game-status live-blink">${jogo.status || 'AO VIVO'}</div>
                        </div>`;
                });
                document.getElementById('activeGames').textContent = data.length;
                return;
            }
        } catch (e) { console.error("Erro Live"); }
    }
    container.innerHTML = '<p style="text-align:center;color:#888;">Nenhum jogo ao vivo no momento.</p>';
}

// --- NAVEGAÇÃO ---
function initNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.nav-tab, .tab-content').forEach(el => el.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.tab);
            if (target) target.classList.add('active');
        };
    });
}

