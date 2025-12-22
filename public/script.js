// 1. CONFIGURAÇÕES DO SUPABASE
// Use a URL do seu projeto e a ANON KEY (Chave Pública)
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. FUNÇÃO PRINCIPAL PARA CARREGAR OS DADOS
async function carregarTabela(ligaId) {
    const container = document.getElementById('tabela-corpo');
    
    // Mostra um aviso de carregando enquanto busca os dados
    container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Buscando dados no servidor...</td></tr>';

    try {
        // Busca os dados na tabela 'tabelas_ligas' filtrando pela sigla da liga (BR, PL, etc)
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
                
                // Formatação do Saldo de Gols (Verde se positivo, Vermelho se negativo)
                const sgColor = item.sg > 0 ? '#00ff88' : (item.sg < 0 ? '#ff4444' : '#fff');
                const sgDisplay = item.sg > 0 ? `+${item.sg}` : item.sg;

                // Montagem da linha da tabela
                row.innerHTML = `
                    <td class="pos">${item.posicao}º</td>
                    <td class="td-time">
                        <img src="${item.escudo}" class="escudo" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${item.time}'">
                        <span class="time-nome">${item.time}</span>
                    </td>
                    <td>${item.jogos}</td>
                    <td style="color: ${sgColor}; font-weight: bold;">${sgDisplay}</td>
                    <td class="pts">${item.pontos}</td>
                `;
                container.appendChild(row);
            });
        } else {
            container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhum dado encontrado para esta liga. Rode o robô no GitHub!</td></tr>';
        }

    } catch (err) {
        console.error("Erro Supabase:", err.message);
        container.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding: 20px;">Erro: ${err.message}</td></tr>`;
    }
}

// 3. INICIALIZAÇÃO E EVENTOS
document.addEventListener('DOMContentLoaded', () => {
    // Carrega o Brasileirão por padrão ao abrir o site
    carregarTabela('BR');

    // Configura os botões de troca de liga
    const botoes = document.querySelectorAll('.btn-liga');
    botoes.forEach(botao => {
        botao.addEventListener('click', (e) => {
            // Remove a classe 'active' de todos e coloca no clicado
            botoes.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Pega o ID da liga (data-liga="PL") e chama a função
            const ligaSelecionada = e.target.getAttribute('data-liga');
            carregarTabela(ligaSelecionada);
        });
    });
});
