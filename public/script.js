// --- CONFIGURAÇÕES DO SUPABASE ---
const SUPABASE_URL = 'https://vqocdowjdutfzmnvxqvz.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm'; // Chave Anon/Public
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Mapeamento das chaves das ligas (Devem ser iguais às do script Python)
const LEAGUES_CONFIG = {
    "BR": { name: "Brasileirão Série A", season: "2025" },
    "PL": { name: "Premier League", season: "24/25" },
    "ES": { name: "La Liga", season: "24/25" },
    "DE": { name: "Bundesliga", season: "24/25" },
    "IT": { name: "Serie A (Itália)", season: "24/25" },
    "PT": { name: "Liga Portugal", season: "24/25" }
};

let currentLeague = "BR";

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadLiveGames();      // Carrega jogos ao vivo do Supabase (seu Crawler antigo)
    loadLeagueTable("BR"); // Carrega a tabela do Brasileirão ao abrir
    
    // Atualiza jogos ao vivo a cada 60 segundos
    setInterval(loadLiveGames, 60000);
});

// --- FUNÇÃO PARA CARREGAR TABELAS (DO SUPABASE) ---
async function loadLeagueTable(ligaKey) {
    const tbody = document.getElementById('standingsBody');
    const title = document.getElementById('leagueTitle');
    
    // Feedback visual de carregamento
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Buscando dados no banco...</td></tr>';
    title.textContent = `${LEAGUES_CONFIG[ligaKey].name} - ${LEAGUES_CONFIG[ligaKey].season}`;

    try {
        // Busca os dados na tabela que o seu robô Python preenche
        const { data, error } = await _supabase
            .from('tabelas_ligas')
            .select('*')
            .eq('liga', ligaKey)
            .order('posicao', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">Nenhum dado encontrado. Execute o robô Python.</td></tr>';
            return;
        }

        // Renderiza as linhas da tabela
        tbody.innerHTML = data.map(time => `
            <tr>
                <td>${time.posicao}º</td>
                <td class="t-name-cell">
                    <strong>${time.time}</strong>
                </td>
                <td><span class="pts-badge">${time.pontos}</span></td>
                <td>${time.jogos}</td>
                <td>${time.sg}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error("Erro ao carregar tabela:", err);
        tbody.innerHTML = '<tr><td colspan="5">Erro de conexão com o banco de dados.</td></tr>';
    }
}

// --- FUNÇÃO PARA JOGOS AO VIVO (SEU CRAWLER ANTERIOR) ---
async function loadLiveGames() {
    const container = document.getElementById('liveGames');
    
    try {
        const { data, error } = await _supabase
            .from('partidas_ao_vivo')
            .select('*');

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="no-games">Nenhum jogo ao vivo agora.</p>';
            return;
        }

        container.innerHTML = data.map(jogo => {
            const isLive = (jogo.status || "").includes("'");
            return `
                <div class="live-card ${isLive ? 'live-border' : ''}">
                    <div class="match
