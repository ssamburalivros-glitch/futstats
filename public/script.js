// --- CONFIGURAÇÃO DO NÚCLEO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const ESCUDO_PADRAO = "https://cdn-icons-png.flaticon.com/512/53/53244.png";

// RESTAURANDO SEUS CAMINHOS DE IMAGEM ORIGINAIS:
const noticiasCarrossel = [
    {
        id: 1,
        img: 'img/carrossel1.webp', // Mantido original
        categoria: 'Inteligência Neural',
        titulo: 'O Futuro do Futebol é Orientado por Dados',
        descricao: 'Nossa rede neural processa mais de 10.000 variáveis por segundo para entregar a você a probabilidade real de vitória.',
        detalhes: 'O algoritmo FutStats utiliza modelos de regressão avançados e histórico de performance em tempo real.'
    },
    {
        id: 2,
        img: 'img/carrossel2.webp', // Mantido original
        categoria: 'Arena H2H',
        titulo: 'Duelos Lendários, Análises Exatas',
        descricao: 'Compare gigantes europeus ou rivais locais com a mesma precisão. A Arena H2H coloca frente a frente os números.',
        detalhes: 'A ferramenta de comparação direta avalia saldo de gols, eficiência ofensiva e solidez defensiva.'
    },
    {
        id: 3,
        img: 'img/carrossel3.webp', // Mantido original
        categoria: 'Ao Vivo',
        titulo: 'Acompanhe o Tempo Real com Estatísticas Refinadas',
        descricao: 'Nossos Live Feeds agora mostram gráficos de pressão e escalações oficiais mais rápido.',
        detalhes: 'Integramos uma nova fonte de dados que reduz a latência das atualizações de gol para menos de 5 segundos.'
    },
    {
        id: 4, 
        img: 'img/carrosel4.webp', // Mantido original (com o erro de digitação 'carrosel' que estava no seu)
        categoria: 'Novidade',
        titulo:'Paulistão 2026 Acompanhamento Ao Vivo', 
        descricao:'Tabela, jogos e horários do Campeonato Paulista 2026',
        detalhes:'O Campeonato Paulista de Futebol é a liga mais antiga do Brasil. Acompanhe seu Time.', 
    }
];

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    carregarIA();
    const ehHome = document.getElementById('home-page');
    const ehClassificacao = document.getElementById('tabela-corpo');

    if (ehHome) inicializarCarrossel();
    if (ehClassificacao) {
        carregarTabela('BR');
        configurarFiltrosLigas();
        inicializarPesquisa();
    }
});

// --- CARROSSEL (Lógica Original com seus nomes de arquivos) ---
function inicializarCarrossel() {
    const slidesContainer = document.querySelector('.carousel-slides');
    const dotsContainer = document.querySelector('.carousel-dots');
    if (!slidesContainer) return;

    slidesContainer.innerHTML = noticiasCarrossel.map((noticia, index) => `
        <div class="slide ${index === 0 ? 'active' : ''}">
            <img src="${noticia.img}" alt="${noticia.titulo}">
            <div class="slide-overlay">
                <span class="news-category">${noticia.categoria}</span>
                <h2 class="news-title">${noticia.titulo}</h2>
                <p class="news-description">${noticia.descricao}</p>
                <button class="btn-saiba-mais" onclick="mostrarDetalhesNoticia(${noticia.id})">SAIBA MAIS</button>
            </div>
        </div>
    `).join('');

    if (dotsContainer) {
        dotsContainer.innerHTML = noticiasCarrossel.map((_, i) => `
            <span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>
        `).join('');
    }

    let currentSlide = 0;
    setInterval(() => {
        currentSlide = (currentSlide + 1) % noticiasCarrossel.length;
        slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
    }, 6000);
}
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
