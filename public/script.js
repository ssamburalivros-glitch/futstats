// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = 'https://vqocdowjdutfzmnvxqvz.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm';

// Inicialização do Cliente
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 FutStats: Iniciando sistema...");
    initNavigation();
    
    // 1. Carrega dados estáticos do dados.js (Tabela e Estatísticas)
    if (window.CAMPEONATO_DATA) {
        console.log("✅ Dados estáticos detectados!");
        renderStandings();
        renderStatsList('escanteios');
        renderArtilharia();
    } else {
        console.warn("⚠️ Atenção: dados.js não carregado ou variável CAMPEONATO_DATA ausente.");
    }

    // 2. Carrega Jogos ao Vivo do Supabase
    loadLiveGames();
    
    // Atualiza os jogos a cada 30 segundos
    setInterval(loadLiveGames, 30000);
});

// --- FUNÇÃO PRINCIPAL: JOGOS AO VIVO ---
async function loadLiveGames() {
    const container = document.getElementById('liveGames');
    const activeCounter = document.getElementById('activeGames');
    if (!container) return;

    console.log("📡 Buscando atualizações no Supabase...");

    try {
        const { data, error } = await _supabase
            .from('partidas_ao_vivo')
            .select('*');

        if (error) {
            console.error("❌ Erro Supabase:", error.message);
            container.innerHTML = `<p style="color:orange; text-align:center;">Erro de conexão com o Banco.</p>`;
            return;
        }

        if (!data || data.length === 0) {
            console.log("📡 Banco conectado, mas está vazio (0 registros).");
            container.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">Nenhum jogo disponível no momento.</p>';
            return;
        }

        console.log("📡 Sucesso! Jogos encontrados:", data.length);
        // Log do primeiro jogo para conferir nomes das colunas no F12
        console.log("📋 Formato do dado:", data[0]); 

        let htmlAoVivo = "";
        let htmlEncerrados = "";
        let countAoVivo = 0;

        data.forEach(jogo => {
            // MAPEAMENTO DE COLUNAS (Tenta vários nomes possíveis)
            const casa = jogo.home_team || jogo.time_casa || jogo.mandante || jogo.team_home || "Time A";
            const fora = jogo.away_team || jogo.time_fora || jogo.visitante || jogo.team_away || "Time B";
            const placarC = jogo.home_score ?? jogo.gols_casa ?? jogo.placar_mandante ?? 0;
            const placarF = jogo.away_score ?? jogo.gols_fora ?? jogo.placar_visitante ?? 0;
            const statusRaw = jogo.status || jogo.tempo || jogo.periodo || "";
            
            const statusU = statusRaw.toUpperCase();
            // Define se o jogo está rolando: tem minuto ('), é intervalo (INT) ou tempos (1T/2T)
            const isLive = statusU.includes("'") || statusU.includes("INT") || statusU.includes("1T") || statusU.includes("2T") || statusU.includes("AO VIVO");

            const cardHtml = `
                <div class="live-game-card" style="border-left: 4px solid ${isLive ? '#00ff00' : '#444'}">
                    <div class="game-teams">
                        <span class="team-
