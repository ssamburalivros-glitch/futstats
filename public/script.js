const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A"; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_PADRAO = 'https://www.espn.com.br/static/cp/img/soccer/shield-generic.png';

async function carregarAoVivo() {
    const container = document.getElementById('lista-ao-vivo');

    try {
        const { data, error } = await _supabase.from('jogos_ao_vivo').select('*');

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p style="color:#8b949e; width:100%; text-align:center;">Sem jogos ao vivo agora.</p>';
            return;
        }

        container.innerHTML = data.map(jogo => {
            // Validação de logos para evitar quebra/pisca
            const logoCasa = (jogo.logo_casa && jogo.logo_casa.startsWith('http')) ? jogo.logo_casa : ESCUDO_PADRAO;
            const logoFora = (jogo.logo_fora && jogo.logo_fora.startsWith('http')) ? jogo.logo_fora : ESCUDO_PADRAO;

            return `
                <div class="card-jogo">
                    <span class="campeonato-nome">${jogo.campeonato || 'Futebol'}</span>
                    
                    <div class="confronto">
                        <div class="time-box">
                            <img src="${logoCasa}" class="logo-ao-vivo" loading="lazy">
                            <span class="nome-time-ao-vivo">${jogo.time_casa}</span>
                        </div>

                        <div class="placar-ao-vivo">${jogo.placar}</div>

                        <div class="time-box">
                            <img src="${logoFora}" class="logo-ao-vivo" loading="lazy">
                            <span class="nome-time-ao-vivo">${jogo.time_fora}</span>
                        </div>
                    </div>

                    <div class="status-tempo">${jogo.status}</div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Erro ao carregar ao vivo:", err);
    }
}

async function carregarTabela(ligaId) {
    const container = document.getElementById('tabela-corpo');
    container.innerHTML = '<tr><td colspan="5" style="padding:40px;">Atualizando...</td></tr>';

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
                    <td>${item.posicao}º</td>
                    <td>
                        <div class="td-time">
                            <img src="${item.escudo || ESCUDO_PADRAO}" class="escudo">
                            <span>${item.time}</span>
                        </div>
                    </td>
                    <td>${item.jogos}</td>
                    <td class="${item.sg > 0 ? 'sg-positive' : (item.sg < 0 ? 'sg-negative' : '')}">
                        ${item.sg > 0 ? '+' + item.sg : item.sg}
                    </td>
                    <td style="font-weight:bold;">${item.pontos}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Erro na tabela:", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    carregarAoVivo();
    carregarTabela('BR');

    // Refresh automático de 60s
    setInterval(carregarAoVivo, 60000);

    // Eventos dos botões pílula
    const botoes = document.querySelectorAll('.btn-liga');
    botoes.forEach(btn => {
        btn.addEventListener('click', () => {
            botoes.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            carregarTabela(btn.getAttribute('data-liga'));
        });
    });
});
