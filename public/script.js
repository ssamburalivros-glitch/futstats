// 1. CONFIGURAÇÕES DO SUPABASE
// Importante: No JS (Site) usamos a ANON KEY, não a service_role!
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQwODkzOCwiZXhwIjoyMDgxOTg0OTM4fQ.qeZliDad795-HMs26rheYtKfIgtWZ7aIHQmQsVwZIic";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. FUNÇÃO PARA BUSCAR DADOS
async function carregarTabela(ligaId) {
    const container = document.getElementById('tabela-corpo');
    container.innerHTML = '<tr><td colspan="5" style="text-align:center">Carregando dados...</td></tr>';

    try {
        // Busca os dados da tabela 'tabelas_ligas' filtrando pela liga selecionada
        const { data, error } = await _supabase
            .from('tabelas_ligas')
            .select('*')
            .eq('liga', ligaId)
            .order('posicao', { ascending: true });

        if (error) throw error;

        // Limpa o loading
        container.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(time => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${time.posicao}º</td>
                    <td><strong>${time.time}</strong></td>
                    <td>${time.jogos}</td>
                    <td>${time.sg > 0 ? '+' + time.sg : time.sg}</td>
                    <td class="pts">${time.pontos}</td>
                `;
                container.appendChild(row);
            });
        } else {
            container.innerHTML = '<tr><td colspan="5" style="text-align:center">Nenhum dado encontrado para esta liga.</td></tr>';
        }

    } catch (err) {
        console.error("Erro ao carregar:", err.message);
        container.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red">Erro ao carregar dados do banco.</td></tr>';
    }
}

// 3. EVENTOS DE TROCA DE LIGA
document.addEventListener('DOMContentLoaded', () => {
    // Inicia carregando o Brasileirão (BR) por padrão
    carregarTabela('BR');

    // Escuta cliques nos botões de filtro (se você tiver botões com data-liga="PL", etc)
    const botoes = document.querySelectorAll('.btn-liga');
    botoes.forEach(botao => {
        botao.addEventListener('click', () => {
            // Remove classe active de todos e adiciona no clicado
            botoes.forEach(b => b.classList.remove('active'));
            botao.classList.add('active');
            
            const liga = botao.getAttribute('data-liga');
            carregarTabela(liga);
        });
    });
});
