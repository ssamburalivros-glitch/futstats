const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function carregarAoVivo() {
    const { data } = await _supabase.from('jogos_ao_vivo').select('*');
    const container = document.getElementById('lista-ao-vivo');
    
    if (data) {
        container.innerHTML = data.map(j => `
            <div class="card-hero">
                <div class="hero-teams">
                    <div class="hero-team-box">
                        <img src="${j.logo_casa}" class="hero-logo">
                        <span class="hero-name">${j.time_casa}</span>
                    </div>
                    <div class="hero-score">${j.placar}</div>
                    <div class="hero-team-box">
                        <img src="${j.logo_fora}" class="hero-logo">
                        <span class="hero-name">${j.time_fora}</span>
                    </div>
                </div>
                <div class="hero-status">${j.status}</div>
            </div>
        `).join('');
    }
}

async function carregarTabela(liga) {
    const { data } = await _supabase.from('tabelas_ligas').select('*').eq('liga', liga).order('posicao');
    const corpo = document.getElementById('tabela-corpo');
    
    if (data) {
        corpo.innerHTML = data.map(t => `
            <tr>
                <td class="txt-center" style="color:#666">${t.posicao}</td>
                <td>
                    <div class="team-row">
                        <img src="${t.escudo}" class="escudo-tab">
                        <span>${t.time}</span>
                    </div>
                </td>
                <td class="txt-center">${t.jogos}</td>
                <td class="txt-center ${t.sg > 0 ? 'sg-pos' : ''}">${t.sg}</td>
                <td class="txt-center" style="font-size:1.1rem; font-weight:800">${t.pontos}</td>
            </tr>
        `).join('');
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarAoVivo();
    carregarTabela('BR');
    
    document.querySelectorAll('.pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.pill.active').classList.remove('active');
            btn.classList.add('active');
            carregarTabela(btn.dataset.liga);
        });
    });
});
