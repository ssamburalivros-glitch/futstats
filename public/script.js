// 1. CONFIGURAÇÕES DOS CLIENTES
const SUPABASE_URL = 'https://vqocdowjdutfzmnvxqvz.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Chave da API-Sports (para outras ligas se necessário, ou deixe vazio se focar no Supabase)
const API_KEY = '8238d6b41d6cd9deb1a027865989c3e4'; 

// 2. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadLiveGames();      // Carrega jogos ao vivo do Supabase
    loadLeagueData(71);   // Carrega Brasileirão por padrão
});

// 3. NAVEGAÇÃO ENTRE ABAS
function initNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.onclick = () => {
            // Remove ativo de todos
            document.querySelectorAll('.nav-tab, .tab-content').forEach(el => el.classList.remove('active'));
            // Adiciona ativo no clicado
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.getElementById(target).classList.add('active');
        };
    });
}

// 4. CARREGAR JOGOS AO VIVO (DO SUPABASE)
async function loadLiveGames() {
    const container = document.getElementById('liveGames');
    
    const { data, error } = await _supabase
        .from('partidas_ao_vivo')
        .select('*');

    if (error || !data || data.length === 0) {
        container.innerHTML = '<p class="no-data">Nenhum jogo ao vivo encontrado no momento.</p>';
        return;
    }

    container.innerHTML = data.map(jogo => `
        <div class="live-card ${jogo.status.includes("'") ? 'live-border' : ''}">
            <div class="match">
                <span class="team">${jogo.home_team || jogo.time_casa}</span>
                <span class="score">${jogo.home_score ?? 0} - ${jogo.away_score ?? 0}</span>
                <span class="team">${jogo.away_team || jogo.time_fora}</span>
            </div>
            <div class="status">${jogo.status}</div>
        </div>
    `).join('');
}

// 5. CARREGAR TABELA (DO SUPABASE)
async function loadLeagueData(id) {
    const tbody = document.getElementById('standingsBody');
    const title = document.getElementById('leagueTitle');
    
    tbody.innerHTML = '<tr><td colspan="5">Carregando dados reais de 2025...</td></tr>';

    // Como você está fazendo scraping do Brasileirão (71) para o Supabase:
    if (id === 71) {
        title.textContent = "Brasileirão Série A 2025";
        
        const { data, error } = await _supabase
            .from('tabela_brasileirao')
            .select('*')
            .order('posicao', { ascending: true });

        if (error || !data) {
            tbody.innerHTML = '<tr><td colspan="5">Erro ao carregar tabela do banco de dados.</td></tr>';
            return;
        }

        renderTabela(data, tbody);
    } else {
        title.textContent = "Liga selecionada (Dados da API)";
        tbody.innerHTML = '<tr><td colspan="5">Configure o scraping para esta liga ou use a API histórica.</td></tr>';
    }
}

// 6. RENDERIZAR TABELA NO HTML
function renderTabela(times, container) {
    if (times.length === 0) {
        container.innerHTML = '<tr><td colspan="5">Tabela vazia. Aguardando processamento do Python...</td></tr>';
        return;
    }

    container.innerHTML = times.map(t => `
        <tr>
            <td>${t.posicao}º</td>
            <td class="t-name-cell"><strong>${t.time}</strong></td>
            <td>${t.pontos}</td>
            <td>${t.jogos}</td>
            <td>${t.sg >= 0 ? '+' + t.sg : t.sg}</td>
        </tr>
    `).join('');
}

// 7. FUNÇÃO GLOBAL PARA OS BOTÕES DE LIGA
window.mudarLiga = (id) => {
    document.querySelectorAll('.league-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(id));
    });
    loadLeagueData(id);
};
