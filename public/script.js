// --- CONFIGURAÇÃO NÚCLEO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const ESCUDO_PADRAO = "https://cdn-icons-png.flaticon.com/512/53/53244.png";

document.addEventListener('DOMContentLoaded', () => {
    // Verificadores de Página
    const ehIndex = document.getElementById('carousel-slides');
    const ehClassificacao = document.getElementById('tabela-corpo');
    const ehArena = document.getElementById('liga-a');

    // --- EXECUÇÃO PARA INDEX.HTML ---
    if (ehIndex) {
        console.log("Modo: Home");
        inicializarHome();
    }

    // --- EXECUÇÃO PARA CLASSIFICACAO.HTML ---
    if (ehClassificacao) {
        console.log("Modo: Classificação");
        carregarTabela('BR');
        configurarFiltrosLigas();
        // Listener fechar modal
        const btnClose = document.querySelector('.close-modal-btn');
        if(btnClose) btnClose.onclick = () => document.getElementById('modal-time').style.display = 'none';
    }

    // --- EXECUÇÃO PARA ARENA.HTML ---
    if (ehArena) {
        console.log("Modo: Arena");
        configurarArena();
    }
});

// ==========================================
// LÓGICA DA HOME (INDEX)
// ==========================================
function inicializarHome() {
    // 1. Gerar os Slides do Carrossel (Se estiver vazio no HTML)
    const slidesContainer = document.getElementById('carousel-slides');
    const banners = [
        { img: 'logos/carrossel1.webp', tit: 'ANÁLISE NEURAL', desc: 'Dados processados em tempo real.' },
        { img: 'logos/carrossel2.web', tit: 'ARENA H2H', desc: 'Compare times com inteligência artificial.' },
        { img: 'logos/carrossel3.web', tit: 'BRASILEIRÃO 2026', desc: 'Acompanhe a subida dos gigantes.' }
    ];

    slidesContainer.innerHTML = banners.map(b => `
        <div class="slide">
            <img src="${b.img}" onerror="this.src='https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1000'">
            <div class="slide-caption">
                <h2>${b.tit}</h2>
                <p>${b.desc}</p>
            </div>
        </div>
    `).join('');

    // 2. Movimento do Carrossel
    let index = 0;
    const mover = () => {
        index = (index + 1) % banners.length;
        slidesContainer.style.transform = `translateX(-${index * 100}%)`;
    };
    let interval = setInterval(mover, 5000);

    // 3. Insight de IA Aleatório
    const insights = [
        "Palmeiras tem 87% de eficiência em passes curtos nesta temporada.",
        "Flamengo demonstra maior vigor físico após os 70 minutos de jogo.",
        "A média de gols da Premier League subiu 12% em relação a 2025.",
        "Tendência detectada: Jogos às 16h tem maior incidência de escanteios."
    ];
    const output = document.getElementById('ia-output');
    if(output) output.innerText = insights[Math.floor(Math.random() * insights.length)];
}

// ==========================================
// LÓGICA DA CLASSIFICAÇÃO
// ==========================================
async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    if(!corpo) return;
    corpo.innerHTML = "<tr><td colspan='7' align='center'>Carregando Matrix...</td></tr>";

    const { data, error } = await _supabase.from('tabelas_ligas').select('*').eq('liga', liga).order('posicao');
    if (error) return;

    corpo.innerHTML = data.map(item => {
        const d = JSON.stringify(item).replace(/'/g, "&apos;");
        return `
            <tr onclick='abrirModalTime(${d})' style="cursor:pointer;">
                <td>${item.posicao}º</td>
                <td><div style="display:flex;align-items:center;gap:10px;">
                    <img src="${item.escudo || ESCUDO_PADRAO}" width="24" height="24" onerror="this.src='${ESCUDO_PADRAO}'">
                    <span>${item.time}</span>
                </div></td>
                <td align="center">${item.jogos || 0}</td>
                <td align="center">${item.gols_pro || 0}</td>
                <td align="center">${item.gols_contra || 0}</td>
                <td align="center"><strong>${item.sg || 0}</strong></td>
                <td align="center" style="color:#00ff88;font-weight:bold;">${item.pontos || 0}</td>
            </tr>`;
    }).join('');
}

function abrirModalTime(time) {
    const m = document.getElementById('modal-time');
    if(!m) return;
    document.getElementById('modal-nome-time').innerText = time.time;
    document.getElementById('modal-escudo').src = time.escudo || ESCUDO_PADRAO;
    document.getElementById('modal-pos').innerText = (time.posicao || '0') + "º";
    document.getElementById('modal-pts').innerText = time.pontos || '0';
    document.getElementById('modal-gp').innerText = time.gols_pro || 0;
    document.getElementById('modal-gc').innerText = time.gols_contra || 0;
    document.getElementById('modal-sg').innerText = time.sg || 0;
    document.getElementById('modal-jogos').innerText = time.jogos || 0;
    m.style.display = 'flex';
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

// ==========================================
// LÓGICA DA ARENA
// ==========================================
function configurarArena() {
    const selects = ['liga-a', 'liga-b'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
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
        });
    });

    const btn = document.getElementById('btn-comparar');
    if(btn) {
        btn.onclick = () => {
            const tA = JSON.parse(document.getElementById('time-a').value || "{}");
            const tB = JSON.parse(document.getElementById('time-b').value || "{}");
            if (tA.time && tB.time) {
                document.getElementById('h2h-display').style.display = 'block';
                document.getElementById('name-a').innerText = tA.time;
                document.getElementById('name-b').innerText = tB.time;
                document.getElementById('img-a').src = tA.escudo || ESCUDO_PADRAO;
                document.getElementById('img-b').src = tB.escudo || ESCUDO_PADRAO;
                const total = (tA.pontos || 0) + (tB.pontos || 0) + 1;
                const pA = Math.round(((tA.pontos || 0) / total) * 100);
                document.getElementById('perc-a').innerText = pA + "%";
                document.getElementById('perc-b').innerText = (100 - pA) + "%";
                document.getElementById('bar-a').style.width = pA + "%";
                document.getElementById('bar-b').style.width = (100 - pA) + "%";
            }
        };
    }
}
