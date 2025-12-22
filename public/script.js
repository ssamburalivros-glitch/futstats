const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function mostrarStatsTime(nome, escudo, pts, jogos, sg, formaString) {
    const modal = document.getElementById('modal-time');
    const detalhes = document.getElementById('detalhes-time');
    
    const aproveitamento = jogos > 0 ? (pts / (jogos * 3)) * 100 : 0;
    
    // Limpeza rigorosa: remove tudo que não for V, E ou D
    let formaLimpa = (formaString || '').toUpperCase().replace(/[^VED]/g, '');

    let formaArray;
    // Fallback caso o banco esteja vazio: gera 5 bolas baseadas no aproveitamento
    if (formaLimpa.length < 2) {
        if (aproveitamento >= 65) formaArray = ['V', 'V', 'E', 'V', 'V'];
        else if (aproveitamento >= 40) formaArray = ['V', 'E', 'D', 'E', 'V'];
        else formaArray = ['D', 'D', 'E', 'D', 'D'];
    } else {
        formaArray = formaLimpa.split('').slice(-5);
    }

    const formaHtml = formaArray.map(res => {
        let classe = res === 'V' ? 'v' : (res === 'D' ? 'd' : 'e');
        return `<span class="ball ${classe}">${res}</span>`;
    }).join('');

    detalhes.innerHTML = `
        <div style="text-align:center; margin-bottom: 20px;">
            <img src="${escudo}" style="width:80px; height:80px; object-fit:contain; margin-bottom:10px;">
            <h2 style="font-size: 1.8rem; font-weight: 900; color: white;">${nome}</h2>
            <div class="form-streak">${formaHtml}</div>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><span class="stat-value">${pts}</span>Pts</div>
            <div class="stat-card"><span class="stat-value">${jogos}</span>Jogos</div>
            <div class="stat-card"><span class="stat-value">${sg > 0 ? '+' + sg : sg}</span>SG</div>
            <div class="stat-card"><span class="stat-value">${aproveitamento.toFixed(1)}%</span>Aproveit.</div>
        </div>
    `;
    modal.style.display = "block";
}

async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    corpo.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">Carregando...</td></tr>';
    try {
        const { data } = await _supabase.from('tabelas_ligas').select('*').eq('liga', liga).order('posicao', { ascending: true });
        if (data) {
            corpo.innerHTML = data.map(t => `
                <tr onclick="mostrarStatsTime('${t.time}', '${t.escudo}', ${t.pontos}, ${t.jogos}, ${t.sg}, '${t.forma}')" style="cursor:pointer">
                    <td class="txt-center">${t.posicao}</td>
                    <td><div class="team-row"><img src="${t.escudo}" class="escudo-tab"><span>${t.time}</span></div></td>
                    <td class="txt-center">${t.jogos}</td>
                    <td class="txt-center ${t.sg > 0 ? 'green' : (t.sg < 0 ? 'red' : '')}">${t.sg}</td>
                    <td class="txt-center" style="font-weight:900;">${t.pontos}</td>
                </tr>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

document.addEventListener('DOMContentLoaded', () => {
    carregarTabela('BR');
    const modal = document.getElementById('modal-time');
    document.querySelector('.close-modal').onclick = () => modal.style.display = "none";
    window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };
    document.querySelectorAll('.pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.pill.active').classList.remove('active');
            btn.classList.add('active');
            carregarTabela(btn.dataset.liga);
        });
    });
});
