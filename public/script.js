// --- CONFIGURAÇÃO ---
const SUPABASE_URL = 'https://vqocdowjdutfzmnvxqvz.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    
    // Sincroniza os dados do dados.js
    if (window.CAMPEONATO_DATA) {
        console.log("✅ Dados estáticos carregados!");
        renderStandings();
        renderStatsList('escanteios');
        renderArtilharia();
    } else {
        console.error("❌ Erro: dados.js não foi encontrado ou está vazio.");
    }

    loadLiveGames();
    setInterval(loadLiveGames, 30000);
});

// --- FUNÇÃO: CLASSIFICAÇÃO ---
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
        </tr>
    `).join('');
}

// --- FUNÇÃO: ESTATÍSTICAS ---
function renderStatsList(tipo) {
    const list = document.getElementById('statsList');
    if (!list || !window.CAMPEONATO_DATA) return;
    
    const campo = tipo === 'escanteios' ? 'escanteios_total' : 'total_cartoes';
    const dadosOrdenados = [...window.CAMPEONATO_DATA.estatisticas]
        .sort((a, b) => b[campo] - a[campo])
        .slice(0, 10);

    list.innerHTML = dadosOrdenados.map((item, idx) => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #333;">
            <span>${idx + 1}. ${item.time}</span>
            <strong style="color:#00ff00;">${item[campo]}</strong>
        </div>
    `).join('');
}

// --- FUNÇÃO: ARTILHARIA ---
function renderArtilharia() {
    const list = document.getElementById('artilhariaList');
    if (!list || !window.CAMPEONATO_DATA) return;
    
    list.innerHTML = window.CAMPEONATO_DATA.artilharia.map(art => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #333;">
            <span>${art.jogador} (${art.clube})</span>
            <strong style="color:#ffcc00;">${art.gols} Gols</strong>
        </div>
    `).join('');
}

// --- JOGOS AO VIVO (SUPABASE) ---
async function loadLiveGames() {
    const container = document.getElementById('liveGames');
    if (!container) return;

    try {
        const { data, error } = await _supabase.from('partidas_ao_vivo').select('*');
        if (error) throw error;

        let html = '';
        if (data && data.length > 0) {
            data.forEach(j => {
                const isLive = (j.status || "").includes("'");
                html += `
                    <div class="live-game-card" style="background:#1a1a1a; padding:15px; margin-bottom:10px; border-radius:8px; border-left:4px solid ${isLive ? '#0ff' : '#444'}">
                        <div style="display:flex; justify-content:space-between;">
                            <span>${j.home_team}</span>
                            <span>${j.home_score} x ${j.away_score}</span>
                            <span>${j.away_team}</span>
                        </div>
                        <div style="text-align:center; font-size:12px; color:${isLive ? '#f00' : '#888'}">${j.status}</div>
                    </div>`;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p>Nenhum jogo agora.</p>';
        }
    } catch (e) {
        console.error(e);
    }
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
