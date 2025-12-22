const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A"; // Use a sua key
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function carregarAoVivo() {
    const container = document.getElementById('lista-ao-vivo');
    const { data, error } = await _supabase.from('jogos_ao_vivo').select('*');

    if (error || !data || data.length === 0) {
        container.innerHTML = '<p style="color:var(--text-secondary)">Aguardando próximos jogos...</p>';
        return;
    }

    container.innerHTML = data.map(jogo => `
        <div class="card-jogo">
            <span class="campeonato-tag">${jogo.campeonato || 'Futebol'}</span>
            <span class="status-badge">${jogo.status}</span>
            <div class="times-container">
                <div class="time-row">${jogo.time_casa}</div>
                <div class="placar-central">${jogo.placar}</div>
                <div class="time-row">${jogo.time_fora}</div>
            </div>
        </div>
    `).join('');
}
async function carregarTabela(ligaId) {
    const container = document.getElementById('tabela-corpo');
    container.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';

    const { data, error } = await _supabase
        .from('tabelas_ligas')
        .select('*')
        .eq('liga', ligaId)
        .order('posicao', { ascending: true });

    if (data) {
        container.innerHTML = data.map(item => `
            <tr>
                <td>${item.posicao}º</td>
                <td>
                    <div class="td-time">
                        <img src="${item.escudo}" class="escudo">
                        <span>${item.time}</span>
                    </div>
                </td>
                <td>${item.jogos}</td>
                <td class="${item.sg > 0 ? 'sg-positive' : 'sg-negative'}">${item.sg}</td>
                <td class="pts">${item.pontos}</td>
            </tr>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    carregarAoVivo(); // Carrega os placares
    carregarTabela('BR'); // Carrega a tabela inicial
    
    // Intervalo para atualizar placares a cada 1 minuto sem recarregar a página
    setInterval(carregarAoVivo, 60000);

    document.querySelectorAll('.btn-liga').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-liga').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            carregarTabela(e.target.dataset.liga);
        });
    });
});
