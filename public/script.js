// --- CONFIGURAÇÃO ---
const SUPABASE_URL = 'https://vqocdowjdutfzmnvxqvz.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm';

// Inicialização segura
let _supabase = null;
try {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("🚀 Supabase: Cliente iniciado.");
} catch (e) {
    console.error("🚀 Supabase: Erro na inicialização:", e);
}

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    
    // Sincroniza dados do dados.js
    if (window.CAMPEONATO_DATA) {
        console.log("✅ Dados estáticos detectados.");
        renderStandings();
        renderStatsList('escanteios');
        renderArtilharia();
    }

    // Chama a função de jogos ao vivo
    loadLiveGames();
    setInterval(loadLiveGames, 30000); // Atualiza a cada 30 seg
});

async function loadLiveGames() {
    const container = document.getElementById('liveGames');
    if (!container) return;

    console.log("📡 Tentando buscar jogos do banco...");

    try {
        const { data, error } = await _supabase
            .from('partidas_ao_vivo')
            .select('*');

        if (error) {
            console.error("📡 Erro na consulta:", error.message);
            container.innerHTML = `<p style="color:orange; text-align:center;">Erro de permissão no banco (RLS).</p>`;
            return;
        }

        console.log("📡 Dados recebidos:", data);

        if (!data || data.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">Nenhum jogo cadastrado no banco de dados no momento.</p>';
            return;
        }

        let htmlFinal = "";
        let htmlAoVivo = "";
        let htmlEncerrados = "";

        data.forEach(jogo => {
            const status = (jogo.status || "").toUpperCase();
            // Lógica: Se tem minuto (') ou Intervalo ou é tempo real
            const isLive = status.includes("'") || status.includes("INT") || status.includes("1T") || status.includes("2T");

            const card = `
                <div class="live-game-card" style="border-left: 4px solid ${isLive ? '#00ff00' : '#444'}">
                    <div class="game-teams">
                        <span>${jogo.home_team}</span>
                        <span class="score" style="color: ${isLive ? '#00ff00' : '#fff'}">
                            ${jogo.home_score} x ${jogo.away_score}
                        </span>
                        <span>${jogo.away_team}</span>
                    </div>
                    <div class="game-status ${isLive ? 'live-blink' : ''}">
                        ${isLive ? '● ' + status : 'FIM'}
                    </div>
                </div>`;

            if (isLive) htmlAoVivo += card;
            else htmlEncerrados += card;
        });

        htmlFinal = (htmlAoVivo ? '<h4 style="color:#00ff00; margin:15px 0;">🔥 AO VIVO</h4>' + htmlAoVivo : '') +
                    (htmlEncerrados ? '<h4 style="color:#888; margin:25px 0 15px 0;">✅ ENCERRADOS</h4>' + htmlEncerrados : '');

        container.innerHTML = htmlFinal;

    } catch (e) {
        console.error("📡 Erro crítico no JS:", e);
        container.innerHTML = '<p style="color:red; text-align:center;">Erro ao carregar dados.</p>';
    }
}

// --- OUTRAS FUNÇÕES ---
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

function renderStandings() {
    const tbody = document.getElementById('standingsBody');
    if (!tbody || !window.CAMPEONATO_DATA) return;
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
    const dados = [...window.CAMPEONATO_DATA.estatisticas].sort((a, b) => b[campo] - a[campo]).slice(0, 10);
    list.innerHTML = dados.map((item, idx) => `<div><span>${idx+1}. ${item.time}</span><strong>${item[campo]}</strong></div>`).join('');
}

function renderArtilharia() {
    const list = document.getElementById('artilhariaList');
    if (!list) return;
    list.innerHTML = window.CAMPEONATO_DATA.artilharia.map(art => `<div><span>${art.jogador} (${art.clube})</span><strong>${art.gols}</strong></div>`).join('');
}
