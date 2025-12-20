// --- CONFIGURAÇÕES ---
const SUPABASE_URL = 'https://vqocdowjdutfzmnvxqvz.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm';

let _supabase = null;

try {
    if (typeof supabase !== 'undefined') {
        _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("✅ Supabase conectado.");
    }
} catch (e) {
    console.error("Erro ao iniciar Supabase:", e);
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    
    // Verifica se os dados do dados.js existem antes de rodar
    if (window.CAMPEONATO_DATA) {
        renderStandings();
        renderArtilharia();
        renderStatsList('escanteios'); // Agora a função está definida abaixo
    }

    // Jogos ao Vivo
    loadLiveGames();
    setInterval(loadLiveGames, 30000);
});

// --- FUNÇÃO CORRIGIDA: JOGOS AO VIVO ---
async function loadLiveGames() {
    const container = document.getElementById('liveGames');
    const activeCounter = document.getElementById('activeGames');
    const goalsCounter = document.getElementById('totalGoals');
    
    if (!container || !_supabase) return;

    try {
        const { data, error } = await _supabase.from('partidas_ao_vivo').select('*');
        
        if (error) throw error;

        if (data && data.length > 0) {
            let totalGolsHoje = 0;
            
            // Separação lógica
            const aoVivo = data.filter(j => {
                const s = (j.status || "").toUpperCase().trim();
                return s !== "" && !s.includes('FIM') && !s.includes('ENCERRADO');
            });

            const encerrados = data.filter(j => {
                const s = (j.status || "").toUpperCase().trim();
                return s.includes('FIM') || s.includes('ENCERRADO');
            });

            data.forEach(j => {
                totalGolsHoje += (parseInt(j.home_score) || 0) + (parseInt(j.away_score) || 0);
            });

            let htmlContent = '';

            if (aoVivo.length > 0) {
                htmlContent += '<h4 style="color:#ffcc00; margin:10px 0;">🔥 AO VIVO AGORA</h4>';
                aoVivo.forEach(jogo => {
                    htmlContent += `
                        <div class="live-game-card">
                            <div class="game-teams">
                                <span>${jogo.home_team}</span>
                                <span class="score" style="color:#00ff00;">${jogo.home_score} x ${jogo.away_score}</span>
                                <span>${jogo.away_team}</span>
                            </div>
                            <div class="game-status live-blink">${jogo.status}</div>
                        </div>`;
                });
            }

            if (encerrados.length > 0) {
                htmlContent += '<h4 style="color:#888; margin-top:20px;">✅ ENCERRADOS</h4>';
                encerrados.forEach(jogo => {
                    htmlContent += `
                        <div class="live-game-card" style="opacity:0.6; background:#1a1a1a;">
                            <div class="game-teams">
                                <span>${jogo.home_team}</span>
                                <span class="score">${jogo.home_score} x ${jogo.away_score}</span>
                                <span>${jogo.away_team}</span>
                            </div>
                            <div class="game-status">FIM</div>
                        </div>`;
                });
            }

            container.innerHTML = htmlContent;
            if (activeCounter) activeCounter.textContent = aoVivo.length;
            if (goalsCounter) goalsCounter.textContent = totalGolsHoje;

        } else {
            container.innerHTML = '<p style="text-align:center;color:#888;">Nenhum jogo no banco de dados.</p>';
        }
    } catch (e) {
        console.error("Erro ao carregar jogos:", e);
        container.innerHTML = '<p style="color:red; text-align:center;">Erro de conexão.</p>';
    }
}

// --- FUNÇÃO: RENDERIZAR ESTATÍSTICAS (O QUE FALTAVA) ---
function renderStatsList(tipo) {
    const list = document.getElementById('statsList');
    if (!list || !window.CAMPEONATO_DATA) return;
    
    const mapa = {
        'escanteios': 'escanteios_total',
        'cartoes': 'total_cartoes',
        'faltas': 'faltas_cometidas'
    };

    const campo = mapa[tipo] || 'escanteios_total';
    const top10 = [...window.CAMPEONATO_DATA.estatisticas]
        .sort((a, b) => b[campo] - a[campo])
        .slice(0, 10);

    list.innerHTML = top10.map((item, idx) => `
        <div class="stats-item">
            <span>${idx + 1}. ${item.time}</span>
            <strong>${item[campo]}</strong>
        </div>
    `).join('');
}

// --- FUNÇÃO: RENDERIZAR ARTILHARIA ---
function renderArtilharia() {
    const list = document.getElementById('artilhariaList');
    if (!list || !window.CAMPEONATO_DATA) return;
    
    list.innerHTML = window.CAMPEONATO_DATA.artilharia.slice(0, 10).map(art => `
        <div class="stats-item">
            <span>${art.jogador} (${art.clube})</span>
            <strong>${art.gols}</strong>
        </div>
    `).join('');
}

// --- FUNÇÃO: RENDERIZAR CLASSIFICAÇÃO ---
function renderStandings() {
    const tbody = document.getElementById('standingsBody');
    if (!tbody || !window.CAMPEONATO_DATA) return;
    
    tbody.innerHTML = window.CAMPEONATO_DATA.classificacao.map(item => `
        <tr>
            <td>${item.posicao}</td>
            <td><strong>${item.clube}</strong></td>
            <td><strong>${item.pontos}</strong></td>
            <td>${item.jogos}</td>
            <td>${item.saldoGols}</td>
        </tr>
    `).join('');
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
