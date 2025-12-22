// --- CONFIGURAÇÃO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A"; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_FALLBACK = 'https://www.espn.com.br/static/cp/img/soccer/shield-generic.png';

// --- CARREGAR JOGOS AO VIVO (CARDS GIGANTES) ---
async function carregarAoVivo() {
    const container = document.getElementById('lista-ao-vivo');
    try {
        const { data, error } = await _supabase.from('jogos_ao_vivo').select('*');
        if (error) throw error;

        if (data) {
            container.innerHTML = data.map(j => `
                <div class="card-hero">
                    <div class="hero-teams">
                        <div class="hero-team-box">
                            <img src="${j.logo_casa || ESCUDO_FALLBACK}" class="hero-logo">
                            <span class="hero-name">${j.time_casa}</span>
                        </div>
                        <div class="hero-score">${j.placar}</div>
                        <div class="hero-team-box">
                            <img src="${j.logo_fora || ESCUDO_FALLBACK}" class="hero-logo">
                            <span class="hero-name">${j.time_fora}</span>
                        </div>
                    </div>
                    <div class="hero-status">${j.status}</div>
                </div>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

// --- CARREGAR TABELA ---
async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    corpo.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:50px; opacity:0.5;">Atualizando...</td></tr>';

    try {
        const { data } = await _supabase.from('tabelas_ligas').select('*').eq('liga', liga).order('posicao');
        if (data) {
            corpo.innerHTML = data.map(t => `
                <tr>
                    <td class="txt-center" style="color:#444; width:60px;">${t.posicao}</td>
                    <td>
                        <div class="team-row">
                            <img src="${t.escudo || ESCUDO_FALLBACK}" class="escudo-tab">
                            <span>${t.time}</span>
                        </div>
                    </td>
                    <td class="txt-center">${t.jogos}</td>
                    <td class="txt-center ${t.sg > 0 ? 'sg-pos' : ''}">${t.sg}</td>
                    <td class="txt-center" style="font-size:1.2rem; font-weight:900;">${t.pontos}</td>
                </tr>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

// --- INICIALIZAÇÃO E ARRASTE COM MOUSE ---
document.addEventListener('DOMContentLoaded', () => {
    carregarAoVivo();
    carregarTabela('BR');

    // Lógica para arrastar os cards com o mouse
    const slider = document.getElementById('lista-ao-vivo');
    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
        slider.style.scrollSnapType = 'none'; // Desativa snap ao arrastar
    });

    slider.addEventListener('mouseleave', () => isDown = false);
    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.style.scrollSnapType = 'x mandatory'; // Reativa snap
    });

    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2.5; 
        slider.scrollLeft = scrollLeft - walk;
    });

    // Filtros de liga
    document.querySelectorAll('.pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.pill.active').classList.remove('active');
            btn.classList.add('active');
            carregarTabela(btn.dataset.liga);
        });
    });
});
