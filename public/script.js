// --- CONFIGURAÇÃO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_PADRAO = "https://cdn-icons-png.flaticon.com/512/53/53244.png";

document.addEventListener('DOMContentLoaded', () => {
    const corpoTabela = document.getElementById('tabela-corpo');
    if (corpoTabela) {
        carregarTabela('BR');
        configurarFiltrosLigas();
    }

    // Fechamento do Modal
    const btnFechar = document.querySelector('.close-modal-btn');
    if (btnFechar) btnFechar.onclick = () => document.getElementById('modal-time').style.display = 'none';
    
    window.onclick = (e) => {
        if (e.target.id === 'modal-time') e.target.style.display = 'none';
    };
});

async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    if (!corpo) return;
    
    corpo.innerHTML = "<tr><td colspan='7' align='center'>Carregando dados...</td></tr>";

    try {
        const { data, error } = await _supabase
            .from('tabelas_ligas')
            .select('*')
            .eq('liga', liga)
            .order('posicao', { ascending: true });

        if (error) throw error;

        corpo.innerHTML = data.map(item => {
            // Garante que o clique não quebre se houver aspas no nome do time
            const dadosJson = JSON.stringify(item).replace(/'/g, "&apos;");
            
            return `
                <tr onclick='abrirModalTime(${dadosJson})' style="cursor:pointer;">
                    <td>${item.posicao || 0}º</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${item.escudo || ESCUDO_PADRAO}" width="24" height="24" onerror="this.src='${ESCUDO_PADRAO}'">
                            <span>${item.time}</span>
                        </div>
                    </td>
                    <td align="center">${item.jogos || 0}</td>
                    <td align="center">${item.gols_pro || 0}</td>
                    <td align="center">${item.gols_contra || 0}</td>
                    <td align="center"><strong>${item.sg || 0}</strong></td>
                    <td align="center" style="color:#00ff88; font-weight:bold;">${item.pontos || 0}</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error("Erro:", e);
        corpo.innerHTML = "<tr><td colspan='7' align='center'>Erro ao carregar liga.</td></tr>";
    }
}

function abrirModalTime(time) {
    const modal = document.getElementById('modal-time');
    if (!modal) return;

    // Preenchimento Seguro
    document.getElementById('modal-nome-time').innerText = time.time || "Time";
    document.getElementById('modal-escudo').src = time.escudo || ESCUDO_PADRAO;
    document.getElementById('modal-liga-badge').innerText = time.liga || "LIGA";
    document.getElementById('modal-pos').innerText = (time.posicao || '0') + "º";
    document.getElementById('modal-pts').innerText = time.pontos || '0';
    document.getElementById('modal-gp').innerText = time.gols_pro || '0';
    document.getElementById('modal-gc').innerText = time.gols_contra || '0';
    document.getElementById('modal-sg').innerText = time.sg || '0';
    document.getElementById('modal-jogos').innerText = time.jogos || '0';

    modal.style.display = 'flex';
}

function configurarFiltrosLigas() {
    document.querySelectorAll('.league-btn').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('.league-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            carregarTabela(this.dataset.liga);
        };
    });
}
