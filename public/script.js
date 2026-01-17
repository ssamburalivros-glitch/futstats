// --- CONFIGURAÇÃO DO NÚCLEO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_PADRAO = "https://cdn-icons-png.flaticon.com/512/53/53244.png";

// Dados do Carrossel
const noticiasCarrossel = [
    {
        id: 1,
        img: 'img/carrossel1.webp',
        categoria: 'Inteligência Neural',
        titulo: 'O Futuro do Futebol é Orientado por Dados',
        descricao: 'Nossa rede neural processa mais de 10.000 variáveis por segundo.',
        detalhes: 'O algoritmo FutStats utiliza modelos de regressão avançados e histórico de performance.'
    },
    {
        id: 2,
        img: 'img/carrossel2.webp',
        categoria: 'Arena H2H',
        titulo: 'Duelos Lendários, Análises Exatas',
        descricao: 'Compare gigantes europeus ou rivais locais com a mesma precisão.',
        detalhes: 'A ferramenta avalia saldo de gols, eficiência ofensiva e solidez defensiva.'
    },
    {
        id: 3,
        img: 'img/carrossel3.webp',
        categoria: 'Ao Vivo',
        titulo: 'Tempo Real com Estatísticas Refinadas',
        descricao: 'Live Feeds agora mostram gráficos de pressão mais rápido.',
        detalhes: 'Integramos uma nova fonte de dados que reduz a latência das atualizações.'
    },
    {
        id: 4, 
        img:'img/carrosel4.webp',
        categoria: 'Novidade',
        titulo:'Paulistão 2026 Ao Vivo', 
        descricao:'Tabela, jogos e horários do Campeonato Paulista 2026',
        detalhe:'Acompanhe a liga mais antiga do Brasil com cobertura completa FutStats.', 
    }
];

// --- INICIALIZAÇÃO SEGURA ---
document.addEventListener('DOMContentLoaded', () => {
    carregarIA();
    
    const ehHome = document.getElementById('home-page');
    const ehClassificacao = document.getElementById('tabela-corpo');
    const ehArena = document.getElementById('liga-a');
    const ehAoVivo = document.getElementById('lista-ao-vivo');

    if (ehHome) inicializarCarrossel();
    
    if (ehClassificacao) {
        carregarTabela('BR');
        configurarFiltrosLigas();
        inicializarPesquisa();
    }

    if (ehArena) configurarH2H();
    
    if (ehAoVivo) carregarAoVivo();

    // Listeners Globais para Fechar Modais
    document.querySelectorAll('.close-modal-btn').forEach(btn => btn.onclick = fecharModalTime);
    
    const closeBtnLive = document.querySelector('.close-modal-live');
    if (closeBtnLive) closeBtnLive.onclick = fecharModalLive;

    window.onclick = (e) => {
        const modalTime = document.getElementById('modal-time');
        const modalLive = document.getElementById('modal-live');
        if (e.target === modalTime) fecharModalTime();
        if (e.target === modalLive) fecharModalLive();
    };
});

// --- COMENTÁRIO DA IA ---
async function carregarIA() {
    const output = document.getElementById('ia-output');
    if (!output) return;
    try {
        const { data, error } = await _supabase.from('site_info').select('comentario_ia').eq('id', 1).single();
        if (data) output.innerText = data.comentario_ia;
    } catch (e) { console.error("Erro IA:", e); }
}
setInterval(carregarIA, 60000);

// --- CLASSIFICAÇÃO (TABELA NEURAL) ---
async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    if (!corpo) return;
    
    corpo.innerHTML = "<tr><td colspan='7' align='center'>Sincronizando dados neurais...</td></tr>";

    try {
        const { data, error } = await _supabase.from('tabelas_ligas').select('*').eq('liga', liga).order('posicao');
        if (error) throw error;

        corpo.innerHTML = data.map(item => {
            // Prepara o objeto para ser passado como string para a função de clique
            const dadosTime = JSON.stringify(item).replace(/'/g, "&apos;");
            return `
                <tr class="row-interativa" onclick='abrirModalTime(${dadosTime})'>
                    <td>${item.posicao}º</td>
                    <td>
                        <div class="team-clickable">
                            <img src="${item.escudo || ESCUDO_PADRAO}" class="team-cell-img" onerror="this.src='${ESCUDO_PADRAO}'">
                            <span>${item.time}</span>
                        </div>
                    </td>
                    <td align="center">${item.jogos}</td>
                    <td align="center" style="color:#777;">${item.gols_pro || 0}</td>
                    <td align="center" style="color:#777;">${item.gols_contra || 0}</td>
                    <td align="center" style="font-weight:600;">${item.sg || 0}</td>
                    <td align="center" style="color:#fff; font-weight:bold;">${item.pontos}</td>
                </tr>
            `;
        }).join('');
    } catch (e) { 
        console.error(e); 
        corpo.innerHTML = "<tr><td colspan='7' align='center' style='color:red'>Erro na rede neural.</td></tr>"; 
    }
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

// --- MODAL DE TIME (DETALHES ESTILO PAULISTÃO) ---
function abrirModalTime(time) {
    const modal = document.getElementById('modal-time');
    if (!modal) return;

    // Identidade do Time
    document.getElementById('modal-nome-time').innerText = time.time;
    document.getElementById('modal-escudo').src = time.escudo || ESCUDO_PADRAO;
    document.getElementById('modal-liga-badge').innerText = time.liga || "LIGA";

    // Stats Principais (Cards de Cima)
    document.getElementById('modal-pos').innerText = (time.posicao || '0') + "º";
    document.getElementById('modal-pts').innerText = time.pontos || '0';

    // Desempenho V-E-D (Badges Coloridas)
    document.getElementById('modal-v').innerText = time.vitorias || 0;
    document.getElementById('modal-e').innerText = time.empates || 0;
    document.getElementById('modal-d').innerText = time.derrotas || 0;

    // Grid de Gols (Gols Pró, Contra e Saldo)
    document.getElementById('modal-gp').innerText = time.gols_pro || 0;
    document.getElementById('modal-gc').innerText = time.gols_contra || 0;
    document.getElementById('modal-sg').innerText = time.sg || 0;

    // Footer
    document.getElementById('modal-jogos').innerText = time.jogos || 0;

    modal.style.display = 'flex';
}

function fecharModalTime() {
    const modal = document.getElementById('modal-time');
    if (modal) modal.style.display = 'none';
}

// --- ARENA H2H ---
function configurarH2H() {
    ['liga-a', 'liga-b'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', async function() {
                const lado = id.split('-')[1];
                const selectTime = document.getElementById(`time-${lado}`);
                selectTime.disabled = true;
                selectTime.innerHTML = '<option value="">Carregando...</option>';

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
        }
    });

    const timeA = document.getElementById('time-a');
    const timeB = document.getElementById('time-b');
    if (timeA && timeB) {
        const updateArena = () => {
            if (timeA.value && timeB.value) processarDuelo(JSON.parse(timeA.value), JSON.parse(timeB.value));
        };
        timeA.addEventListener('change', updateArena);
        timeB.addEventListener('change', updateArena);
    }
}

