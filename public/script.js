// 1. Configurações
const API_KEY = '8238d6b41d6cd9deb1a027865989c3e4';
const BASE_URL = 'https://v3.football.api-sports.io';

console.log("✅ 1. Script carregado e chave configurada.");

// 2. Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ 2. O HTML terminou de carregar. Iniciando buscas...");
    
    // Teste imediato de conexão
    verificarStatusAPI();
    
    // Iniciar carregamento da liga padrão
    loadLeagueData(71); 
});

async function verificarStatusAPI() {
    try {
        const res = await fetch(`${BASE_URL}/status`, {
            headers: { "x-apisports-key": API_KEY }
        });
        const data = await res.json();
        console.log("✅ 3. Status da sua conta na API:", data);
    } catch (e) {
        console.error("❌ Erro ao testar API:", e);
    }
}

async function loadLeagueData(id) {
    console.log(`✅ 4. Tentando carregar dados da liga ${id}...`);
    const container = document.getElementById('standingsBody');
    
    if (!container) {
        console.error("❌ ERRO: Não encontrei o elemento 'standingsBody' no HTML!");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/standings?league=${id}&season=2024`, {
            headers: { "x-apisports-key": API_KEY }
        });
        const json = await response.json();
        
        console.log("✅ 5. Resposta da API recebida:", json);

        if (json.response && json.response.length > 0) {
            const list = json.response[0].league.standings[0];
            container.innerHTML = list.map(t => `
                <tr>
                    <td>${t.rank}</td>
                    <td>${t.team.name}</td>
                    <td>${t.points}</td>
                    <td>${t.all.played}</td>
                    <td>${t.goalsDiff}</td>
                </tr>`).join('');
            console.log("✅ 6. Tabela desenhada na tela!");
        } else {
            container.innerHTML = '<tr><td colspan="5">Nenhum dado encontrado para 2024.</td></tr>';
        }
    } catch (e) {
        console.error("❌ Erro na função loadLeagueData:", e);
    }
}
