import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 1. Configurar Supabase (use suas chaves de ambiente)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,("https://sihunefyfkecumbiyxva.supabase.co")
  process.env.SUPABASE_SERVICE_ROLE_KEY ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQwODkzOCwiZXhwIjoyMDgxOTg0OTM4fQ.qeZliDad795-HMs26rheYtKfIgtWZ7aIHQmQsVwZIic")
);

// 2. Configurar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { message, time_id } = await req.json(); // Recebe a pergunta e o ID do time (opcional)

    // PASSO A: Buscar dados relevantes no Supabase
    // Exemplo: Pegar os últimos 5 jogos do banco de dados raspado
    const { data: stats, error } = await supabase
      .from('partidas') // Sua tabela de dados raspados
      .select('*')
      .eq('time_mandante', time_id) // Exemplo de filtro
      .limit(5);

    if (error) throw error;

    // Transformar dados em texto para a IA ler
    const dadosContexto = JSON.stringify(stats);

    // PASSO B: Montar o Prompt para a IA
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Você é um especialista em análise de futebol e estatísticas (sabermetrics).
      
      Aqui estão os dados recentes do time (em formato JSON):
      ${dadosContexto}

      Pergunta do usuário: "${message}"

      Com base APENAS nos dados acima, responda a pergunta. 
      Seja técnico mas acessível. Cite números específicos (posse de bola, chutes, etc).
      Se os dados não tiverem a resposta, diga que não sabe.
    `;

    // PASSO C: Gerar a resposta
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ answer: text });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao processar análise.' }, { status: 500 });
  }
}
