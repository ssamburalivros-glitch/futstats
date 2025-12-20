// script.js - Sincronizado com seu dados.js
const SUPABASE_URL = https://vqocdowjdutfzmnvxqvz.supabase.co; 
const SUPABASE_KEY = sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm;

let _supabase = null;
if (SUPABASE_URL !== 'SUA_URL_AQUI' && SUPABASE_URL !== '') {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    
    if (window.CAMPEONATO_DATA) {
        loadStandings();
        loadArtilharia();
        initSearchAndStats(); // Agora funciona com seus dados
    }

    // Carregar Jogos ao Vivo do Supabase
    if (_supabase) {
        loadLiveGames();
        setInterval(loadLiveGames, 30000);
    } else {
        document.getElementById('liveGames').innerHTML = '<p class="msg-demo">Conecte o Supabase para ver placares em tempo real.</p>';
    }
    
    updateTime();
});

// --- CLASSIFICAÇÃO ---
function loadStandings() {
    const tbody = document.getElementById('standingsBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    window.CAMPEONATO_DATA.classificacao.forEach(clube => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${clube.posicao}</td>
            <td class="team-name"><strong>${clube.clube}</strong></td>
            <td><strong>${clube.pontos}</strong></td>
            <td>${clube.jogos}</td>
            <td>${clube.vitorias}</td>
            <td>${clube.empates}</td>
            <td>${clube.derrotas}</td>
            <td>${clube.golsPro}</td>
            <td>${clube.saldoGols}</td>
            <td><span class="status-tag ${clube.posicao <= 6 ? 'blue' : clube.posicao >= 17 ? 'red' : ''}">${clube.posicao <= 6 ? 'LIB' : clube.posicao >= 17 ? 'Z4' : '-'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- BUSCA E ESTATÍSTICAS (Baseado no seu dados.js) ---
function initSearchAndStats() {
    const input = document.getElementById('teamSearch');
    const panel = document.getElementById('teamStatsPanel');
    const general = document.getElementById('generalStats');

    // Função de Busca
    input.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase().trim();
        const time = window.CAMPEONATO_DATA.classificacao.find(t => t.clube.toLowerCase().includes(termo));

        if (time && termo !== "") {
            panel.style.display = 'block';
            general.style.display = 'none';
            
            document.getElementById('teamInfoHeader').innerHTML = `<h3>${time.clube}</h3>`;
            document.getElementById('totalCorners').textContent = "---"; // Dado não existe no seu JS
            document.getElementById('yellowCards').textContent = time.cartoesAmarelos;
            document.getElementById('redCards').textContent = time.cartoesVermelhos;
            document.getElementById('possession').textContent = time.aproveitamento + "%";
            document.getElementById('foulsCommitted').textContent = "---";
        } else {
            panel.style.display = 'none';
            general.style.display = 'block';
        }
    });

    // Filtros de Estatísticas Rápidas
    updateStatsList('gols'); // Inicial
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateStatsList(btn.dataset.stat);
        };
    });
}

function updateStatsList(tipo) {
    const list = document.getElementById('statsList');
    if (!list) return;
    list.innerHTML = '';

    // Ordenar com base no que você tem no dados.js
    let campo = tipo === 'gols' ? 'golsPro' : tipo === 'cartoes' ? 'cartoesAmarelos' : 'vitorias';
    const top10 = [...window.CAMPEONATO_DATA.classificacao].sort((a, b) => b[campo] - a[campo]).slice(0, 10);

    top10.forEach((item, idx) => {
        list.innerHTML += `
            <div class="stats-item">
                <span>${idx + 1}. ${item.clube}</span>
                <strong>${item[campo]}</strong>
            </div>`;
    });
}

// --- JOGOS AO VIVO (SUPABASE) ---
async function loadLiveGames() {
    const container = document.getElementById('liveGames');
    try {
        const { data, error } = await _supabase.from('partidas_ao_vivo').select('*');
        if (error) throw error;

        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = '<p class="no-live">Nenhum jogo ao vivo agora.</p>';
            return;
        }

        data.forEach(jogo => {
            container.innerHTML += `
                <div class="live-game-card">
                    <div class="game-teams">
                        <span>${jogo.home_team}</span>
                        <span class="score">${jogo.home_score} x ${jogo.away_score}</span>
                        <span>${jogo.away_team}</span>
                    </div>
                    <div class="game-status">${jogo.status}</div>
                </div>`;
        });
        document.getElementById('activeGames').textContent = data.length;
    } catch (e) {
        console.error("Erro ao carregar Live:", e);
    }
}

// --- ARTILHARIA ---
function loadArtilharia() {
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
    const el = document.getElementById('lastUpdate');
    if (el) el.textContent = "Última atualização: " + new Date().toLocaleTimeString();
}
