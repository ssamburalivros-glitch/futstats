// --- CONFIGURAÇÃO DO NÚCLEO ---
const SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ESCUDO_PADRAO = "https://cdn-icons-png.flaticon.com/512/53/53244.png";

// Dados Provisórios para o Carrossel (Substitua pelos seus dados)
const noticiasCarrossel = [
    {
        id: 1,
        img: 'img/carrossel1.webp',
        categoria: 'Inteligência Neural',
        titulo: 'O Futuro do Futebol é Orientado por Dados',
        descricao: 'Nossa rede neural processa mais de 10.000 variáveis por segundo para entregar a você a probabilidade real de vitória. Esqueça o palpite, utilize a ciência ao seu favor nesta rodada.',
        detalhes: 'O algoritmo FutStats utiliza modelos de regressão avançados e histórico de performance em tempo real. Analisamos desde a umidade do ar até o desgaste físico dos atletas para prever o domínio de campo.'
    },
    {
        id: 2,
        img: 'img/carrossel2.webp',
        categoria: 'Arena H2H',
        titulo: 'Duelos Lendários, Análises Exatas',
        descricao: 'Compare gigantes europeus ou rivais locais com a mesma precisão. A Arena H2H coloca frente a frente os números que definem quem realmente chega como favorito ao apito inicial.',
        detalhes: 'A ferramenta de comparação direta avalia saldo de gols, eficiência ofensiva e solidez defensiva nos últimos jogos. O índice de confiança FutStats ajuda você a identificar padrões que passam despercebidos aos olhos comuns.'
    },
    {
        id: 3,
        img: 'img/carrossel3.webp',
        categoria: 'Ao Vivo',
        titulo: 'Acompanhe o Tempo Real com Estatísticas Refinadas',
        descricao: 'Nossos Live Feeds agora mostram gráficos de pressão e escalações oficiais mais rápido. Não perca nenhum detalhe do jogo.',
        detalhes: 'Informações sobre as novas features do modo Ao Vivo. Integramos uma nova fonte de dados que reduz a latência das atualizações de gol para menos de 5 segundos. Agora, ao clicar em um jogo ao vivo, você verá um gráfico de "Momento de Pressão" (xT), indicando qual time está mais próximo de marcar. As escalações oficiais são atualizadas assim que confirmadas pelos clubes.'
    },
	{
		id: 4, 
		img:'img/carrosel4.webp',
		categoria: 'Novidade',
		titulo:'Paulistão 2026 Acompanhamento Ao Vivo', 
		descricao:'Tabela, jogos e horários do Campeonato Paulista 2026',
		detalhe:'O Campeonato Paulista de Futebol, mais conhecido como Campeonato Paulista ou ainda Paulistão,Organizada pela Federação Paulista de Futebol desde 1941, é a liga de futebol mais antiga do Brasil. Acompanhe seu Time', 
	},

];

// --- INICIALIZAÇÃO SEGURA ---
document.addEventListener('DOMContentLoaded', () => {
	carregarIA();
    // Identifica em qual página estamos
    const ehHome = document.getElementById('home-page');
    const ehClassificacao = document.getElementById('tabela-corpo');
    const ehArena = document.getElementById('liga-a');
    const ehAoVivo = document.getElementById('lista-ao-vivo');

    // Marca link ativo no menu
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach(link => {
        if (link.getAttribute('href') === currentPath.substring(currentPath.lastIndexOf('/') + 1) || (currentPath === '/' && link.getAttribute('href') === 'index.html')) {
            link.classList.add('active');
        }
    });

    // Inicializações Específicas de Página
    if (ehHome) {
        inicializarCarrossel();
    }

    if (ehClassificacao) {
        carregarTabela('BR');
        configurarFiltrosLigas();
        inicializarPesquisa(); // Nova barra de pesquisa
    }

    if (ehArena) {
        configurarH2H();
    }

    if (ehAoVivo) {
        carregarAoVivo();
    }

    // Listener global para fechar modal (Teams e Live)
    const closeBtn = document.querySelector('.close-modal-btn');
    if (closeBtn) closeBtn.onclick = fecharModalTime;
    
    const closeBtnLive = document.querySelector('.close-modal-live');
    if (closeBtnLive) closeBtnLive.onclick = fecharModalLive;

    window.onclick = (e) => {
        const modal = document.getElementById('modal-time');
        const modalLive = document.getElementById('modal-live');
        if (e.target == modal) fecharModalTime();
        if (e.target == modalLive) fecharModalLive();
    };
});

