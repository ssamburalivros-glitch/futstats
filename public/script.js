// script.js - Versão Estável
const SUPABASE_URL = https://vqocdowjdutfzmnvxqvz.supabase.co; 
const SUPABASE_KEY = sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm;

let _supabase = null;
try {
    if (SUPABASE_URL !== 'SUA_URL_AQUI' && SUPABASE_URL !== "") {
        _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (e) { console.error("Supabase Offline"); }

document.addEventListener('DOMContentLoaded', () => {
    // 1. Iniciar Navegação
    initNavigation();
    
    // 2. Carregar Dados do dados.js (Classificação e Estatísticas)
    if (window.CAMPEONATO_DATA) {
        try {
            renderStandings();
            renderArtilharia();
            initSearchAndStats();
            console.log("Dados carregados com sucesso.");
        } catch (err) {
            console.error("Erro ao renderizar dados:", err);
        }
    } else {
        alert("Erro: O arquivo dados.js não foi carregado corretamente.");
    }

    // 3. Jogos ao Vivo
    loadLiveGames();
    setInterval(loadLiveGames, 30000);
});

function renderStandings() {
    const tbody = document.getElementById('standingsBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const dados = window.CAMPEONATO_DATA.classificacao;
    dados.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.posicao}</td>
            <td><strong>${item.clube}</strong></td>
            <td>${item.pontos}</td>
            <td>${item.jogos}</td>
            <td>${item.vitorias}</td>
            <td>${item.empates}</td>
            <td>${item.derrotas}</td>
            <td>${item.golsPro}</td>
            <td>${item.saldoGols}</td>
            <td><span class="status-tag ${item.posicao <= 6 ? 'blue' : item.posicao >= 17 ? 'red' : ''}">${item.posicao <= 6 ? 'LIB' : item.posicao >= 17 ? 'Z4' : '-'}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function initSearchAndStats() {
    const input = document.getElementById('teamSearch');
    const panel = document.getElementById('teamStatsPanel');
    const general = document.getElementById('generalStats');

    if (!input) return;

    input.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase().trim();
        const time = window.CAMPEONATO_DATA.classificacao.find(t => t.clube.toLowerCase().includes(termo));

        if (time && termo !== "") {
            panel.style.display = 'block';
            general.style.display = 'none';
            document.getElementById('teamInfoHeader').innerHTML = `<h3>${time.clube}</h3>`;
            document.getElementById('yellowCards').textContent = time.cartoesAmarelos || 0;
            document.getElementById('redCards').textContent = time.cartoesVermelhos || 0;
            document.getElementById('possession').textContent = (time.aproveitamento || 0) + "%";
        } else {
            panel.style.display = 'none';
            general.style.display = 'block';
        }
    });
}

function renderArtilharia() {
    const list = document.getElementById('artilhariaList');
    if (!list) return;
    list.innerHTML = '';
    window.CAMPEONATO_DATA.artilharia.slice(0, 10).forEach(art => {
        list.innerHTML += `<div class="stats-item"><span>${art.jogador} (${art.clube})</span><strong>${art.gols}</strong></div>`;
    });
}

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
                            <div class="game-status">${jogo.status || 'AO VIVO'}</div>
                        </div>`;
                });
                document.getElementById('activeGames').textContent = data.length;
                return;
            }
        } catch (e) { console.error("Erro ao buscar live"); }
    }
    container.innerHTML = '<p class="no-games">Nenhum jogo ao vivo disponível no momento.</p>';
}

function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.tab);
            if (target) target.classList.add('active');
        };
    });
}
