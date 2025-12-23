const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_FALLBACK = 'https://cdn-icons-png.flaticon.com/512/53/53283.png';

// --- 1. CARREGAR COMENTÁRIO DA IA ---
async function carregarIA() {
    const box = document.getElementById('ia-box');
    try {
        const { data, error } = await _supabase
            .from('site_info')
            .select('comentario_ia')
            .eq('id', 1)
            .single();

        if (data && data.comentario_ia) {
            box.innerHTML = data.comentario_ia;
        }
    } catch (e) {
        console.error("Erro IA:", e);
        box.innerText = "IA temporariamente fora de campo.";
    }
}

// --- 2. CARREGAR JOGOS AO VIVO ---
async function carregarAoVivo() {
    const container = document.getElementById('lista-ao-vivo');
    if (!container) return;

    try {
        const { data, error } = await _supabase.from('jogos_ao_vivo').select('*');
        if (data && data.length > 0) {
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

// --- 3. MODAL DE STATS (FOCO EM NÚMEROS) ---
function mostrarStatsTime(nome, escudo, pts, jogos, sg) {
    const modal = document.getElementById('modal-time');
    const detalhes = document.getElementById('detalhes-time');
    
    const aproveitamento = jogos > 0 ? (pts / (jogos * 3)) * 100 : 0;

    detalhes.innerHTML = `
        <div style="text-align:center; margin-bottom: 20px;">
            <img src="${escudo || ESCUDO_FALLBACK}" style="width:70px; height:70px; object-fit:contain;">
            <h2 style="color:#fff; margin-top:10px;">${nome}</h2>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><b>${pts}</b><br><small>PTS</small></div>
            <div class="stat-card"><b>${jogos}</b><br><small>JOGOS</small></div>
            <div class="stat-card"><b>${sg > 0 ? '+' + sg : sg}</b><br><small>SG</small></div>
            <div class="stat-card"><b>${aproveitamento.toFixed(1)}%</b><br><small>APROV.</small></div>
        </div>
    `;
    modal.style.display = "block";
}

// --- 4. CARREGAR TABELA ---
async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    corpo.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Carregando...</td></tr>';

    try {
        const { data } = await _supabase
            .from('tabelas_ligas')
            .select('*')
            .eq('liga', liga)
            .order('posicao', { ascending: true });

        if (data) {
            corpo.innerHTML = data.map(t => `
                <tr onclick="mostrarStatsTime('${t.time}', '${t.escudo}', ${t.pontos}, ${t.jogos}, ${t.sg})">
                    <td class="txt-center">${t.posicao}</td>
                    <td>
                        <div class="team-row">
                            <img src="${t.escudo || ESCUDO_FALLBACK}" class="escudo-tab">
                            <span>${t.time}</span>
                        </div>
                    </td>
                    <td class="txt-center">${t.jogos}</td>
                    <td class="txt-center ${t.sg > 0 ? 'green' : (t.sg < 0 ? 'red' : '')}">${t.sg}</td>
                    <td class="txt-center"><b>${t.pontos}</b></td>
                </tr>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    carregarIA();
    carregarAoVivo();
    carregarTabela('BR');

    const modal = document.getElementById('modal-time');
    document.querySelector('.close-modal').onclick = () => modal.style.display = "none";
    window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

    document.querySelectorAll('.pill').forEach(btn => {
        btn.onclick = () => {
            document.querySelector('.pill.active').classList.remove('active');
            btn.classList.add('active');
            carregarTabela(btn.dataset.liga);
        };
    });
});
