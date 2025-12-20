// script.js - Corrigido para não travar
const SUPABASE_URL = 'SUA_URL_AQUI'; // Coloque sua URL ou deixe vazio para testar
const SUPABASE_KEY = 'SUA_CHAVE_AQUI'; // Coloque sua CHAVE ou deixe vazio para testar

// Inicializa o Supabase apenas se as chaves existirem
let _supabase = null;
if (SUPABASE_URL !== 'SUA_URL_AQUI' && SUPABASE_URL !== '') {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("Iniciando FutStats...");
    
    // 1. Inicializa Navegação primeiro (essencial para as abas funcionarem)
    initNavigation();
    
    // 2. Carrega dados estáticos do dados.js
    if (window.CAMPEONATO_DATA) {
        loadStandings();
        loadEstatisticas();
        loadArtilharia();
    } else {
        console.error("Erro: arquivo dados.js não foi carregado ou está vazio.");
    }

    // 3. Tenta carregar os jogos ao vivo (Supabase)
    if (_supabase) {
        loadLiveGamesFromSupabase();
        setInterval(loadLiveGamesFromSupabase, 60000);
    } else {
        document.getElementById('liveGames').innerHTML = '<p style="padding:20px; text-align:center;">Configure as chaves do Supabase no script.js para ver jogos ao vivo.</p>';
    }
    
    updateTime();
    setInterval(updateTime, 60000); 
    setupModal();
});

// --- FUNÇÃO DE NAVEGAÇÃO (CORRIGIDA) ---
function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const targetContent = document.getElementById(target);
            if (targetContent) targetContent.classList.add('active');
        });
    });

    const refreshBtn = document.getElementById('refreshLive');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (_supabase) loadLiveGamesFromSupabase();
            updateTime();
        });
    }
}

// --- JOGOS AO VIVO (SUPABASE) ---
async function loadLiveGamesFromSupabase() {
    const container = document.getElementById('liveGames');
    if (!container || !_supabase) return;

    try {
        const { data, error } = await _supabase.from('partidas_ao_vivo').select('*');
        if (error) throw error;

        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="no-games"><p>Nenhum jogo ao vivo agora.</p></div>';
            return;
        }

        data.forEach(jogo => {
            const div = document.createElement('div');
            div.className = 'live-game-card';
            div.innerHTML = `
                <div class="game-teams">
                    <div class="team"><div class="team-name">${jogo.home_team}</div></div>
                    <div class="game-score"><span>${jogo.home_score}</span> x <span>${jogo.away_score}</span></div>
                    <div class="team"><div class="team-name">${jogo.away_team}</div></div>
                </div>
                <div class="game-info"><span class="live-badge">${jogo.status}</span></div>
            `;
            container.appendChild(div);
        });
        
        document.getElementById('activeGames').textContent = data.length;
    } catch (err) {
        console.error("Erro ao buscar jogos:", err);
    }
}

// --- CLASSIFICAÇÃO ---
function loadStandings() {
    const tbody = document.getElementById('standingsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const dados = window.CAMPEONATO_DATA.classificacao;
    
    dados.forEach(clube => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${clube.posicao}</td>
            <td><strong>${clube.clube}</strong></td>
            <td>${clube.pontos}</td>
            <td>${clube.jogos}</td>
            <td>${clube.vitorias}</td>
            <td>${clube.empates}</td>
            <td>${clube.derrotas}</td>
            <td>${clube.golsPro}</td>
            <td>${clube.golsContra}</td>
            <td>${clube.saldoGols}</td>
            <td><span class="status ${getStatus(clube.posicao).class}">${getStatus(clube.posicao).text}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function getStatus(p) {
    if (p <= 4) return { class: 'libertadores', text: 'LIB' };
    if (p >= 17) return { class: 'rebaixamento', text: 'REB' };
    return { class: '', text: '-' };
}

// Outras funções (Estatísticas, Artilharia, Time) seguem o mesmo padrão...
// (Mantenha as funções loadEstatisticas, loadArtilharia e updateTime que passei anteriormente)
