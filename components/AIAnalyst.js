'use client';
import { useState } from 'react';

export default function AIAnalyst({ timeId }) {
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState('');
  const [loading, setLoading] = useState(false);

  const perguntarParaIA = async () => {
    if (!pergunta) return;
    setLoading(true);
    setResposta('');

    try {
      const res = await fetch('/api/analise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            message: pergunta,
            time_id: timeId // Envia qual time você está olhando
        }),
      });

      const data = await res.json();
      setResposta(data.answer);
    } catch (err) {
      setResposta("Desculpe, o analista está indisponível agora.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg mt-4 border border-gray-700">
      <h3 className="text-xl font-bold mb-2">🤖 IA Analyst</h3>
      <p className="text-sm text-gray-400 mb-4">Pergunte sobre o desempenho recente com base nos dados raspados.</p>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Ex: Como está a defesa desse time nos últimos jogos?"
          className="flex-1 p-2 rounded bg-gray-800 border border-gray-600 focus:outline-none focus:border-green-500"
        />
        <button 
          onClick={perguntarParaIA} 
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold disabled:opacity-50"
        >
          {loading ? 'Analisando...' : 'Enviar'}
        </button>
      </div>

      {resposta && (
        <div className="mt-4 p-3 bg-gray-800 rounded border-l-4 border-green-500">
          <p className="whitespace-pre-wrap">{resposta}</p>
        </div>
      )}
    </div>
  );
}
