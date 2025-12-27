// --- CONFIGURAÇÃO DO NÚCLEO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    carregarIA();
    carregarAoVivo();
    carregarTabela('BR');
    configurarFiltrosLigas();
    configurarH2H();
});

// --- 1. IA INSIGHTS (CACHE DO BANCO) ---
async function carregarIA() {
    try {
        const { data, error } = await _supabase
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
        } else {
            boxIA.innerText = "IA Offline: Aguardando processamento de metadados...";
        }
    } catch (e) { console.error("Erro IA:", e); }
}

// --- 2. TABELAS E FILTROS ---
async function carregarTabela(siglaLiga) {
    try {
        const { data, error } = await _supabase
            .from('tabelas_ligas')
            .select('*')
            .eq('liga', siglaLiga)
            .order('posicao', { ascending: true });

        if (error) throw error;
        renderizarTabela(data);
    } catch (err) { console.error("Erro Tabela:", err); }
}

function renderizarTabela(dados) {
    const corpo = document.getElementById('tabela-corpo');
    corpo.innerHTML = "";

    if (!dados || dados.length === 0) {
        corpo.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Nenhum dado encontrado para esta liga.</td></tr>';
        return;
    }

    dados.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "row-interativa";
        tr.onclick = () => abrirModalTime(item);

        // Fallback para evitar 404 se a imagem sumir
        const escudoFinal = item.escudo || 'https://via.placeholder.com/24';

        tr.innerHTML = `
            <td style="color:#666; font-family:'Orbitron'; font-size:0.8rem;">${item.posicao}</td>
            <td>
                <div class="team-clickable">
                    <img src="${escudoFinal}" class="team-cell-img" onerror="this.src='https://via.placeholder.com/24'">
                    <span>${item.time}</span>
                </div>
            </td>
            <td align="center">${item.jogos}</td>
            <td align="center" style="font-weight:bold; color:var(--neon-blue);">${item.pontos}</td>
        `;
        corpo.appendChild(tr);
    });
}

function configurarFiltrosLigas() {
    document.querySelectorAll('.league-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.league-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            carregarTabela(this.dataset.liga);
        });
    });
}

// --- 3. MODAL DE DETALHES ---
function abrirModalTime(time) {
    if (!time) return;

    document.getElementById('modal-nome-time').innerText = time.time || "Time Desconhecido";
    document.getElementById('modal-escudo').src = time.escudo || 'https://via.placeholder.com/80';
    document.getElementById('modal-liga-badge').innerText = `LIGA: ${time.liga}`;
    document.getElementById('modal-pos').innerText = `${time.posicao || '--'}º`;
    document.getElementById('modal-pts').innerText = time.pontos || '0';
    document.getElementById('modal-jogos').innerText = time.jogos || '0';
    document.getElementById('modal-sg').innerText = time.sg || '0';

    const containerForma = document.getElementById('modal-forma-list');
    containerForma.innerHTML = "";
    
    const formaStr = time.forma && time.forma !== "S_DADOS" ? time.forma : "";
    
    if (formaStr) {
        formaStr.split('').forEach(res => {
            const item = document.createElement('div');
            item.className = 'forma-item';
            item.innerText = res;
            if(res === 'V') item.style.color = "#00ff41";
            else if(res === 'D') item.style.color = "#ff4d4d";
            else item.style.color = "#888";
            containerForma.appendChild(item);
        });
    } else {
        containerForma.innerHTML = "<span style='font-size:0.7rem; color:#444;'>SEM DADOS RECENTES</span>";
    }

    document.getElementById('modal-time').style.display = 'flex';
}

function fecharModalTime() {
    document.getElementById('modal-time').style.display = 'none';
}

// --- 4. ARENA H2H ---
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
            timeSelect.innerHTML = '<option>Carregando...</option>';

            const { data } = await _supabase
                .from('tabelas_ligas')
                .select('*')
                .eq('liga', this.value)
                .order('time');

            timeSelect.innerHTML = '<option value="">Selecione o Time</option>';
            if (data) {
                data.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = JSON.stringify(t);
                    opt.innerText = t.time;
                    timeSelect.appendChild(opt);
                });
            }
            timeSelect.disabled = false;
        });
    });

    document.getElementById('time-b').addEventListener('change', processarDuelo);
}

function processarDuelo() {
    try {
        const valA = document.getElementById('time-a').value;
        const valB = document.getElementById('time-b').value;
        if (!valA || !valB) return;

        const dataA = JSON.parse(valA);
        const dataB = JSON.parse(valB);

        document.getElementById('h2h-display').style.display = 'block';
        document.getElementById('img-a').src = dataA.escudo || '';
        document.getElementById('name-a').innerText = dataA.time;
        document.getElementById('img-b').src = dataB.escudo || '';
        document.getElementById('name-b').innerText = dataB.time;

        // Power Rank Simples
        const pA = Math.min(99, (dataA.pontos * 1.2) + (dataA.sg * 0.5)).toFixed(0);
        const pB = Math.min(99, (dataB.pontos * 1.2) + (dataB.sg * 0.5)).toFixed(0);
        document.getElementById('power-a').innerText = pA;
        document.getElementById('power-b').innerText = pB;
    } catch (e) { console.error("Erro Duelo:", e); }
}

// --- 5. JOGOS AO VIVO ---
async function carregarAoVivo() {
    try {
        const { data, error } = await _supabase.from('jogos_ao_vivo').select('*');
        const container = document.getElementById('lista-ao-vivo');
        
        if (error || !data || data.length === 0) {
            container.innerHTML = "<p style='color:#444; padding:20px;'>Nenhum jogo ativo.</p>";
            return;
        }

        container.innerHTML = data.map(jogo => {
            // Se as colunas no seu banco tiverem nomes diferentes, ajuste aqui:
            const casa = jogo.time_casa || jogo.equipe_casa || "---";
            const fora = jogo.time_fora || jogo.equipe_fora || "---";
            const placarC = jogo.placar_casa ?? 0;
            const placarF = jogo.placar_fora ?? 0;
            const imgC = jogo.escudo_casa || '';
            const imgF = jogo.escudo_fora || '';

            return `
                <div class="card-hero">
                    <div style="font-size:0.6rem; color:#666; margin-bottom:5px;">${jogo.tempo || 'AO VIVO'}</div>
                    <div class="hero-score">${placarC} - ${placarF}</div>
                    <div class="team-v" style="display:flex; justify-content:center; gap:10px; align-items:center;">
                        <img src="${imgC}" onerror="this.src='https://via.placeholder.com/20'">
                        <span style="font-size:0.7rem;">vs</span>
                        <img src="${imgF}" onerror="this.src='https://via.placeholder.com/20'">
                    </div>
                    <div style="font-size:0.5rem; color:#aaa; margin-top:5px; white-space:nowrap; overflow:hidden;">
                        ${casa} x ${fora}
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) { console.error("Erro no Live:", e); }
}
