// --- CONFIGURAÇÃO DO NÚCLEO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_PADRAO = "https://cdn-icons-png.flaticon.com/512/53/53244.png";

// --- INICIALIZAÇÃO SEGURA ---
document.addEventListener('DOMContentLoaded', () => {
    // Detecta em qual página o usuário está
    const ehClassificacao = document.getElementById('tabela-corpo');
    const ehArena = document.getElementById('liga-a');
    const ehHome = document.querySelector('.carousel-slides');

    if (ehClassificacao) {
        carregarTabela('BR');
        configurarFiltrosLigas();
        inicializarPesquisa();
    }

    if (ehArena) configurarH2H();
    if (ehHome) inicializarCarrossel();

    // Listeners para fechar o Modal
    const btnFechar = document.querySelector('.close-modal-btn');
    if (btnFechar) btnFechar.onclick = fecharModalTime;

    window.onclick = (e) => {
        const modal = document.getElementById('modal-time');
        if (e.target === modal) fecharModalTime();
    };
});

// --- CLASSIFICAÇÃO (TABELA NEURAL) ---
async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    if (!corpo) return;
    
    corpo.innerHTML = "<tr><td colspan='7' align='center'>Sincronizando dados neurais...</td></tr>";

    try {
        const { data, error } = await _supabase
            .from('tabelas_ligas')
            .select('*')
            .eq('liga', liga)
            .order('posicao', { ascending: true });

        if (error) throw error;

        corpo.innerHTML = data.map(item => {
            // Converte o objeto do time em string segura para o clique
            const dadosTime = JSON.stringify(item).replace(/'/g, "&apos;");
            
            return `
                <tr class="row-interativa" onclick='abrirModalTime(${dadosTime})' style="cursor:pointer;">
                    <td>${item.posicao}º</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${item.escudo || ESCUDO_PADRAO}" width="24" height="24" onerror="this.src='${ESCUDO_PADRAO}'">
                            <span>${item.time}</span>
                        </div>
                    </td>
                    <td align="center">${item.jogos || 0}</td>
                    <td align="center" style="color:#aaa;">${item.gols_pro || 0}</td>
                    <td align="center" style="color:#aaa;">${item.gols_contra || 0}</td>
                    <td align="center"><strong>${item.sg || 0}</strong></td>
                    <td align="center" style="color:#00ff88; font-weight:bold;">${item.pontos || 0}</td>
                </tr>
            `;
        }).join('');
    } catch (e) { 
        console.error("Erro Supabase:", e); 
        corpo.innerHTML = "<tr><td colspan='7' align='center' style='color:red'>Erro ao conectar com o banco de dados.</td></tr>"; 
    }
}

// --- MODAL DE DETALHES (ESTILO PAULISTÃO) ---
function abrirModalTime(time) {
    const modal = document.getElementById('modal-time');
    if (!modal) return;

    // Identidade
    document.getElementById('modal-nome-time').innerText = time.time || "---";
    document.getElementById('modal-escudo').src = time.escudo || ESCUDO_PADRAO;
    document.getElementById('modal-liga-badge').innerText = time.liga || "LIGA";

    // Stats Principais
    document.getElementById('modal-pos').innerText = (time.posicao || '0') + "º";
    document.getElementById('modal-pts').innerText = time.pontos || '0';

    // Gols (GP, GC, SG) - Aqui é onde estavam os zeros
    document.getElementById('modal-gp').innerText = time.gols_pro || 0;
    document.getElementById('modal-gc').innerText = time.gols_contra || 0;
    document.getElementById('modal-sg').innerText = time.sg || 0;
    
    // Total de Jogos
    document.getElementById('modal-jogos').innerText = time.jogos || 0;

    // Exibe o modal
    modal.style.display = 'flex';
}

function fecharModalTime() {
    const modal = document.getElementById('modal-time');
    if (modal) modal.style.display = 'none';
}

// --- FILTROS E PESQUISA ---
function configurarFiltrosLigas() {
    document.querySelectorAll('.league-btn').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('.league-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            carregarTabela(this.dataset.liga);
        };
    });
}

function inicializarPesquisa() {
    const input = document.getElementById('search-team');
    if (!input) return;
    input.addEventListener('input', function() {
        const termo = this.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const linhas = document.querySelectorAll('#tabela-corpo tr');
        linhas.forEach(linha => {
            const nomeTime = linha.querySelector('span')?.innerText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
            linha.style.display = nomeTime.includes(termo) ? "" : "none";
        });
    });
}

// --- ARENA H2H (COMPARATIVO) ---
function configurarH2H() {
    ['liga-a', 'liga-b'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', async function() {
            const lado = id.split('-')[1];
            const selectTime = document.getElementById(`time-${lado}`);
            selectTime.innerHTML = '<option>Carregando...</option>';

            const { data } = await _supabase.from('tabelas_ligas').select('*').eq('liga', this.value).order('time');
            
            selectTime.innerHTML = '<option value="">Selecione o Time</option>';
            data?.forEach(t => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(t);
                opt.innerText = t.time;
                selectTime.appendChild(opt);
            });
        });
    });

    const btnComparar = document.getElementById('btn-comparar');
    if (btnComparar) {
        btnComparar.onclick = () => {
            const valA = document.getElementById('time-a').value;
            const valB = document.getElementById('time-b').value;
            if (valA && valB) processarDuelo(JSON.parse(valA), JSON.parse(valB));
        };
    }
}

function processarDuelo(a, b) {
    const display = document.getElementById('h2h-display');
    if (!display) return;
    display.style.display = 'block';

    document.getElementById('name-a').innerText = a.time;
    document.getElementById('name-b').innerText = b.time;
    document.getElementById('img-a').src = a.escudo || ESCUDO_PADRAO;
    document.getElementById('img-b').src = b.escudo || ESCUDO_PADRAO;

    // Probabilidade Simples FutStats
    const totalPts = (a.pontos || 0) + (b.pontos || 0) + 1;
    const percA = Math.round(((a.pontos || 0) / totalPts) * 100);
    const percB = 100 - percA;

    document.getElementById('perc-a').innerText = percA + "%";
    document.getElementById('perc-b').innerText = percB + "%";
    document.getElementById('bar-a').style.width = percA + "%";
    document.getElementById('bar-b').style.width = percB + "%";
}
