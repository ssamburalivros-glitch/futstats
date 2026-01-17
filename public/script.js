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

// --- CLASSIFICAÇÃO (Ajustado para GP/GC que você pediu) ---
async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    if (!corpo) return;
    corpo.innerHTML = "<tr><td colspan='7' align='center'>Sincronizando...</td></tr>";

    try {
        const { data, error } = await _supabase.from('tabelas_ligas').select('*').eq('liga', liga).order('posicao');
        if (error) throw error;

        corpo.innerHTML = data.map(item => {
            const dadosTime = JSON.stringify(item).replace(/'/g, "&apos;");
            return `
                <tr class="row-interativa" onclick='abrirModalTime(${dadosTime})'>
                    <td>${item.posicao}º</td>
                    <td>
                        <div class="team-clickable">
                            <img src="${item.escudo || ESCUDO_PADRAO}" class="team-cell-img" width="20">
                            <span>${item.time}</span>
                        </div>
                    </td>
                    <td align="center">${item.jogos}</td>
                    <td align="center">${item.gols_pro || 0}</td>
                    <td align="center">${item.gols_contra || 0}</td>
                    <td align="center">${item.sg || 0}</td>
                    <td align="center" style="color:#00ff88; font-weight:bold;">${item.pontos}</td>
                </tr>
            `;
        }).join('');
    } catch (e) { console.error(e); }
}

function mostrarDetalhesNoticia(idNoticia) {
    const panel = document.getElementById('news-details-panel');
    const noticia = noticiasCarrossel.find(n => n.id === idNoticia);
    if (!noticia || !panel) return;
    document.getElementById('details-title').innerText = noticia.titulo;
    document.getElementById('details-content').innerHTML = noticia.detalhes;
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth' });
}

// Funções Auxiliares mantidas do seu original
function fecharModalTime() { document.getElementById('modal-time').style.display = 'none'; }
function configurarFiltrosLigas() {
    document.querySelectorAll('.league-btn').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('.league-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            carregarTabela(this.dataset.liga);
        };
    });
}
async function carregarIA() {
    const output = document.getElementById('ia-output');
    if (!output) return;
    const { data } = await _supabase.from('site_info').select('comentario_ia').eq('id', 1).single();
    if (data) output.innerText = data.comentario_ia;
}
