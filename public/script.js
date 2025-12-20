const SUPABASE_URL = 'https://vqocdowjdutfzmnvxqvz.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm';

let _supabase = null;

try {
    if (typeof supabase !== 'undefined') {
        _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("✅ Supabase Iniciado com Sucesso");
    } else {
        console.error("❌ Erro: Biblioteca Supabase não carregou. Verifique o link no HTML.");
    }
} catch (e) {
    console.error("❌ Erro na conexão Supabase:", e);
}

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadLiveGames();
    setInterval(loadLiveGames, 30000);
});

async function loadLiveGames() {
    const container = document.getElementById('liveGames');
    if (!container) return;

    try {
        console.log("🔄 Procurando jogos no banco...");
        const { data, error } = await _supabase.from('partidas_ao_vivo').select('*');
        
        if (error) {
            console.error("❌ Erro na busca (RLS ou CORS?):", error.message);
            container.innerHTML = `<p style="color:orange; text-align:center;">Erro ao conectar com o banco de dados.</p>`;
            return;
        }

        console.log("📊 Jogos encontrados no banco:", data.length);

        if (!data || data.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#888;">Nenhum jogo ativo no banco de dados.</p>';
            return;
        }

        let htmlAoVivo = '';
        let htmlEncerrados = '';

        data.forEach(jogo => {
            const status = (jogo.status || "").toUpperCase().trim();
            // Lógica: Se tem minuto (') ou é intervalo (INT) ou tempo (1T/2T)
            const isLive = status.includes("'") || status.includes("INT") || status.includes("1T") || status.includes("2T");

            const cardHtml = `
                <div class="live-game-card" style="${isLive ? 'border-left: 5px solid #00ff00;' : 'opacity:0.6;'} margin-bottom:12px;">
                    <div class="game-teams">
                        <span>${jogo.home_team}</span>
                        <span class="score" style="${isLive ? 'color:#00ff00;' : ''}">${jogo.home_score} x ${jogo.away_score}</span>
                        <span>${jogo.away_team}</span>
                    </div>
                    <div class="game-status ${isLive ? 'live-blink' : ''}">${isLive ? '● ' + status : 'FIM'}</div>
                </div>`;

            if (isLive) htmlAoVivo += cardHtml;
            else htmlEncerrados += cardHtml;
        });

        container.innerHTML = (htmlAoVivo ? '<h4>🔥 AO VIVO</h4>' + htmlAoVivo : '') + 
                            (htmlEncerrados ? '<h4 style="margin-top:20px;">✅ ENCERRADOS</h4>' + htmlEncerrados : '');

    } catch (e) {
        console.error("❌ Erro Crítico:", e);
    }
}

// Funções de navegação simples
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
