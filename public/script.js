// CONFIGURAÇÕES DO SUPABASE
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A"; // Substitua pela sua chave anon pública
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * BUSCA E RENDERIZA OS JOGOS AO VIVO (CARDS SUPERIORES COM LOGOS)
 */
async function carregarAoVivo() {
    const container = document.getElementById('lista-ao-vivo');

    try {
        const { data, error } = await _supabase
            .from('jogos_ao_vivo')
            .select('*');

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p style="color:#8b949e; padding: 20px; width: 100%; text-align: center;">Aguardando próximos jogos...</p>';
            return;
        }

        // Renderização dos cards com Logos e Placar centralizado
        container.innerHTML = data.map(jogo => `
            <div class="card-jogo">
                <span class="campeonato-nome">${jogo.campeonato || 'Futebol'}</span>
                
                <div class="confronto">
                    <div class="time-box">
                        <img src="${jogo.logo_casa}" class="logo-ao-vivo" onerror="this.src='https://via.placeholder.com/35?text=?'">
                        <span class="nome-time-ao-vivo">${jogo.time_casa}</span>
                    </div>

                    <div class="placar-ao-vivo">${jogo.placar}</div>

                    <div class="time-box">
                        <img src="${jogo.logo_fora}" class="logo-ao-vivo" onerror="this.src='https://via.placeholder.com/35?text=?'">
                        <span class="nome-time-ao-vivo">${jogo.time_fora}</span>
                    </div>
                </div>

                <div class="status-tempo">${jogo.status}</div>
            </div>
        `).join('');

    } catch (err) {
        console.error("Erro ao carregar ao vivo:", err);
    }
}

/**
 * BUSCA E RENDERIZA A TABELA DE CLASSIFICAÇÃO
 */
async function carregarTabela(ligaId) {
    const container = document.getElementById('tabela-corpo');
    container.innerHTML = '<tr><td colspan="5" style="padding:40px;">Carregando dados...</td></tr>';

    try {
        const { data, error } = await _supabase
            .from('tabelas_ligas')
            .select('*')
            .eq('liga', ligaId)
            .order('posicao', { ascending: true });

        if (error) throw error;

        if (data) {
            container.innerHTML = data.map(item => `
                <tr>
                    <td class="pos">${item.posicao}º</td>
                    <td>
                        <div class="td-time">
                            <img src="${item.escudo}" class="escudo" onerror="this.src='https://via.placeholder.com/24?text=?'">
                            <span>${item.time}</span>
                        </div>
                    </td>
                    <td>${item.jogos}</td>
                    <td class="${item.sg > 0 ? 'sg-positive' : (item.sg < 0 ? 'sg-negative' : '')}">
                        ${item.sg > 0 ? '+' + item.sg : item.sg}
                    </td>
                    <td class="pts">${item.pontos}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Erro ao carregar tabela:", err);
        container.innerHTML = '<tr><td colspan="5">Erro ao carregar classificação.</td></tr>';
    }
}

/**
 * INICIALIZAÇÃO E EVENTOS DE CLICK (BOTÕES PÍLULA)
 */
document.addEventListener('DOMContentLoaded', () => {
    carregarAoVivo();
    carregarTabela('BR');

    // Atualização automática a cada 60 segundos
    setInterval(carregarAoVivo, 60000);

    const botoes = document.querySelectorAll('.btn-liga');
    botoes.forEach(btn => {
        btn.addEventListener('click', () => {
            botoes.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const liga = btn.getAttribute('data-liga');
            carregarTabela(liga);
        });
    });
});
