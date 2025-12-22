import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Configuração do Supabase com as chaves de ambiente
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { message, time_nome } = await req.json();

    // 1. Busca os dados reais do time na sua tabela de classificação
    const { data: stats, error } = await supabase
      .from('tabelas_ligas') 
      .select('posicao, time, pontos, jogos, vitorias, empates, derrotas, sg, forma')
      .eq('time', time_nome)
      .single(); // Pega apenas o time específico

    if (error) {
        console.error("Erro Supabase:", error);
    }

    // 2. Configura o modelo (Gemini 1.5 Flash é grátis e rápido)
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { temperature: 0.3 } // Baixa temperatura = menos invenção
    });

    // 3. O Prompt que ensina a IA a ler seus dados
    const prompt = `
      Você é um analista de futebol profissional do site FutStats.
      
      DADOS REAIS DO TIME NO CAMPEONATO:
      ${stats ? JSON.stringify(stats) : "Dados não encontrados no momento."}

      PERGUNTA DO USUÁRIO:
      "${message}"

      INSTRUÇÕES:
      1. Use os dados acima para responder. Se os dados mostram que o time tem poucos pontos, seja realista sobre o risco de rebaixamento ou falta de títulos.
      2. Se a "forma" tiver muitos 'V', o time está em boa fase. Se tiver 'D', está em má fase.
      3. Responda de forma curta e direta (máximo 3 parágrafos).
      4. Use negrito em estatísticas importantes.
      5. Se não souber a resposta com base nos dados, diga que está analisando a tendência mas ainda não tem números confirmados.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return NextResponse.json({ answer: response.text() });

  } catch (error) {
    console.error("Erro na Rota AI:", error);
    return NextResponse.json({ answer: "O analista está ocupado estudando os esquemas táticos. Tente novamente em instantes!" }, { status: 500 });
  }
}
