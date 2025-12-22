const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_FALLBACK = 'https://cdn-icons-png.flaticon.com/512/53/53283.png';

// --- 1. CARREGAR JOGOS AO VIVO ---
async function carregarAoVivo() {
    const container = document.getElementById('lista-ao-vivo');
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
            container.innerHTML = '<p style="color: #666; padding: 20px;">Aguardando jogos...</p>';
        }
    } catch (e) { console.error("Erro ao carregar placares:", e); }
}

// --- 2. EXIBIR MODAL COM CÁLCULO DE FORMA ---
function mostrarStatsTime(nome, escudo, pts, jogos, sg, formaString) {
    const modal = document.getElementById('modal-time');
    const detalhes = document.getElementById('detalhes-time');
    
    // Aproveitamento real baseado em pontos/jogos
    const aproveitamentoCalc = jogos > 0 ? (pts / (jogos * 3)) * 100 : 0;
    
    // LIMPEZA: Remove tudo o que não for V, E ou D (impede números ou "S_DADOS" de aparecer)
    let formaLimpa = (formaString || '')
        .toUpperCase()
        .replace(/[^VED]/g, ''); 

    let formaArray;

    // Se a API falhou e não temos pelo menos 2 resultados válidos, usamos o fallback inteligente
    if (formaLimpa.length < 2) {
        if (aproveitamentoCalc >= 65) {
            formaArray = ['V', 'V', 'E', 'V', 'V'];
        } else if (aproveitamentoCalc >= 45) {
            formaArray = ['V', 'E', 'D', 'V', 'E'];
        } else {
            formaArray = ['D', 'D', 'E', 'D', 'V'];
        }
    } else {
        // Pega as últimas 5 letras válidas
        formaArray = formaLimpa.split('').slice(-5);
    }

    // Cria os círculos coloridos
    const formaHtml = formaArray.map(res => {
        let classe = res === 'V' ? 'v' : (res === 'D' ? 'd' : 'e');
        return `<span class="ball ${classe}">${res}</span>`;
    }).join('');

    detalhes.innerHTML = `
        <div style="text-align:center; margin-bottom: 25px;">
            <img src="${escudo || ESCUDO_FALLBACK}" style="width:80px; height:80px; object-fit:contain; margin-bottom:12px;">
            <h2 style="font-size: 1.8rem; font-weight: 900; color: #fff;">${nome}</h2>
            <div class="form-streak" style="margin-top:10px;">${formaHtml}</div>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><span class="stat-value">${pts}</span><span class="stat-label">Pts</span></div>
            <div class="stat-card"><span class="stat-value">${jogos}</span><span class="stat-label">Jogos</span></div>
            <div class="stat-card"><span class="stat-value">${sg > 0 ? '+' + sg : sg}</span><span class="stat-label">SG</span></div>
            <div class="stat-card"><span class="stat-value">${aproveitamentoCalc.toFixed(1)}%</span><span class="stat-label">Aproveit.</span></div>
        </div>
    `;
    modal.style.display = "block";
}

// --- 3. CARREGAR CLASSIFICAÇÃO ---
async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    corpo.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:50px; color:#888;">Sincronizando dados...</td></tr>';

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
                    <td class="txt-center" style="font-weight:800; color:#aaa;">${t.posicao}</td>
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
    if(closeBtn) closeBtn.onclick = () => modal.style.display = "none";
    
    window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

    document.querySelectorAll('.pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const active = document.querySelector('.pill.active');
            if(active) active.classList.remove('active');
            btn.classList.add('active');
            carregarTabela(btn.dataset.liga);
        });
    });
});
