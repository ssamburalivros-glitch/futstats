// URLs e Chaves do Supabase
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";

// Inicializa o cliente Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Função principal para buscar dados do banco e renderizar a tabela
 */
async function carregarTabela(ligaId) {
    const container = document.getElementById('tabela-corpo');
    
    // Mostra um feedback visual de carregamento
    container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px;">Buscando dados da API...</td></tr>';

    try {
        // Busca os dados filtrando pela liga selecionada
        const { data, error } = await _supabase
            .from('tabelas_ligas')
            .select('*')
            .eq('liga', ligaId)
            .order('posicao', { ascending: true });

        if (error) throw error;

        // Limpa o container para inserir os novos dados
        container.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(item => {
                const row = document.createElement('tr');
                
                // Define a classe de cor do saldo de gols
                const sgClass = item.sg > 0 ? 'sg-positive' : (item.sg < 0 ? 'sg-negative' : '');
                const sgExibicao = item.sg > 0 ? `+${item.sg}` : item.sg;

                row.innerHTML = `
                    <td class="pos">${item.posicao}º</td>
                    <td>
                        <div class="td-time">
                            <img src="${item.escudo}" class="escudo" onerror="this.src='https://via.placeholder.com/24?text=?'">
                            <span>${item.time}</span>
                        </div>
                    </td>
                    <td>${item.jogos}</td>
                    <td class="${sgClass}">${sgExibicao}</td>
                    <td class="pts">${item.pontos}</td>
                `;
                container.appendChild(row);
            });
        } else {
            container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhum dado encontrado para esta liga.</td></tr>';
        }
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
        container.innerHTML = `<tr><td colspan="5" style="color:#f85149; text-align:center; padding: 20px;">Erro: ${err.message}</td></tr>`;
    }
}

/**
 * Configuração dos eventos ao carregar a página
 */
document.addEventListener('DOMContentLoaded', () => {
    // Carrega a liga Brasileira por padrão
    carregarTabela('BR');

    // Configura os botões do menu
    const botoes = document.querySelectorAll('.btn-liga');
    
    botoes.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove classe ativa de todos e adiciona no clicado
            botoes.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Pega o ID da liga no atributo data-liga e carrega
            const ligaSelecionada = btn.getAttribute('data-liga');
            carregarTabela(ligaSelecionada);
        });
    });
});
