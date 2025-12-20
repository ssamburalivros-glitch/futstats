// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = 'https://vqocdowjdutfzmnvxqvz.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm';

// Inicialização do Cliente
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 FutStats: Sistema Iniciado.");
    
    // Inicializa a navegação de abas
    initNavigation();
    
    // Tenta carregar a classificação (dados.js)
    try {
        if (window.CAMPEONATO_DATA) {
            console.log("✅ dados.js carregado com sucesso.");
            renderStandings();
            renderStatsList('escanteios');
            renderArtilharia();
        } else {
            console.error("❌ Erro: Variável CAMPEONATO_DATA não encontrada. Verifique se o arquivo dados.js existe e está correto.");
        }
    } catch (err) {
        console.error("❌ Erro ao processar dados.js:", err);
    }

    // Carrega Jogos ao Vivo (Supabase)
    loadLiveGames();
    setInterval(loadLiveGames, 30000);
});

// --- FUNÇÃO JOGOS AO VIVO ---
async function loadLiveGames() {
    const container = document.getElementById('liveGames');
    if (!container) return;

    try {
        const { data, error } = await _supabase.from('partidas_ao_vivo').select('*');

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">Nenhum jogo no banco de dados.</p>';
            return;
        }

        let htmlAoVivo = "";
        let htmlEncerrados = "";

        data.forEach(jogo => {
            // Auto-detecção de colunas
            const casa = jogo.home_team || jogo.time_casa || jogo.mandante || "Time A";
            const fora = jogo.away_team || jogo.time_fora || jogo.visitante || "Time B";
            const placarC = jogo.home_score ?? jogo.gols_casa ?? 0;
            const placarF = jogo.away_score ?? jogo.gols_fora ?? 0;
            const statusRaw = jogo.status || jogo.tempo || "";
            
            const statusU = statusRaw.toUpperCase();
            const isLive = statusU.includes("'") || statusU.includes("INT") || statusU.includes("1T") || statusU.includes("2T");

            const card = `
                <div class="live-game-card" style="border-left: 4px solid ${isLive ? '#00ff00' : '#444'}">
                    <div class="game-teams">
                        <span class="team-name">${casa}</span>
                        <span class="score" style="color: ${isLive ? '#00ff00' : '#fff'}">${placarC} x ${placarF}</span>
                        <span class="team-name">${fora}</span>
                    </div>
                    <div class="game-status ${isLive ? 'live-blink' : ''}">${isLive ? '● ' + statusRaw : 'FINALIZADO'}</div>
                </div>`;

            if (isLive) htmlAoVivo += card;
            else htmlEncerrados += card;
        });

        container.innerHTML = (htmlAoVivo ? '<h4>🔥 AO VIVO</h4>' + htmlAoVivo : '') + 
                             (htmlEncerrados ? '<h4 style="margin-top:20px;">✅ ENCERRADOS</h4>' + htmlEncerrados : '');

    } catch (err) {
        console.error("❌ Erro no Supabase:", err);
        container.innerHTML = '<p style="color:red; text-align:center;">Erro ao carregar jogos ao vivo.</p>';
    }
}

// --- FUNÇÕES DE RENDERIZAÇÃO ---
function renderStandings() {
    const tbody = document.getElementById('standingsBody');
    if (!tbody) return;
    tbody.innerHTML = window.CAMPEONATO_DATA.classificacao.map(item => `
        <tr>
            <td>${item.posicao}º</td>
            <td><strong>${item.clube}</strong></td>
            <td>${item.pontos}</td>
            <td>${item.jogos}</td>
            <td>${item.saldoGols}</td>
        </tr>`).join('');
}

function renderStatsList(tipo) {
    const list = document.getElementById('statsList');
    if (!list) return;
    const campo = tipo === 'escanteios' ? 'escanteios_total' : 'total_cartoes';
    const top = [...window.CAMPEONATO_DATA.estatisticas].sort((a,b) => b[campo] - a[campo]).slice(0,10);
    list.innerHTML = top.map((item, i) => `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #333;">
            <span>${i+1}. ${item.time}</span><strong>${item[campo]}</strong>
        </div>`).join('');
}

function renderArtilharia() {
    const list = document.getElementById('artilhariaList');
    if (!list) return;
    list.innerHTML = window.CAMPEONATO_DATA.artilharia.slice(0,10).map(art => `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #333;">
            <span>${art.jogador} (${art.clube})</span><strong>${art.gols}</strong>
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
