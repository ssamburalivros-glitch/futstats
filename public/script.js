// --- CONFIGURAÇÃO NÚCLEO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const ESCUDO_PADRAO = "https://cdn-icons-png.flaticon.com/512/53/53244.png";

// SEU BANCO DE NOTÍCIAS (Com as imagens originais e textos do Saiba Mais)
const noticiasCarrossel = [
    {
        id: 1,
        img: 'img/carrossel1.webp',
        categoria: 'Inteligência Neural',
        tit: 'O Futuro do Futebol é Orientado por Dados',
        desc: 'Nossa rede neural processa mais de 10.000 variáveis por segundo.',
        detalhes: 'O algoritmo FutStats utiliza modelos de regressão avançados e histórico de performance em tempo real. Analisamos desde a umidade do ar até o desgaste físico dos atletas para prever o domínio de campo.'
    },
    {
        id: 2,
        img: 'img/carrossel2.webp',
        categoria: 'Arena H2H',
        tit: 'Duelos Lendários, Análises Exatas',
        desc: 'Compare gigantes europeus ou rivais locais com a mesma precisão.',
        detalhes: 'A ferramenta de comparação direta avalia saldo de gols, eficiência ofensiva e solidez defensiva nos últimos jogos. O índice de confiança FutStats ajuda você a identificar padrões ocultos.'
    },
    {
        id: 3,
        img: 'img/carrossel3.webp',
        categoria: 'Ao Vivo',
        tit: 'Estatísticas Refinadas em Tempo Real',
        desc: 'Acompanhe os Live Feeds com gráficos de pressão e escalações.',
        detalhes: 'Integramos uma nova fonte de dados que reduz a latência das atualizações de gol para menos de 5 segundos. Agora você verá o gráfico de Momento de Pressão (xT).'
    },
    {
        id: 4, 
        img: 'img/carrosel4.webp',
        categoria: 'Novidade',
        tit:'Paulistão 2026 Acompanhamento Ao Vivo', 
        desc:'Tabela, jogos e horários do Campeonato Paulista 2026',
        detalhes:'Acompanhe o campeonato mais tradicional do Brasil com cobertura completa. Dados em tempo real de todos os jogos da rodada.', 
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
        const btnClose = document.querySelector('.close-modal-btn');
        if(btnClose) btnClose.onclick = fecharModalTime;
    }

    if (ehArena) configurarArena();
});

// ==========================================
// LÓGICA DA HOME (CARROSSEL)
// ==========================================
function inicializarHome() {
    const slidesContainer = document.getElementById('carousel-slides');
    const dotsContainer = document.getElementById('carousel-dots');
    if(!slidesContainer) return;

    slidesContainer.innerHTML = noticiasCarrossel.map((n, index) => `
        <div class="slide ${index === 0 ? 'active' : ''}">
            <img src="${n.img}" onerror="this.src='https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1000'">
            <div class="slide-overlay">
                <span class="news-category">${n.categoria}</span>
                <h2>${n.tit}</h2>
                <p>${n.desc}</p>
                <button class="btn-saiba-mais" onclick="mostrarDetalhesNoticia(${n.id})">SAIBA MAIS</button>
            </div>
        </div>
    `).join('');

    if(dotsContainer) {
        dotsContainer.innerHTML = noticiasCarrossel.map((_, i) => `
            <span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>
        `).join('');
    }

    let index = 0;
    setInterval(() => {
        index = (index + 1) % noticiasCarrossel.length;
        slidesContainer.style.transform = `translateX(-${index * 100}%)`;
        const dots = document.querySelectorAll('.dot');
        dots.forEach((d, i) => d.classList.toggle('active', i === index));
    }, 6000);

    // Insight IA Aleatório
    const output = document.getElementById('ia-output');
    if(output) output.innerText = "IA: Palmeiras tem 87% de eficiência em passes curtos nesta temporada.";
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
// LÓGICA DA CLASSIFICAÇÃO (GP, GC, SG RESTAURADOS)
// ==========================================
async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    if(!corpo) return;
    corpo.innerHTML = "<tr><td colspan='7' align='center'>Sincronizando com Servidores...</td></tr>";

    try {
        const { data, error } = await _supabase.from('tabelas_ligas').select('*').eq('liga', liga).order('posicao');
        if (error) throw error;

        corpo.innerHTML = data.map(item => {
            const d = JSON.stringify(item).replace(/'/g, "&apos;");
            return `
                <tr onclick='abrirModalTime(${d})' style="cursor:pointer;">
                    <td>${item.posicao}º</td>
                    <td><div style="display:flex;align-items:center;gap:10px;">
                        <img src="${item.escudo || ESCUDO_PADRAO}" width="22" height="22">
                        <span>${item.time}</span>
                    </div></td>
                    <td align="center">${item.jogos || 0}</td>
                    <td align="center">${item.gols_pro || 0}</td>
                    <td align="center">${item.gols_contra || 0}</td>
                    <td align="center"><strong>${item.sg || 0}</strong></td>
                    <td align="center" style="color:#00ff88;font-weight:bold;">${item.pontos || 0}</td>
                </tr>`;
        }).join('');
    } catch (e) { console.error(e); }
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

function fecharModalTime() {
    document.getElementById('modal-time').style.display = 'none';
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
            const valA = document.getElementById('time-a').value;
            const valB = document.getElementById('time-b').value;
            if (valA && valB) {
                const tA = JSON.parse(valA);
                const tB = JSON.parse(valB);
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
