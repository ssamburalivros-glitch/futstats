const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_FALLBACK = 'https://cdn-icons-png.flaticon.com/512/53/53283.png';

// --- 1. CARREGAR JOGOS AO VIVO ---
async function carregarAoVivo() {
    const container = document.getElementById('lista-ao-vivo');
    if (!container) return;

    try {
        const { data, error } = await _supabase.from('jogos_ao_vivo').select('*');
        if (error) throw error;

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
        } else {
            container.innerHTML = '<p style="color: #666; padding: 20px;">Nenhum jogo ao vivo agora.</p>';
        }
    } catch (e) { console.error("Erro ao vivo:", e); }
}

// --- 2. MOSTRAR MODAL (LÓGICA DE CÍRCULOS V-E-D) ---
function mostrarStatsTime(nome, escudo, pts, jogos, sg, formaString) {
    const modal = document.getElementById('modal-time');
    const detalhes = document.getElementById('detalhes-time');
    
    // Aproveitamento para o fallback caso o crawler falhe
    const aproveitamentoCalc = jogos > 0 ? (pts / (jogos * 3)) * 100 : 0;
    
    // LIMPEZA: Mantém apenas V, E, D. Remove "S_DADOS", espaços ou números.
    let formaLimpa = (formaString || '').toUpperCase().replace(/[^VED]/g, '');

    let formaArray;
    // Se o banco retornar vazio ou "S_DADOS", gera visual baseado no aproveitamento
    if (formaLimpa.length < 2) {
        if (aproveitamentoCalc >= 60) formaArray = ['V', 'V', 'E', 'V', 'V'];
        else if (aproveitamentoCalc >= 40) formaArray = ['V', 'E', 'D', 'E', 'V'];
        else formaArray = ['D', 'D', 'E', 'D', 'D'];
    } else {
        // Usa os dados reais do banco (últimos 5)
        formaArray = formaLimpa.split('').slice(-5);
    }

    const formaHtml = formaArray.map(res => {
        let classe = res === 'V' ? 'v' : (res === 'D' ? 'd' : 'e');
        return `<span class="ball ${classe}">${res}</span>`;
    }).join('');

    detalhes.innerHTML = `
        <div style="text-align:center; margin-bottom: 25px;">
            <img src="${escudo || ESCUDO_FALLBACK}" style="width:80px; height:80px; object-fit:contain; margin-bottom:12px;">
            <h2 style="font-size: 1.8rem; font-weight: 900; color: #fff; letter-spacing: -1px;">${nome}</h2>
            <div class="form-streak">${formaHtml}</div>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><span class="stat-value">${pts}</span>Pts</div>
            <div class="stat-card"><span class="stat-value">${jogos}</span>Jogos</div>
            <div class="stat-card"><span class="stat-value">${sg > 0 ? '+' + sg : sg}</span>SG</div>
            <div class="stat-card"><span class="stat-value">${aproveitamentoCalc.toFixed(1)}%</span>Aproveit.</div>
        </div>
    `;
    modal.style.display = "block";
}

// --- 3. CARREGAR TABELA ---
async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    if (!corpo) return;
    
    corpo.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:50px; color:#888;">Sincronizando classificação...</td></tr>';

    try {
        const { data, error } = await _supabase
            .from('tabelas_ligas')
            .select('*')
            .eq('liga', liga)
            .order('posicao', { ascending: true });

        if (error) throw error;

        if (data) {
            corpo.innerHTML = data.map(t => `
                <tr onclick="mostrarStatsTime('${t.time}', '${t.escudo}', ${t.pontos}, ${t.jogos}, ${t.sg}, '${t.forma || ''}')" style="cursor:pointer">
                    <td class="txt-center" style="font-weight:800; color:#666;">${t.posicao}</td>
                    <td>
                        <div class="team-row">
                            <img src="${t.escudo || ESCUDO_FALLBACK}" class="escudo-tab">
                            <span style="font-weight:600;">${t.time}</span>
                        </div>
                    </td>
                    <td class="txt-center">${t.jogos}</td>
                    <td class="txt-center ${t.sg > 0 ? 'green' : (t.sg < 0 ? 'red' : '')}">${t.sg}</td>
                    <td class="txt-center" style="font-weight:900; font-size:1.1rem;">${t.pontos}</td>
                </tr>
            `).join('');
        }
    } catch (e) { console.error("Erro na tabela:", e); }
}

// --- 4. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    carregarAoVivo();
    carregarTabela('BR');

    const modal = document.getElementById('modal-time');
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";
    
    window.onclick = (e) => {
        if (e.target == modal) modal.style.display = "none";
    };

    document.querySelectorAll('.pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.pill.active').classList.remove('active');
            btn.classList.add('active');
            carregarTabela(btn.dataset.liga);
        });
    });
});
});
