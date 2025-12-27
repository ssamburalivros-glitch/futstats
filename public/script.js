// --- CONFIGURAÇÃO DO NÚCLEO ---
const _supabase = supabase.createClient(
    "https://sihunefyfkecumbiyxva.supabase.co", 
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A"
);

// --- INICIALIZAÇÃO DO SISTEMA ---
document.addEventListener('DOMContentLoaded', () => {
    carregarIA();            // Inicia IA (lendo do banco)
    carregarAoVivo();        // Inicia Feed de Jogos
    carregarTabela('BR');    // Inicia Tabela (Brasil por padrão)
    configurarFiltrosLigas(); // Ativa botões de ligas
    configurarH2H();         // Ativa seletores da Arena
});

// --- 1. INTELIGÊNCIA ARTIFICIAL (ECONÔMICA) ---
async function carregarIA() {
    try {
        // Busca o comentário que o Python já salvou no banco
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
                    setTimeout(digitar, 30);
                }
            }
            digitar();
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

    dados.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "row-interativa";
        tr.onclick = () => abrirModalTime(item); // Clique para o Modal Estiloso

        tr.innerHTML = `
            <td class="pos-cell">${item.posicao}</td>
            <td>
                <div class="team-clickable">
                    <img src="${item.escudo}" class="team-cell-img">
                    <span>${item.time}</span>
                </div>
            </td>
            <td align="center">${item.jogos}</td>
            <td align="center" class="pts-cell">${item.pontos}</td>
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

// --- 3. MODAL DE DETALHES DO TIME ---
function abrirModalTime(time) {
    document.getElementById('modal-nome-time').innerText = time.time;
    document.getElementById('modal-escudo').src = time.escudo;
    document.getElementById('modal-liga-badge').innerText = `LIGA: ${time.liga}`;
    document.getElementById('modal-pos').innerText = `${time.posicao}º`;
    document.getElementById('modal-pts').innerText = time.pontos;
    document.getElementById('modal-jogos').innerText = time.jogos;
    document.getElementById('modal-sg').innerText = time.sg;

    // Lógica da Forma (VVDEE)
    const containerForma = document.getElementById('modal-forma-list');
    containerForma.innerHTML = "";
    time.forma.split('').forEach(res => {
        const item = document.createElement('div');
        item.className = 'forma-item';
        item.innerText = res;
        if(res === 'V') item.style.color = "#00ff41";
        else if(res === 'D') item.style.color = "#ff4d4d";
        containerForma.appendChild(item);
    });

    document.getElementById('modal-time').style.display = 'flex';
}

function fecharModalTime() {
    document.getElementById('modal-time').style.display = 'none';
}

// --- 4. ARENA H2H (DINÂMICA) ---
function configurarH2H() {
    const ligasH2H = ['liga-a', 'liga-b'];
    
    ligasH2H.forEach(id => {
        document.getElementById(id).addEventListener('change', async function() {
            const lado = id.split('-')[1]; // a ou b
            const timeSelect = document.getElementById(`time-${lado}`);
            
            timeSelect.disabled = true;
            timeSelect.innerHTML = '<option>Carregando...</option>';

            const { data } = await _supabase
                .from('tabelas_ligas')
                .select('time, escudo, pontos, forma, sg')
                .eq('liga', this.value)
                .order('time');

            timeSelect.innerHTML = '<option value="">Selecione o Time</option>';
            data.forEach(t => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(t); // Guarda o objeto inteiro na opção
                opt.innerText = t.time;
                timeSelect.appendChild(opt);
            });
            timeSelect.disabled = false;
        });
    });

    // Evento para mostrar o duelo quando o segundo time for escolhido
    document.getElementById('time-b').addEventListener('change', processarDuelo);
}

function processarDuelo() {
    const dataA = JSON.parse(document.getElementById('time-a').value);
    const dataB = JSON.parse(document.getElementById('time-b').value);

    if (dataA && dataB) {
        document.getElementById('h2h-display').style.display = 'block';
        
        // Atualiza Escudos e Nomes
        document.getElementById('img-a').src = dataA.escudo;
        document.getElementById('name-a').innerText = dataA.time;
        document.getElementById('img-b').src = dataB.escudo;
        document.getElementById('name-b').innerText = dataB.time;

        // Cálculo Simples de Power Rank (Exemplo)
        const powerA = Math.min(99, (dataA.pontos * 1.5) + (dataA.sg * 0.5)).toFixed(0);
        const powerB = Math.min(99, (dataB.pontos * 1.5) + (dataB.sg * 0.5)).toFixed(0);
        
        document.getElementById('power-a').innerText = powerA;
        document.getElementById('power-b').innerText = powerB;
    }
}

// --- 5. JOGOS AO VIVO ---
async function carregarAoVivo() {
    const { data } = await _supabase.from('jogos_ao_vivo').select('*');
    const container = document.getElementById('lista-ao-vivo');
    if (!data || data.length === 0) {
        container.innerHTML = "<p style='padding:20px; color:#444;'>Nenhum jogo detectado no radar.</p>";
        return;
    }
    
    container.innerHTML = data.map(jogo => `
        <div class="card-hero">
            <div class="hero-score">${jogo.placar_casa} - ${jogo.placar_fora}</div>
            <div class="team-v">
                <img src="${jogo.escudo_casa}">
                <span>vs</span>
                <img src="${jogo.escudo_fora}">
            </div>
            <div style="font-size:0.6rem; color:var(--neon-blue); margin-top:5px;">${jogo.tempo || 'AO VIVO'}</div>
        </div>
    `).join('');
}
