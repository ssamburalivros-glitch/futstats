// --- CONFIGURAÇÃO DO NÚCLEO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_PADRAO = "https://cdn-icons-png.flaticon.com/512/53/53244.png";

// --- INICIALIZAÇÃO SEGURA ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Funções exclusivas da HOME (index.html)
    if (document.getElementById('tabela-corpo')) {
        carregarIA();
        carregarAoVivo();
        carregarTabela('BR');
        configurarFiltrosLigas();
    }

    // 2. Funções exclusivas da ARENA (arena.html)
    if (document.getElementById('liga-a')) {
        configurarH2H();
    }
});

// --- FUNÇÕES DA HOME ---
async function carregarIA() {
    try {
        const { data } = await _supabase.from('site_info').select('comentario_ia').eq('id', 1).single();
        const boxIA = document.getElementById('ia-box');
        if (data?.comentario_ia && boxIA) boxIA.innerText = data.comentario_ia;
    } catch (e) { console.error("IA Offline"); }
}

async function carregarAoVivo() {
    try {
        const { data, error } = await _supabase.from('jogos_ao_vivo').select('*');
        const container = document.getElementById('lista-ao-vivo');
        
        if (error) {
            console.error("Erro na consulta Supabase:", error);
            return;
        }

        console.log("Dados recebidos do Ao Vivo:", data); // Olhe isso no F12!

        if (!data || data.length === 0) {
            container.innerHTML = "<p style='color:#444; padding:20px;'>Sem jogos ativos.</p>";
            return;
        }

        container.innerHTML = data.map(jogo => {
            // AJUSTE AQUI: Verifique se os nomes das colunas batem com o seu Supabase
            const logoCasa = jogo.escudo_casa || jogo.logo_casa || ESCUDO_PADRAO;
            const logoFora = jogo.escudo_fora || jogo.logo_fora || ESCUDO_PADRAO;

            return `
                <div class="card-hero">
                    <div style="font-size:0.55rem; color:var(--neon-blue); font-weight:bold;">${jogo.tempo || 'LIVE'}</div>
                    <div class="hero-score">${jogo.placar_casa ?? 0} - ${jogo.placar_fora ?? 0}</div>
                    <div class="team-v">
                        <img src="${logoCasa}" class="img-mini" onerror="this.src='${ESCUDO_PADRAO}'">
                        <span style="opacity:0.2; font-size:0.6rem;">VS</span>
                        <img src="${logoFora}" class="img-mini" onerror="this.src='${ESCUDO_PADRAO}'">
                    </div>
                    <div style="font-size:0.5rem; color:#666;">${(jogo.time_casa || '---').substring(0,10)}</div>
                </div>
            `;
        }).join('');
    } catch (e) { console.error("Erro crítico ao carregar Ao Vivo:", e); }
}
async function carregarTabela(liga) {
    const { data } = await _supabase.from('tabelas_ligas').select('*').eq('liga', liga).order('posicao');
    const corpo = document.getElementById('tabela-corpo');
    if (!corpo) return;
    corpo.innerHTML = data.map(item => `
        <tr class="row-interativa" onclick='abrirModalTime(${JSON.stringify(item)})'>
            <td style="font-size:0.7rem; color:#444;">${item.posicao}</td>
            <td>
                <div class="team-clickable">
                    <img src="${item.escudo || ESCUDO_PADRAO}" class="team-cell-img" onerror="this.src='${ESCUDO_PADRAO}'">
                    <span>${item.time}</span>
                </div>
            </td>
            <td align="center">${item.jogos}</td>
            <td align="center" style="color:var(--neon-blue); font-weight:bold;">${item.pontos}</td>
        </tr>
    `).join('');
}

// --- FUNÇÕES DA ARENA H2H ---
function configurarH2H() {
    ['liga-a', 'liga-b'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        
        el.addEventListener('change', async function() {
            const lado = id.split('-')[1];
            const selectTime = document.getElementById(`time-${lado}`);
            const { data } = await _supabase.from('tabelas_ligas').select('*').eq('liga', this.value).order('time');
            
            selectTime.innerHTML = '<option value="">Selecione o Time</option>';
            data?.forEach(t => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(t);
                opt.innerText = t.time;
                selectTime.appendChild(opt);
            });
            selectTime.disabled = false;
        });
    });

    const timeB = document.getElementById('time-b');
    if (timeB) {
        timeB.addEventListener('change', () => {
            const valA = document.getElementById('time-a').value;
            const valB = document.getElementById('time-b').value;
            if (valA && valB) {
                processarDuelo(JSON.parse(valA), JSON.parse(valB));
            }
        });
    }
}

function processarDuelo(a, b) {
    const display = document.getElementById('h2h-display');
    if (!display) return;
    display.style.display = 'block';

    // Preenchimento de dados
    document.getElementById('img-a').src = a.escudo || ESCUDO_PADRAO;
    document.getElementById('img-b').src = b.escudo || ESCUDO_PADRAO;
    document.getElementById('name-a').innerText = a.time;
    document.getElementById('name-b').innerText = b.time;
    document.getElementById('pos-a').innerText = `${a.posicao}º`;
    document.getElementById('pos-b').innerText = `${b.posicao}º`;
    document.getElementById('pts-a').innerText = a.pontos;
    document.getElementById('pts-b').innerText = b.pontos;
    document.getElementById('sg-a').innerText = a.sg || 0;
    document.getElementById('sg-b').innerText = b.sg || 0;

    // Cálculo de Probabilidade
    const pA = (a.pontos * 0.7) + ((a.sg || 0) * 0.3) + 1;
    const pB = (b.pontos * 0.7) + ((b.sg || 0) * 0.3) + 1;
    const winA = Math.round((pA / (pA + pB)) * 100);
    const winB = 100 - winA;

    document.getElementById('bar-a').style.width = `${winA}%`;
    document.getElementById('bar-b').style.width = `${winB}%`;
    document.getElementById('perc-a').innerText = `${winA}%`;
    document.getElementById('perc-b').innerText = `${winB}%`;

    const pred = document.getElementById('prediction-text');
    pred.innerText = winA > winB + 5 ? `FAVORITO: ${a.time}` : winB > winA + 5 ? `FAVORITO: ${b.time}` : "EQUILÍBRIO: EMPATE";
}

// --- MODAL E FILTROS ---
function configurarFiltrosLigas() {
    document.querySelectorAll('.league-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.league-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            carregarTabela(this.dataset.liga);
        });
    });
}

function abrirModalTime(time) {
    const modal = document.getElementById('modal-time');
    if (!modal) return;
    document.getElementById('modal-nome-time').innerText = time.time;
    document.getElementById('modal-escudo').src = time.escudo || ESCUDO_PADRAO;
    document.getElementById('modal-pos').innerText = time.posicao;
    document.getElementById('modal-pts').innerText = time.pontos;
    modal.style.display = 'flex';
}

function fecharModalTime() {
    const modal = document.getElementById('modal-time');
    if (modal) modal.style.display = 'none';
}
