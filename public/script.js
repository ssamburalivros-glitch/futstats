// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_FALLBACK = 'https://cdn-icons-png.flaticon.com/512/53/53283.png';

// --- 1. CARREGAR JOGOS AO VIVO (CARDS) ---
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
            container.innerHTML = '<p style="color: #888; padding: 20px;">Nenhum jogo ao vivo no momento.</p>';
        }
    } catch (e) {
        console.error("Erro ao carregar ao vivo:", e);
    }
}

// --- 2. AUXILIAR: GERAR BOLINHAS DE FORMA ---
function gerarBolinhasForma(formaString) {
    // Se não houver dados, retorna vazio ou um aviso
    if (!formaString || formaString === "EEEEE") {
        return '<small style="color:#666">Dados sendo processados...</small>';
    }

    // Transforma a string "VVEDV" em bolinhas coloridas
    return formaString.split('').map(letra => {
        const resultado = letra.toUpperCase();
        let classe = 'e'; // Padrão Empate
        if (resultado === 'V') classe = 'v';
        if (resultado === 'D') classe = 'd';
        
        return `<span class="ball ${classe}">${resultado}</span>`;
    }).join('');
}

// --- 3. MODAL DE ESTATÍSTICAS ---
function mostrarStatsTime(nome, escudo, pts, jogos, sg, formaString) {
    const modal = document.getElementById('modal-time');
    const detalhes = document.getElementById('detalhes-time');
    if (!modal || !detalhes) return;
    
    const aproveitamento = jogos > 0 ? (pts / (jogos * 3)) * 100 : 0;
    
    // Gera o HTML das bolinhas usando a função auxiliar
    const formaHtml = gerarBolinhasForma(formaString);

    detalhes.innerHTML = `
        <div style="text-align:center; margin-bottom: 25px;">
            <img src="${escudo || ESCUDO_FALLBACK}" style="width:80px; height:80px; object-fit:contain; margin-bottom:12px;">
            <h2 style="font-size: 1.8rem; font-weight: 900; color: #fff; margin:0;">${nome}</h2>
            <div class="form-streak" style="margin-top:15px;">${formaHtml}</div>
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

// --- 4. CARREGAR TABELA DE CLASSIFICAÇÃO ---
async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    if (!corpo) return;
    
    corpo.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:#888;">Carregando classificação...</td></tr>';

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
                    <td class="txt-center" style="font-weight:800; color:#888;">${t.posicao}</td>
                    <td>
                        <div class="team-row">
                            <img src="${t.escudo || ESCUDO_FALLBACK}" class="escudo-tab">
                            <span>${t.time}</span>
                        </div>
                    </td>
                    <td class="txt-center">${t.jogos}</td>
                    <td class="txt-center ${t.sg > 0 ? 'green' : (t.sg < 0 ? 'red' : '')}">${t.sg}</td>
                    <td class="txt-center" style="font-weight:900;">${t.pontos}</td>
                </tr>
            `).join('');
        }
    } catch (e) { 
        console.error("Erro na tabela:", e);
        corpo.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Erro ao carregar dados.</td></tr>';
    }
}

// --- 5. INICIALIZAÇÃO E EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
    carregarAoVivo();
    carregarTabela('BR');

    const modal = document.getElementById('modal-time');
    const closeBtn = document.querySelector('.close-modal');
    
    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = "none";
    }
    
    window.onclick = (e) => {
        if (e.target == modal) modal.style.display = "none";
    };

    document.querySelectorAll('.pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const active = document.querySelector('.pill.active');
            if (active) active.classList.remove('active');
            btn.classList.add('active');
            carregarTabela(btn.dataset.liga);
        });
    });
});
