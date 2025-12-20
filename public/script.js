// script.js - Versão Corrigida e Blindada
const SUPABASE_URL = 'https://vqocdowjdutfzmnvxqvz.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm';

let _supabase = null;
try {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) { 
    console.error("Erro ao conectar ao Supabase:", e); 
}

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    
    // Carrega dados locais (Classificação/Estatísticas)
    if (window.CAMPEONATO_DATA) {
        renderStandings();
        renderArtilharia();
        renderStatsList('escanteios'); 
        initSearch();
        initStatsFilters();
    }

    // Carrega jogos do banco de dados
    loadLiveGames();
    // Atualiza a cada 30 segundos
    setInterval(loadLiveGames, 30000);
});

// --- JOGOS AO VIVO (CORREÇÃO DE FILTRO) ---
async function loadLiveGames() {
    const container = document.getElementById('liveGames');
    if (!container) return;

    if (!_supabase) return;

    try {
        const { data, error } = await _supabase.from('partidas_ao_vivo').select('*');
        
        if (error) throw error;

        if (data && data.length > 0) {
            // NORMALIZAÇÃO E SEPARAÇÃO
            const aoVivo = [];
            const encerrados = [];

            data.forEach(jogo => {
                const s = (jogo.status || "").toUpperCase().trim();
                // Qualquer coisa que NÃO seja FIM ou ENCERRADO entra como Ao Vivo
                if (s !== "" && !s.includes('FIM') && !s.includes('ENCERRADO')) {
                    aoVivo.push(jogo);
                } else {
                    encerrados.push(jogo);
                }
            });

            let htmlContent = '';

            // Renderiza Bloco Ao Vivo
            if (aoVivo.length > 0) {
                htmlContent += '<h4 style="color:#ffcc00; margin: 15px 0 10px 0; border-left:4px solid #ffcc00; padding-left:10px;">🔥 EM ANDAMENTO</h4>';
                aoVivo.forEach(jogo => {
                    htmlContent += `
                        <div class="live-game-card" style="border-left: 4px solid #00ff00; margin-bottom: 8px;">
                            <div class="game-teams">
                                <span>${jogo.home_team}</span>
                                <span class="score" style="color:#00ff00; font-weight:bold;">${jogo.home_score} x ${jogo.away_score}</span>
                                <span>${jogo.away_team}</span>
                            </div>
                            <div class="game-status live-blink">${jogo.status}</div>
                        </div>`;
                });
            }

            // Renderiza Bloco Encerrados
            if (encerrados.length > 0) {
                htmlContent += '<h4 style="color:#888; margin: 25px 0 10px 0; border-left:4px solid #555; padding-left:10px;">✅ ENCERRADOS HOJE</h4>';
                encerrados.forEach(jogo => {
                    htmlContent += `
                        <div class="live-game-card" style="opacity:0.6; background: #1a1a1a; margin-bottom: 8px;">
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
            
            // Atualiza o contador de jogos ativos no cabeçalho
            const counter = document.getElementById('activeGames');
            if (counter) counter.textContent = aoVivo.length;

        } else {
            container.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Nenhum jogo ao vivo ou encerrado no banco.</p>';
            if (document.getElementById('activeGames')) document.getElementById('activeGames').textContent = '0';
        }
    } catch (e) { 
        console.error("Erro ao buscar dados do Supabase:", e);
        container.innerHTML = '<p style="text-align:center;color:red;">Erro ao conectar com o servidor de jogos.</p>';
    }
}

// --- FUNÇÕES DE APOIO (MANTIDAS) ---
function renderStandings() {
    const tbody = document.getElementById('standingsBody');
    if (!tbody) return;
    tbody.innerHTML = window.CAMPEONATO_DATA.classificacao.map(item => `
        <tr>
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
        </tr>`).join('');
}

function initSearch() {
    const input = document.getElementById('teamSearch');
    if (!input) return;
    input.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase().trim();
        const stats = window.CAMPEONATO_DATA.estatisticas.find(t => t.time.toLowerCase().includes(termo));
        const panel = document.getElementById('teamStatsPanel');
        const general = document.getElementById('generalStats');

        if (stats && termo !== "") {
            panel.style.display = 'block'; general.style.display = 'none';
            document.getElementById('teamInfoHeader').innerHTML = `<h3>${stats.time}</h3>`;
            document.getElementById('totalCorners').textContent = stats.escanteios_total;
            document.getElementById('yellowCards').textContent = stats.cartao_amarelo;
            document.getElementById('redCards').textContent = stats.cartao_vermelho;
            document.getElementById('foulsCommitted').textContent = stats.faltas_cometidas;
        } else {
            panel.style.display = 'none'; general.style.display = 'block';
        }
    });
}

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
    const mapa = { 'escanteios': 'escanteios_total', 'cartoes': 'total_cartoes', 'faltas': 'faltas_cometidas' };
    const campo = mapa[tipo] || 'escanteios_total';
    const top10 = [...window.CAMPEONATO_DATA.estatisticas].sort((a, b) => b[campo] - a[campo]).slice(0, 10);
    list.innerHTML = top10.map((item, idx) => `
        <div class="stats-item">
            <span>${idx + 1}. ${item.time}</span>
            <strong>${item[campo]}</strong>
        </div>`).join('');
}

function renderArtilharia() {
    const list = document.getElementById('artilhariaList');
    if (!list) return;
    list.innerHTML = window.CAMPEONATO_DATA.artilharia.slice(0, 10).map(art => `
        <div class="stats-item">
            <span>${art.jogador} (${art.clube})</span>
            <strong>${art.gols}</strong>
        </div>`).join('');
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
