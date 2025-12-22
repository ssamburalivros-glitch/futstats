// --- CONFIGURAÇÃO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A"; // <--- COLE SUA KEY AQUI
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const IMG_DEFAULT = 'https://www.espn.com.br/static/cp/img/soccer/shield-generic.png';

// --- 1. CARREGAR JOGOS AO VIVO ---
async function carregarAoVivo() {
    const container = document.getElementById('lista-ao-vivo');

    try {
        const { data, error } = await _supabase.from('jogos_ao_vivo').select('*');
        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<div style="width:100%; text-align:center; padding:30px; color:#8b949e;">Nenhum jogo ao vivo agora.</div>';
            return;
        }

        container.innerHTML = data.map(jogo => {
            // Verifica se a URL da imagem é válida, senão usa padrão
            const logoC = (jogo.logo_casa && jogo.logo_casa.startsWith('http')) ? jogo.logo_casa : IMG_DEFAULT;
            const logoF = (jogo.logo_fora && jogo.logo_fora.startsWith('http')) ? jogo.logo_fora : IMG_DEFAULT;

            return `
                <div class="card-jogo">
                    <span class="campeonato-nome">${jogo.campeonato || 'Futebol'}</span>
                    
                    <div class="confronto">
                        <div class="time-box">
                            <img src="${logoC}" class="logo-ao-vivo" loading="lazy">
                            <span class="nome-time-ao-vivo">${jogo.time_casa}</span>
                        </div>

                        <div class="placar-ao-vivo">${jogo.placar}</div>

                        <div class="time-box">
                            <img src="${logoF}" class="logo-ao-vivo" loading="lazy">
                            <span class="nome-time-ao-vivo">${jogo.time_fora}</span>
                        </div>
                    </div>

                    <div class="status-tempo">${jogo.status}</div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Erro live:", err);
    }
}

// --- 2. CARREGAR TABELA ---
async function carregarTabela(ligaId) {
    const tbody = document.getElementById('tabela-corpo');
    tbody.innerHTML = '<tr><td colspan="5" style="padding:40px; color:#8b949e;">Atualizando classificação...</td></tr>';

    try {
        const { data, error } = await _supabase
            .from('tabelas_ligas')
            .select('*')
            .eq('liga', ligaId)
            .order('posicao', { ascending: true });

        if (error) throw error;

        if (data) {
            tbody.innerHTML = data.map(row => `
                <tr>
                    <td class="col-pos">${row.posicao}</td>
                    <td>
                        <div class="td-time">
                            <img src="${row.escudo || IMG_DEFAULT}" class="escudo" loading="lazy">
                            <span>${row.time}</span>
                        </div>
                    </td>
                    <td>${row.jogos}</td>
                    <td class="${row.sg >= 0 ? 'sg-positive' : 'sg-negative'}">
                        ${row.sg > 0 ? '+' + row.sg : row.sg}
                    </td>
                    <td style="font-weight:700; color:#fff;">${row.pontos}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Erro tabela:", err);
        tbody.innerHTML = '<tr><td colspan="5">Erro ao buscar dados.</td></tr>';
    }
}

// --- 3. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // Carrega dados iniciais
    carregarAoVivo();
    carregarTabela('BR'); // Inicia com Brasileirão

    // Atualiza Live a cada 60s
    setInterval(carregarAoVivo, 60000);

    // Configura botões
    const botoes = document.querySelectorAll('.btn-liga');
    botoes.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active de todos
            botoes.forEach(b => b.classList.remove('active'));
            // Adiciona no clicado
            btn.classList.add('active');
            
            // Carrega nova tabela
            const liga = btn.getAttribute('data-liga');
            carregarTabela(liga);
        });
    });
});