async function carregarIA() {
    const output = document.getElementById('ia-output'); // Ajustado para o novo ID do HTML
    if (!output) return;

    try {
        const { data, error } = await _supabase
            .from('site_info')
            .select('comentario_ia')
            .eq('id', 1)
            .single();

        if (error) throw error;

        if (data && data.comentario_ia) {
            output.innerText = data.comentario_ia;
            console.log("IA carregada com sucesso");
        }
    } catch (e) { 
        console.error("Erro ao carregar IA:", e);
        output.innerText = "IA: Sincronizando dados neurais...";
    }
}
// Faz a IA se atualizar sozinha a cada 60 segundos
setInterval(carregarIA, 60000);

// --- 1. FUNÇÕES DO CARROSSEL (HOME) ---
function inicializarCarrossel() {
    const slidesContainer = document.querySelector('.carousel-slides');
    const dotsContainer = document.querySelector('.carousel-dots');
    if (!slidesContainer) return;

    // 1. GERAR TODOS OS SLIDES (Imagens + Textos)
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

    // 2. GERAR AS BOLINHAS (DOTS)
    dotsContainer.innerHTML = noticiasCarrossel.map((_, i) => `
        <span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>
    `).join('');

    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');

    function updateSlide() {
        // Move o carrossel lateralmente
        slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
        
        // Atualiza as bolinhas
        dots.forEach(dot => dot.classList.remove('active'));
        dots[currentSlide].classList.add('active');
        
        // Ativa a animação de texto apenas no slide atual
        slides.forEach(s => s.classList.remove('active'));
        slides[currentSlide].classList.add('active');
    }

    // Botões de navegação
    document.getElementById('next-slide').onclick = () => {
        currentSlide = (currentSlide + 1) % noticiasCarrossel.length;
        updateSlide();
    };

    document.getElementById('prev-slide').onclick = () => {
        currentSlide = (currentSlide - 1 + noticiasCarrossel.length) % noticiasCarrossel.length;
        updateSlide();
    };

    // Clique nas bolinhas
    dots.forEach(dot => {
        dot.onclick = (e) => {
            currentSlide = parseInt(e.target.dataset.index);
            updateSlide();
        };
    });

    // Auto-play a cada 6 segundos
    setInterval(() => {
        currentSlide = (currentSlide + 1) % noticiasCarrossel.length;
        updateSlide();
    }, 6000);
}

// Mostrar detalhes da notícia ao clicar (Req 8)
function mostrarDetalhesNoticia(idNoticia) {
    const panel = document.getElementById('news-details-panel');
    const noticia = noticiasCarrossel.find(n => n.id === idNoticia);
    if (!noticia || !panel) return;

    document.getElementById('details-title').innerText = noticia.titulo;
    document.getElementById('details-content').innerHTML = noticia.detalhes;
    
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth' });

    // Pausa o carrossel (necessitaria melhoria para gerenciar o estado, mas por hora para o autoplay)
    //clearInterval(interval); 
}

