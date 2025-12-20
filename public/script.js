// Configurações do Supabase
const SUPABASE_URL = 'https://vqocdowjdutfzmnvxqvz.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm';

let _supabase = null;

// Inicialização segura
try {
    if (typeof supabase !== 'undefined') {
        _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("✅ Supabase conectado.");
    } else {
        console.error("❌ Biblioteca Supabase não encontrada!");
    }
} catch (e) {
    console.error("Erro ao iniciar Supabase:", e);
}

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    
    // Carrega dados do arquivo dados.js se ele existir
    if (window.CAMPEONATO_DATA) {
        renderStandings();
        renderStatsList('escanteios');
    }

    // Primeira carga e loop de atualização
    loadLiveGames();
    setInterval(loadLiveGames, 30000); // Atualiza a cada 30 segundos
});

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
            
            // Lógica de Separação: Se não contém "FIM" ou "ENCERRADO", é AO VIVO
            const aoVivo = data.filter(j => {
                const s = (j.status || "").toUpperCase().trim();
                return s !== "" && !s.includes('FIM') && !s.includes('ENCERRADO');
            });

            const encerrados = data.filter(j => {
                const s = (j.status || "").toUpperCase().trim();
                return s.includes('FIM') || s.includes('ENCERRADO');
            });

            // Contagem de gols
            data.forEach(j => {
                totalGolsHoje += (parseInt(j.home_score) || 0) + (parseInt(j.away_score) || 0);
            });

            let htmlContent = '';

            // Seção Ao Vivo
            if (aoVivo.length > 0) {
                htmlContent += '<h4 style="color:#ffcc00; margin:10px 0; border-left:4px solid #ffcc00; padding-left:10px;">🔥 EM ANDAMENTO</h4>';
                aoVivo.forEach(jogo => {
                    htmlContent += `
                        <div class="live-game-card" style="border-left: 4px solid #00ff00; margin-bottom:10px;">
                            <div class="game-teams">
                                <span>${jogo.home_team}</span>
                                <span class="score" style="color:#00ff00; font-weight:bold;">${jogo.home_score} x ${jogo.away_score}</span>
                                <span>${jogo.away_team}</span>
                            </div>
                            <div class="game-status live-blink" style="color:#ff4444;">${jogo.status}</div>
                        </div>`;
                });
            }

            // Seção Encerrados
            if (encerrados.length > 0) {
                htmlContent += '<h4 style="color:#888; margin:25px 0 10px 0; border-left:4px solid #555; padding-left:10px;">✅ ENCERRADOS HOJE</h4>';
                encerrados.forEach(jogo => {
                    htmlContent += `
                        <div class="live-game-card" style="opacity:0.6; background:#1a1a1a; margin-bottom:10px;">
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
            container.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Nenhum jogo no radar.</p>';
        }
    } catch (e) {
        console.error("Erro Supabase:", e);
        container.innerHTML = '<p style="color:red; text-align:center;">Erro ao conectar com o banco de dados.</p>';
    }
}

// Navegação das Abas
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

// Renderização de dados estáticos (Classificação)
function renderStandings() {
    const tbody = document.getElementById('standingsBody');
    if (!tbody || !window.CAMPEONATO_DATA) return;
    tbody.innerHTML = window.CAMPEONATO_DATA.classificacao.map(item => `
        <tr>
            <td>${item.posicao}</td>
            <td>${item.clube}</td>
            <td>${item.pontos}</td>
            <td>${item.jogos}</td>
            <td>${item.saldoGols}</td>
        </tr>
    `).join('');
}
