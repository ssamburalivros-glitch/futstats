// API Serverless para Vercel
export default async function handler(request, response) {
  try {
    // Carregar dados do arquivo JSON
    const gamesData = require('../public/games.json');
    
    // Configurar CORS
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Retornar dados
    return response.status(200).json({
      success: true,
      ...gamesData,
      served_by: 'vercel-api',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return response.status(500).json({
      success: false,
      error: error.message,
      games: [],
      timestamp: new Date().toISOString()
    });
  }
}
