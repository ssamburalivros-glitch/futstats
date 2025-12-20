// --- CONFIGURAÇÕES ---
const SUPABASE_URL = 'https://vqocdowjdutfzmnvxqvz.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm';

let _supabase = null;
try {
    if (typeof supabase !== 'undefined') {
        _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (e) { console.error("Erro Supabase:", e); }

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    if (window.CAMPEONATO_DATA) {
        renderStandings();
        renderArtilharia();
        renderStatsList('escanteios');
    }
    loadLiveGames();
    setInterval(loadLiveGames, 30000);
});

// --- FUNÇÃO DE CARREGAMENTO COM FILTRO RIGOROSO ---
async function loadLiveGames() {
    const container = document.getElementById('liveGames');
    const activeCounter = document.getElementById('activeGames');
    if (!container || !_supabase) return;

    try {
        const { data, error } = await _supabase.from('partidas_ao_vivo').select('*');
        if (error) throw error;

        if (data && data.length > 0) {
            let htmlAoVivo = '';
            let htmlEncerrados = '';
            let contadorAtivos = 0;

            data.forEach(jogo => {
                const status = (jogo.status || "").toUpperCase().trim();
                
                // LÓGICA RIGOROSA: 
                // É AO VIVO se tiver o símbolo ' ou se for INTERVALO (INT)
                const isLive = status.includes("'") || status.includes("INT") || status.includes("1T") || status.includes("2T");

                if (isLive) {
                    contadorAtivos++;
                    htmlAoVivo += `
                        <div class="live-game-card" style="border-left: 5px solid #00ff00; margin-bottom:12px; background: #1e1e1e;">
                            <div class="game-teams">
                                <span class="team-name">${jogo.home_team}</span>
                                <span class="score" style="color:#00ff00; font-size: 1.4em;">${jogo.home_score} x ${jogo.away_score}</span>
                                <span class="team-name">${jogo.away_team}</span>
                            </div>
                            <div class="game-status live-blink" style="background: rgba(255,0,0,0.2); padding: 2px 8px; border-radius: 4px;">
                                <i class="fas fa-circle" style="font-size: 8px; color: #ff4444;"></i> ${status}
                            </div>
                        </div>`;
                } else {
                    htmlEncerrados += `
                        <div class="live-game-card" style="opacity: 0.5; filter: grayscale(0.5); margin-bottom: 8px;">
                            <div class="game-teams">
                                <span>${jogo.home_team}</span>
                                <span class="score">${jogo.home_score} x ${jogo.away_score}</span>
                                <span>${jogo.away_team}</span>
                            </div>
                            <div class="game-status">ENCERRADO</div>
                        </div>`;
                }
            });

            // Montagem do HTML final
            let finalHTML = '';
            if (htmlAoVivo !== '') {
                finalHTML += '<h4 style="color:#00ff00; margin-bottom:15px; display:flex; align-items:center;"><span class="live-blink" style="width:10px; height:10px; background:#ff4444; border-radius:50%; margin-right:8px;"></span> EM ANDAMENTO</h4>' + htmlAoVivo;
            }
            if (htmlEncerrados !== '') {
                finalHTML += '<h4 style="color:#888; margin: 25px 0 15px 0;">✅ FINALIZADOS</h4>' + htmlEncerrados;
            }

            container.innerHTML = finalHTML || '<p style="text-align:center; color:#888;">Nenhum jogo para exibir.</p>';
            if (activeCounter) activeCounter.textContent = contadorAtivos;

        } else {
            container.innerHTML = '<p style="text-align:center; color:#888;">Nenhum dado encontrado no banco.</p>';
        }
    } catch (e) {
        console.error("Erro:", e);
        container.innerHTML = '<p style="color:red; text-align:center;">Falha ao carregar jogos.</p>';
    }
}

// --- OUTRAS FUNÇÕES (MANTIDAS) ---
function renderStatsList(tipo) {
    const list = document.getElementById('statsList');
    if (!list || !window.CAMPEONATO_DATA) return;
    const campo = tipo === 'escanteios' ? 'escanteios_total' : tipo === 'cartoes' ? 'total_cartoes' : 'faltas_cometidas';
    const top10 = [...window.CAMPEONATO_DATA.estatisticas].sort((a, b) => b[campo] - a[campo]).slice(0, 10);
    list.innerHTML = top10.map((item, idx) => `<div class="stats-item"><span>${idx + 1}. ${item.time}</span><strong>${item[campo]}</strong></div>`).join('');
}

function renderArtilharia() {
    const list = document.getElementById('artilhariaList');
    if (!list || !window.CAMPEONATO_DATA) return;
    list.innerHTML = window.CAMPEONATO_DATA.artilharia.slice(0, 10).map(art => `<div class="stats-item"><span>${art.jogador} (${art.clube})</span><strong>${art.gols}</strong></div>`).join('');
}

function renderStandings() {
    const tbody = document.getElementById('standingsBody');
    if (!tbody || !window.CAMPEONATO_DATA) return;
    tbody.innerHTML = window.CAMPEONATO_DATA.classificacao.map(item => `<tr><td>${item.posicao}</td><td>${item.clube}</td><td>${item.pontos}</td><td>${item.jogos}</td><td>${item.saldoGols}</td></tr>`).join('');
}

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
