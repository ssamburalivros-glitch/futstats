// --- CONFIGURAÇÃO DO NÚCLEO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Brasão padrão para evitar espaços vazios ou erros de imagem (404/DNS)
const ESCUDO_PADRAO = "https://cdn-icons-png.flaticon.com/512/53/53244.png";

// --- INICIALIZAÇÃO INTELIGENTE ---
document.addEventListener('DOMContentLoaded', () => {
    // Detecta se estamos na HOME
    if (document.getElementById('tabela-corpo')) {
        carregarIA();
        carregarAoVivo();
        carregarTabela('BR');
        configurarFiltrosLigas();
    }

    // Detecta se estamos na ARENA H2H
    if (document.getElementById('liga-a')) {
        configurarH2H();
    }
});

// --- 1. IA INSIGHTS (HOME) ---
async function carregarIA() {
    try {
        const { data } = await _supabase
            .from('site_info')
            .select('comentario_ia')
            .eq('id', 1)
            .single();

        const boxIA = document.getElementById('ia-box');
        if (data && data.comentario_ia) {
            let texto = data.comentario_ia;
            let i = 0;
            boxIA.innerHTML = "";
            function digitar() {
                if (i < texto.length) {
                    boxIA.innerHTML += texto.charAt(i);
                    i++;
                    setTimeout(digitar, 25);
                }
            }
            digitar();
        }
    } catch (e) { console.error("IA Offline"); }
}

// --- 2. JOGOS AO VIVO (HOME - ANTI-ERRO) ---
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
// --- 3. TABELA DE CLASSIFICAÇÃO (HOME) ---
async function carregarTabela(siglaLiga) {
    try {
        const { data } = await _supabase.from('tabelas_ligas').select('*').eq('liga', siglaLiga).order('posicao');
        const corpo = document.getElementById('tabela-corpo');
        if (!corpo) return;
        
        corpo.innerHTML = "";
        if (data) {
            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.className = "row-interativa";
                tr.onclick = () => abrirModalTime(item);
                
                const esc = (item.escudo && item.escudo.startsWith('http')) ? item.escudo : ESCUDO_PADRAO;

                tr.innerHTML = `
                    <td style="font-size:0.75rem; color:#444;">${item.posicao}</td>
                    <td>
                        <div class="team-clickable">
                            <img src="${esc}" class="team-cell-img" onerror="this.src='${ESCUDO_PADRAO}'">
                            <span>${item.time}</span>
                        </div>
                    </td>
                    <td align="center">${item.jogos}</td>
                    <td align="center" style="color:var(--neon-blue); font-weight:bold;">${item.pontos}</td>
                `;
                corpo.appendChild(tr);
            });
        }
    } catch (e) { console.error("Erro Tabela"); }
}

// --- 4. ARENA H2H (PÁGINA ARENA.HTML) ---
function configurarH2H() {
    const ids = ['liga-a', 'liga-b'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('change', async function() {
            const lado = id.split('-')[1];
            const timeSelect = document.getElementById(`time-${lado}`);
            if (!this.value) return;

            timeSelect.disabled = true;
            timeSelect.innerHTML = '<option>Aguarde...</option>';

            const { data } = await _supabase
                .from('tabelas_ligas')
                .select('*')
                .eq('liga', this.value)
                .order('time');

            timeSelect.innerHTML = '<option value="">Selecione o Time</option>';
            data?.forEach(t => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(t);
                opt.innerText = t.time;
                timeSelect.appendChild(opt);
            });
            timeSelect.disabled = false;
        });
    });

    document.getElementById('time-b')?.addEventListener('change', () => {
        try {
            const valA = document.getElementById('time-a').value;
            const valB = document.getElementById('time-b').value;
            if (!valA || !valB) return;

            const a = JSON.parse(valA);
            const b = JSON.parse(valB);

            document.getElementById('h2h-display').style.display = 'block';
            document.getElementById('img-a').src = a.escudo || ESCUDO_PADRAO;
            document.getElementById('img-a').onerror = function() { this.src = ESCUDO_PADRAO; };
            document.getElementById('name-a').innerText = a.time;
            
            document.getElementById('img-b').src = b.escudo || ESCUDO_PADRAO;
            document.getElementById('img-b').onerror = function() { this.src = ESCUDO_PADRAO; };
            document.getElementById('name-b').innerText = b.time;

            // Cálculo Simples de Power Rank
            document.getElementById('power-a').innerText = Math.min(99, (a.pontos * 1.5)).toFixed(0);
            document.getElementById('power-b').innerText = Math.min(99, (b.pontos * 1.5)).toFixed(0);
        } catch (e) { console.error("Erro no Duelo"); }
    });
}

// --- 5. FUNÇÕES DE SUPORTE ---
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
    document.getElementById('modal-escudo').src = (time.escudo && time.escudo.startsWith('http')) ? time.escudo : ESCUDO_PADRAO;
    document.getElementById('modal-pos').innerText = time.posicao;
    document.getElementById('modal-pts').innerText = time.pontos;
    modal.style.display = 'flex';
}

function fecharModalTime() {
    const modal = document.getElementById('modal-time');
    if (modal) modal.style.display = 'none';
}