function processarDuelo(a, b) {
    const display = document.getElementById('h2h-display');
    if (!display) return;
    display.style.display = 'block';

    document.getElementById('img-a').src = a.escudo || ESCUDO_PADRAO;
    document.getElementById('img-b').src = b.escudo || ESCUDO_PADRAO;
    document.getElementById('name-a').innerText = a.time;
    document.getElementById('name-b').innerText = b.time;

    document.getElementById('pts-a').innerText = a.pontos || 0;
    document.getElementById('pts-b').innerText = b.pontos || 0;
    document.getElementById('sg-a').innerText = a.sg || 0;
    document.getElementById('sg-b').innerText = b.sg || 0;

    const pA = (a.pontos * 0.5) + ((a.sg || 0) * 0.5) + 10;
    const pB = (b.pontos * 0.5) + ((b.sg || 0) * 0.5) + 10;
    const winA = Math.round((pA / (pA + pB)) * 100);
    const winB = 100 - winA;

    document.getElementById('bar-a').style.width = `${winA}%`;
    document.getElementById('bar-b').style.width = `${winB}%`;
    document.getElementById('perc-a').innerText = `${winA}%`;
    document.getElementById('perc-b').innerText = `${winB}%`;
}

// --- CARROSSEL HOME ---
function inicializarCarrossel() {
    const slidesContainer = document.querySelector('.carousel-slides');
    const dotsContainer = document.querySelector('.carousel-dots');
    if (!slidesContainer) return;

    slidesContainer.innerHTML = noticiasCarrossel.map((noticia, index) => `
        <div class="slide ${index === 0 ? 'active' : ''}">
            <img src="${noticia.img}">
            <div class="slide-overlay">
                <span class="news-category">${noticia.categoria}</span>
                <h2 class="news-title">${noticia.titulo}</h2>
                <p class="news-description">${noticia.descricao}</p>
                <button class="btn-saiba-mais" onclick="mostrarDetalhesNoticia(${noticia.id})">SAIBA MAIS</button>
            </div>
        </div>
    `).join('');

    dotsContainer.innerHTML = noticiasCarrossel.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('');

    let currentSlide = 0;
    const updateSlide = () => {
        slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
        document.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
    };

    document.getElementById('next-slide').onclick = () => { currentSlide = (currentSlide + 1) % noticiasCarrossel.length; updateSlide(); };
    document.getElementById('prev-slide').onclick = () => { currentSlide = (currentSlide - 1 + noticiasCarrossel.length) % noticiasCarrossel.length; updateSlide(); };
    
    setInterval(() => { currentSlide = (currentSlide + 1) % noticiasCarrossel.length; updateSlide(); }, 6000);
}

// --- AO VIVO ---
async function carregarAoVivo() {
    const container = document.getElementById('lista-ao-vivo');
    if (!container) return;
    try {
        const { data, error } = await _supabase.from('jogos_ao_vivo').select('*');
        if (!data || data.length === 0) {
            container.innerHTML = "<p>Nenhum jogo ao vivo agora.</p>";
            return;
        }
        container.innerHTML = data.map(jogo => `
            <div class="card-hero row-interativa" onclick="abrirDetalhesAoVivo('${jogo.id}', '${jogo.time_casa}', '${jogo.time_fora}')">
                <div class="status-tag"><span class="pulse-dot"></span> LIVE</div>
                <div class="live-score-row">
                    <span>${jogo.time_casa}</span>
                    <div class="score-box-live">${jogo.placar || "0-0"}</div>
                    <span>${jogo.time_fora}</span>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}

function fecharModalLive() { 
    const modal = document.getElementById('modal-live');
    if (modal) modal.style.display = 'none'; 
}
