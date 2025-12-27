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

// --- 1. CARREGAR JOGOS AO VIVO (VERSÃO CORRIGIDA E COMPLETA) ---
async function carregarAoVivo() {
    const container = document.getElementById('lista-ao-vivo');
    if (!container) return;

    try {
        // Buscamos todos os dados da tabela
        const { data, error } = await _supabase.from('jogos_ao_vivo').select('*');
        
        if (error) throw error;

        // LOG DE DEBUG: Abra o console (F12) e veja se os dados aparecem aqui
        console.log("Dados recebidos do Supabase (Ao Vivo):", data);

        if (data && data.length > 0) {
            container.innerHTML = data.map(j => {
                
                /* AJUSTE DE SEGURANÇA: 
                   Se no seu banco as colunas tiverem nomes diferentes, 
                   ajuste aqui embaixo (ex: j.gols_casa x j.gols_fora)
                */
                const placarExibicao = j.placar ? j.placar : "0 - 0";
                const tempoJogo = j.status || 'Tempo Real';
                const logoCasa = j.logo_casa || ESCUDO_FALLBACK;
                const logoFora = j.logo_fora || ESCUDO_FALLBACK;

                return `
                    <div class="card-hero">
                        <div class="hero-teams">
                            <div class="hero-team-box">
                                <img src="${logoCasa}" class="hero-logo" onerror="this.src='${ESCUDO_FALLBACK}'">
                                <span class="hero-name">${j.time_casa || 'Mandante'}</span>
                            </div>
                            
                            <div class="hero-score">${placarExibicao}</div>
                            
                            <div class="hero-team-box">
                                <img src="${logoFora}" class="hero-logo" onerror="this.src='${ESCUDO_FALLBACK}'">
                                <span class="hero-name">${j.time_fora || 'Visitante'}</span>
                            </div>
                        </div>
                        <div class="hero-status">
                            <span class="live-dot"></span> ${tempoJogo}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<p style="color: #666; padding: 20px; width: 100%; text-align: center;">Nenhum jogo ao vivo encontrado no banco.</p>';
        }
    } catch (e) {
        console.error("Erro crítico ao carregar jogos ao vivo:", e);
        container.innerHTML = '<p style="color: red; padding: 20px;">Erro ao conectar com a base de dados.</p>';
    }
}
// --- FUNÇÃO PARA CARREGAR A TABELA ---
async function carregarTabela(liga) {
    try {
        const { data, error } = await _supabase.from('tabelas_ligas').select('*').eq('liga', liga).order('posicao');
        const corpo = document.getElementById('tabela-corpo');
        
        if (error || !corpo) return;

        corpo.innerHTML = data.map(item => {
            // Transformamos o objeto em string para passar no clique
            const dadosTime = JSON.stringify(item).replace(/'/g, "&apos;"); 
            
            return `
                <tr class="row-interativa" onclick='abrirModalTime(${dadosTime})'>
                    <td>${item.posicao}º</td>
                    <td>
                        <div class="team-clickable">
                            <img src="${item.escudo || ESCUDO_PADRAO}" class="team-cell-img">
                            <span>${item.time}</span>
                        </div>
                    </td>
                    <td align="center">${item.jogos}</td>
                    <td align="center" style="color:var(--neon-blue); font-weight:bold;">${item.pontos}</td>
                </tr>
            `;
        }).join('');
    } catch (e) { console.error("Erro na tabela:", e); }
}

// --- FUNÇÕES DO MODAL ---
function abrirModalTime(time) {
    const modal = document.getElementById('modal-time');
    if (!modal) return;

    // Preenche os dados
    document.getElementById('modal-nome-time').innerText = time.time;
    document.getElementById('modal-escudo').src = time.escudo || ESCUDO_PADRAO;
    document.getElementById('modal-pos').innerText = time.posicao + "º";
    document.getElementById('modal-pts').innerText = time.pontos;

    // Mostra o modal
    modal.style.display = 'flex';
}

function fecharModalTime() {
    const modal = document.getElementById('modal-time');
    if (modal) modal.style.display = 'none';
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
