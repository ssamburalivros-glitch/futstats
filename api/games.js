// api/games.js - API Serverless do Vercel
const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  try {
    console.log('🌐 Buscando jogos ao vivo...');
    
    // Fazer request ao placardefutebol
    const { data } = await axios.get('https://www.placardefutebol.com.br/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);
    const games = [];

    // Buscar campeonatos
    $('div.container.content').each((i, champ) => {
      const league = $(champ).prev('h3.match-list_league-name').text().trim() || 'Campeonato';
      
      $(champ).find('div.row.align-items-center.content').each((j, match) => {
        const status = $(match).find('span.status-name').text().trim();
        
        // Filtrar apenas ao vivo
        if (!status || !status.match(/AO VIVO|INTERVALO|\d+'/i)) {
          return;
        }
        
        const teams = $(match).find('div.team-name');
        if (teams.length < 2) return;
        
        const homeTeam = $(teams[0]).text().trim();
        const awayTeam = $(teams[1]).text().trim();
        
        const scores = $(match).find('span.badge.badge-default');
        const homeScore = scores.length >= 1 ? $(scores[0]).text().trim() : '0';
        const awayScore = scores.length >= 2 ? $(scores[1]).text().trim() : '0';
        
        const isBrasileirao = league.toUpperCase().includes('BRASILEIRO') || 
                              league.toUpperCase().includes('SÉRIE A');
        
        games.push({
          match: `${homeTeam} x ${awayTeam}`,
          status,
          league,
          home_score: homeScore,
          away_score: awayScore,
          summary: `${homeScore} x ${awayScore}`,
          is_live: true,
          is_brasileirao: isBrasileirao,
          country: isBrasileirao ? 'Brasil' : 'Internacional',
          timestamp: new Date().toISOString()
        });
      });
    });

    const response = {
      success: true,
      games,
      total: games.length,
      live_games: games.length,
      brasileirao_games: games.filter(g => g.is_brasileirao).length,
      updated_at: new Date().toLocaleString('pt-BR'),
      source: 'vercel-api'
    };

    // Cache por 30 segundos
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
    res.status(200).json(response);

  } catch (error) {
    console.error('Erro na API:', error.message);
    
    // Fallback para dados de exemplo
    const fallbackData = {
      success: true,
      games: [
        {
          match: "Flamengo x Palmeiras",
          status: "AO VIVO 45'",
          league: "Brasileirão Série A",
          home_score: "2",
          away_score: "1",
          summary: "2 x 1",
          is_live: true,
          is_brasileirao: true,
          country: "Brasil",
          timestamp: new Date().toISOString()
        }
      ],
      total: 1,
      live_games: 1,
      updated_at: new Date().toLocaleString('pt-BR'),
      source: 'fallback'
    };
    
    res.status(200).json(fallbackData);
  }
}