// --- 2. BARRA DE PESQUISA (CLASSIFICAÇÃO) ---
function inicializarPesquisa() {
    const input = document.getElementById('search-team');
    const tabelaCorpo = document.getElementById('tabela-corpo');
    if (!input || !tabelaCorpo) return;

    input.addEventListener('input', function() {
        const termo = this.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Normaliza acentos
        const linhas = tabelaCorpo.getElementsByTagName('tr');

        for (let i = 0; i < linhas.length; i++) {
            // O nome do time está no segundo <td> (index 1), dentro de span
            const nomeTime = linhas[i].getElementsByTagName('td')[1].querySelector('span').innerText;
            const nomeNormalizado = nomeTime.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            if (nomeNormalizado.includes(termo)) {
                linhas[i].style.display = "";
            } else {
                linhas[i].style.display = "none";
            }
        }
    });
}

// --- FUNÇÕES CLASSIFICAÇÃO (Adaptado Neutro) ---
async function carregarTabela(liga) {
    const corpo = document.getElementById('tabela-corpo');
    if (!corpo) return;
    
    corpo.innerHTML = "<tr><td colspan='4' align='center' style='color:var(--text-dim)'>Carregando tabela...</td></tr>";

    try {
        const { data, error } = await _supabase.from('tabelas_ligas').select('*').eq('liga', liga).order('posicao');
        if (error) throw error;

        if (!data || data.length === 0) {
            corpo.innerHTML = "<tr><td colspan='4' align='center'>Dados não disponíveis.</td></tr>";
            return;
        }

        corpo.innerHTML = data.map(item => {
            const dadosTime = JSON.stringify(item).replace(/'/g, "&apos;");
            return `
                <tr class="row-interativa" onclick='abrirModalTime(${dadosTime})'>
                    <td>${item.posicao}º</td>
                    <td>
                        <div class="team-clickable">
                            <img src="${item.escudo || ESCUDO_PADRAO}" class="team-cell-img" onerror="this.src='${ESCUDO_PADRAO}'" alt="escudo">
                            <span>${item.time}</span>
                        </div>
                    </td>
                    <td align="center">${item.jogos}</td>
                    <td align="center" style="color:#fff; font-weight:bold;">${item.pontos}</td>
                </tr>
            `;
        }).join('');
    } catch (e) { console.error(e); corpo.innerHTML = "<tr><td colspan='4' align='center' style='color:red'>Erro ao carregar.</td></tr>"; }
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

// --- FUNÇÕES AO VIVO (Grid Neutro) ---
async function carregarAoVivo() {
    const container = document.getElementById('lista-ao-vivo');
    if (!container) return;
    container.innerHTML = "<p class='status-msg'>BUSCANDO JOGOS AO VIVO...</p>";

    try {
        const { data, error } = await _supabase.from('jogos_ao_vivo').select('*');
        if (error) return;

        if (!data || data.length === 0) {
            container.innerHTML = "<div style='grid-column: 1/-1; text-align:center; color:var(--text-dim)'>NENHUM JOGO AO VIVO AGORA</div>";
            return;
        }

        container.innerHTML = data.map(jogo => {
            const casaNome = jogo.time_casa || "Time A";
            const foraNome = jogo.time_fora || "Time B";
            const imgC = (jogo.logo_casa && jogo.logo_casa !== "null") ? jogo.logo_casa : ESCUDO_PADRAO;
            const imgF = (jogo.logo_fora && jogo.logo_fora !== "null") ? jogo.logo_fora : ESCUDO_PADRAO;

            return `
                <div class="card-hero row-interativa" onclick="abrirDetalhesAoVivo('${jogo.id}', '${casaNome}', '${foraNome}')">
                    <div class="status-tag">
                        <span class="pulse-dot"></span>
                        <span>${jogo.status || "LIVE"}</span>
                    </div>
                    <div class="live-score-row">
                        <div class="team-box">
                            <img src="${imgC}" class="img-mini" onerror="this.src='${ESCUDO_PADRAO}'" alt="casa">
                            <span class="team-name-live">${casaNome}</span>
                        </div>
                        <div class="score-box-live">${jogo.placar || "0 - 0"}</div>
                        <div class="team-box">
                            <img src="${imgF}" class="img-mini" onerror="this.src='${ESCUDO_PADRAO}'" alt="fora">
                            <span class="team-name-live">${foraNome}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) { console.error(e); container.innerHTML = "<p>Erro ao carregar jogos.</p>"; }
}

// --- 3. FUNÇÕES ARENA H2H (Neutro) ---
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
                
                if (selectTime) {
                    selectTime.innerHTML = '<option value="">Selecione o Time</option>';
                    data?.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = JSON.stringify(t);
                        opt.innerText = t.time;
                        selectTime.appendChild(opt);
                    });
                    selectTime.disabled = false;
                }
            });
        }
    });

    const timeA = document.getElementById('time-a');
    const timeB = document.getElementById('time-b');
    if (timeA && timeB) {
        const updateArena = () => {
            const valA = timeA.value;
            const valB = timeB.value;
            if (valA && valB) processarDuelo(JSON.parse(valA), JSON.parse(valB));
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

    document.getElementById('pos-a').innerText = a.posicao || 0;
    document.getElementById('pos-b').innerText = b.posicao || 0;
    document.getElementById('pts-a').innerText = a.pontos || 0;
    document.getElementById('pts-b').innerText = b.pontos || 0;
    document.getElementById('sg-a').innerText = a.sg || 0;
    document.getElementById('sg-b').innerText = b.sg || 0;

    // Probabilidade Simples (Neutro)
    const pA = (a.pontos * 0.6) + ((a.sg || 0) * 0.4) + 10;
    const pB = (b.pontos * 0.6) + ((b.sg || 0) * 0.4) + 10;
    const winA = Math.round((pA / (pA + pB)) * 100);
    const winB = 100 - winA;

    document.getElementById('bar-a').style.width = `${winA}%`;
    document.getElementById('bar-b').style.width = `${winB}%`;
    document.getElementById('perc-a').innerText = `${winA}%`;
    document.getElementById('perc-b').innerText = `${winB}%`;
}

// --- 4. FUNÇÕES DE MODAL (Neutro) ---
function abrirModalTime(time) {
    const modal = document.getElementById('modal-time');
    if (!modal) return;

    document.getElementById('modal-nome-time').innerText = time.time;
    document.getElementById('modal-pos').innerText = (time.posicao || '0') + "º";
    document.getElementById('modal-pts').innerText = time.pontos || '0';
    document.getElementById('modal-liga-badge').innerText = (time.liga || "LIGA");
    
    const img = document.getElementById('modal-escudo');
    if (img) img.src = time.escudo || ESCUDO_PADRAO;

    modal.style.display = 'flex';
}

function fecharModalTime() {
    const modal = document.getElementById('modal-time');
    if (modal) modal.style.display = 'none';
}

async function abrirDetalhesAoVivo(idJogo, casa, fora) {
    const modal = document.getElementById('modal-live');
    if (!modal) return;

    modal.style.display = 'flex';
    document.getElementById('live-teams').innerText = `${casa} x ${fora}`;
    document.getElementById('nome-casa-modal').innerText = casa;
    document.getElementById('nome-fora-modal').innerText = fora;
    document.getElementById('live-chutes').innerText = "";

    try {
        const { data, error } = await _supabase
            .from('detalhes_partida')
            .select('*')
            .eq('jogo_id', idJogo)
            .single();

        if (error || !data) {
            document.getElementById('live-posse-casa').style.width = "50%";
            document.getElementById('live-posse-fora').style.width = "50%";
            return;
        }

        // Atualiza Posse (Neutro)
        const pCasa = data.posse_casa || 50;
        const pFora = data.posse_fora || 50;
        document.getElementById('live-posse-casa').style.width = `${pCasa}%`;
        document.getElementById('live-posse-fora').style.width = `${pFora}%`;

        // Atualiza Chutes
        document.getElementById('live-chutes').innerText = `CHUTES: ${data.chutes_casa} - ${data.chutes_fora}`;
    } catch (e) { console.error(e); }
}

function fecharModalLive() {
    const modal = document.getElementById('modal-live');
    if (modal) modal.style.display = 'none';
}
