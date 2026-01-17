// --- CONFIGURAÇÃO NÚCLEO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const ESCUDO_PADRAO = "https://cdn-icons-png.flaticon.com/512/53/53244.png";

// SEU BANCO DE NOTÍCIAS ORIGINAL (COM CAMINHOS CORRETOS)
const noticiasCarrossel = [
    {
        id: 1,
        img: 'img/carrossel1.webp',
        categoria: 'Inteligência Neural',
        tit: 'O Futuro do Futebol é Orientado por Dados',
        desc: 'Nossa rede neural processa mais de 10.000 variáveis por segundo.',
        detalhes: 'O algoritmo FutStats utiliza modelos de regressão avançados e histórico de performance em tempo real.'
    },
    {
        id: 2,
        img: 'img/carrossel2.webp',
        categoria: 'Arena H2H',
        tit: 'Duelos Lendários, Análises Exatas',
        desc: 'Compare gigantes europeus ou rivais locais com a mesma precisão.',
        detalhes: 'A ferramenta de comparação direta avalia saldo de gols e solidez defensiva.'
    },
    {
        id: 3,
        img: 'img/carrossel3.webp',
        categoria: 'Ao Vivo',
        tit: 'Estatísticas Refinadas em Tempo Real',
        desc: 'Acompanhe os Live Feeds com gráficos de pressão e escalações.',
        detalhes: 'Integramos uma nova fonte de dados que reduz a latência das atualizações.'
    }
];

document.addEventListener('DOMContentLoaded', () => {
    const ehIndex = document.getElementById('carousel-slides');
    const ehClassificacao = document.getElementById('tabela-corpo');
    const ehArena = document.getElementById('liga-a');

    if (ehIndex) inicializarHome();
    if (ehClassificacao) {
        carregarTabela('BR');
        configurarFiltrosLigas();
    }
    if (ehArena) configurarArena();
});

// ==========================================
// LÓGICA DA HOME (CARROSSEL COM SAIBA MAIS)
// ==========================================
function inicializarHome() {
    const slidesContainer = document.getElementById('carousel-slides');
    const dotsContainer = document.getElementById('carousel-dots');
    if(!slidesContainer) return;

    // Gerar Slides com Botão Saiba Mais
    slidesContainer.innerHTML = noticiasCarrossel.map((n, index) => `
        <div class="slide ${index === 0 ? 'active' : ''}">
            <img src="${n.img}" onerror="this.src='https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1000'">
            <div class="slide-caption">
                <span class="news-category">${n.categoria}</span>
                <h2>${n.tit}</h2>
                <p>${n.desc}</p>
                <button class="btn-saiba-mais" onclick="mostrarDetalhesNoticia(${n.id})">SAIBA MAIS</button>
            </div>
        </div>
    `).join('');

    // Gerar Dots
    if(dotsContainer) {
        dotsContainer.innerHTML = noticiasCarrossel.map((_, i) => `
            <span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>
        `).join('');
    }

    let index = 0;
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');

    const mover = () => {
        index = (index + 1) % noticiasCarrossel.length;
        slidesContainer.style.transform = `translateX(-${index * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle('active', i === index));
    };
    
    setInterval(mover, 6000);

    // Insights de IA
    const insights = ["Palmeiras 87% eficiência", "Flamengo vigor físico 70'", "Média gols subiu 12%"];
    const output = document.getElementById('ia-output');
    if(output) output.innerText = insights[Math.floor(Math.random() * insights.length)];
}

function mostrarDetalhesNoticia(id) {
    const noticia = noticiasCarrossel.find(n => n.id === id);
    const painel = document.getElementById('news-details-panel');
    if (noticia && painel) {
        document.getElementById('details-title').innerText = noticia.tit;
        document.getElementById('details-content').innerText = noticia.detalhes;
        painel.style.display = 'block';
        painel.scrollIntoView({ behavior: 'smooth' });
    }
}

// ==========================================
// CLASSIFICAÇÃO E ARENA (MANTIDOS)
// ==========================================
async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    if(!corpo) return;
    const { data } = await _supabase.from('tabelas_ligas').select('*').eq('liga', liga).order('posicao');
    if (!data) return;

    corpo.innerHTML = data.map(item => `
        <tr onclick='abrirModalTime(${JSON.stringify(item).replace(/'/g, "&apos;")})' style="cursor:pointer;">
            <td>${item.posicao}º</td>
            <td><div style="display:flex;align-items:center;gap:10px;">
                <img src="${item.escudo || ESCUDO_PADRAO}" width="24">
                <span>${item.time}</span>
            </div></td>
            <td align="center">${item.jogos || 0}</td>
            <td align="center">${item.gols_pro || 0}</td>
            <td align="center">${item.gols_contra || 0}</td>
            <td align="center"><strong>${item.sg || 0}</strong></td>
            <td align="center" style="color:#00ff88;font-weight:bold;">${item.pontos || 0}</td>
        </tr>`).join('');
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

function configurarArena() {
    // Lógica Arena H2H (conforme seu script anterior)
    const btn = document.getElementById('btn-comparar');
    if(btn) {
        btn.onclick = () => {
            // ... lógica de comparação ...
            console.log("Comparando...");
        };
    }
}
