// --- CONFIGURAÇÃO NÚCLEO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const ESCUDO_PADRAO = "https://cdn-icons-png.flaticon.com/512/53/53244.png";

// NOTÍCIAS COM SEUS ARQUIVOS .WEBP
const noticiasCarrossel = [
    {
        id: 1,
        img: 'img/carrossel1.webp',
        categoria: 'Inteligência Neural',
        tit: 'O Futuro do Futebol é Orientado por Dados',
        desc: 'Nossa rede neural processa mais de 10.000 variáveis por segundo.',
        detalhes: 'Modelos de regressão avançados e histórico de performance em tempo real.'
    },
    {
        id: 2,
        img: 'img/carrossel2.webp',
        categoria: 'Arena H2H',
        tit: 'Duelos Lendários, Análises Exatas',
        desc: 'Compare gigantes europeus ou rivais locais com precisão.',
        detalhes: 'A ferramenta avalia saldo de gols e solidez defensiva.'
    },
    {
        id: 3,
        img: 'img/carrossel3.webp',
        categoria: 'Ao Vivo',
        tit: 'Estatísticas Refinadas em Tempo Real',
        desc: 'Live Feeds com gráficos de pressão e escalações.',
        detalhes: 'Redução de latência para atualizações em menos de 5 segundos.'
    },
    {
        id: 4, 
        img: 'img/carrosel4.webp',
        categoria: 'Novidade',
        tit:'Paulistão 2026 Ao Vivo', 
        desc:'Tabela, jogos e horários do Campeonato Paulista.',
        detalhes:'Acompanhe o campeonato mais tradicional do Brasil com cobertura completa.', 
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

// --- LÓGICA DO CARROSSEL ---
function inicializarHome() {
    const slidesContainer = document.getElementById('carousel-slides');
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

    let index = 0;
    setInterval(() => {
        index = (index + 1) % noticiasCarrossel.length;
        slidesContainer.style.transform = `translateX(-${index * 100}%)`;
    }, 6000);
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

// --- CLASSIFICAÇÃO (AQUI ESTÁ A CORREÇÃO DO GP/GC) ---
async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    if(!corpo) return;
    corpo.innerHTML = "<tr><td colspan='7' align='center'>Carregando Matrix...</td></tr>";

    const { data, error } = await _supabase.from('tabelas_ligas').select('*').eq('liga', liga).order('posicao');
    if (error || !data) return;

    corpo.innerHTML = data.map(item => {
        // Tenta pegar 'gols_pro' OU 'gp'. Tenta pegar 'gols_contra' OU 'gc'.
        const gp = item.gols_pro ?? item.gp ?? 0;
        const gc = item.gols_contra ?? item.gc ?? 0;
        const sg = item.sg ?? (gp - gc);
        
        const d = JSON.stringify(item).replace(/'/g, "&apos;");
        
        return `
            <tr onclick='abrirModalTime(${d})' style="cursor:pointer;">
                <td>${item.posicao}º</td>
                <td><div style="display:flex;align-items:center;gap:10px;">
                    <img src="${item.escudo || ESCUDO_PADRAO}" width="24" height="24">
                    <span>${item.time}</span>
                </div></td>
                <td align="center">${item.jogos || 0}</td>
                <td align="center">${gp}</td>
                <td align="center">${gc}</td>
                <td align="center"><strong>${sg}</strong></td>
                <td align="center" style="color:#00ff88;font-weight:bold;">${item.pontos || 0}</td>
            </tr>`;
    }).join('');
}

function abrirModalTime(time) {
    const m = document.getElementById('modal-time');
    if(!m) return;
    
    // Mapeamento seguro para o Modal também
    const gp = time.gols_pro ?? time.gp ?? 0;
    const gc = time.gols_contra ?? time.gc ?? 0;

    document.getElementById('modal-nome-time').innerText = time.time;
    document.getElementById('modal-escudo').src = time.escudo || ESCUDO_PADRAO;
    document.getElementById('modal-pos').innerText = (time.posicao || '0') + "º";
    document.getElementById('modal-pts').innerText = time.pontos || '0';
    document.getElementById('modal-gp').innerText = gp;
    document.getElementById('modal-gc').innerText = gc;
    document.getElementById('modal-sg').innerText = time.sg ?? (gp - gc);
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

function configurarArena() {
    // Lógica Arena simplificada para manter o foco no GP/GC
    const btn = document.getElementById('btn-comparar');
    if(btn) {
        btn.onclick = () => { /* sua lógica de comparação */ };
    }
}

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
