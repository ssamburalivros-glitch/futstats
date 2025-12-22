import os
import time
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
# Certifique-se de que estas variáveis de ambiente estão configuradas ou substitua pelas strings
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# IDs das Ligas na API da ESPN
LIGAS = {
    "BR": "bra.1",
    "PL": "eng.1",
    "ES": "esp.1",
    "DE": "ger.1",
    "IT": "ita.1",
    "PT": "por.1"
}

def capturar_api_espn(liga_id, espn_id):
    print(f"📡 Acessando API ESPN para {liga_id}...")
    # URL da API de classificação
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        response = requests.get(url, timeout=20)
        data = response.json()
        
        # Caminho para os dados dos times
        entries = data['children'][0]['standings']['entries']
        
        times = []
        for entry in entries:
            stats = entry['stats']
            team = entry['team']
            
            # Extração de estatísticas básicas com segurança
            def get_stat(name):
                return next((s['value'] for s in stats if s['name'] == name), 0)

            pontos = get_stat('points')
            jogos = get_stat('gamesPlayed')
            sg = get_stat('pointDifferential')
            posicao = get_stat('rank')

            # --- LÓGICA REVISADA DA COLUNA 'FORMA' ---
            forma_final = "EEEEE" # Valor inicial neutro
            try:
                # Na API ESPN, a forma (V-E-D) costuma vir no campo 'summary'
                forma_bruta = next((s['summary'] for s in stats if s['name'] == 'summary'), "")
                
                if forma_bruta:
                    # 1. Remove espaços e vírgulas
                    limpo = forma_bruta.replace(",", "").replace(" ", "").upper()
                    # 2. Traduz Inglês (W, L, T) para Português (V, D, E)
                    traduzido = limpo.replace("W", "V").replace("L", "D").replace("T", "E")
                    # 3. Garante que pegamos apenas os últimos 5 e preenche se faltar
                    forma_final = traduzido[:5].ljust(5, 'E')
            except Exception:
                pass # Mantém o 'EEEEE' se falhar

            times.append({
                "liga": liga_id,
                "posicao": int(posicao),
                "time": team['displayName'],
                "escudo": team['logos'][0]['href'] if 'logos' in team else "",
                "jogos": int(jogos),
                "pontos": int(pontos),
                "sg": int(sg),
                "forma": forma_final  # Enviando para a coluna que criamos
            })
            
        print(f"✅ {liga_id}: {len(times)} times processados.")
        return times
    except Exception as e:
        print(f"❌ Erro ao processar {liga_id}: {e}")
        return []

def main():
    dados_totais = []
    
    for liga_id, espn_id in LIGAS.items():
        lista_times = capturar_api_espn(liga_id, espn_id)
        if lista_times:
            dados_totais.extend(lista_times)
        time.sleep(1) # Evita bloqueios por excesso de requisições

    if dados_totais:
        print(f"📤 Atualizando {len(dados_totais)} registros no Supabase...")
        try:
            # 1. Limpa a tabela para evitar dados duplicados ou antigos
            supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
            
            # 2. Insere os novos dados com a coluna 'forma' preenchida
            supabase.table("tabelas_ligas").insert(dados_totais).execute()
            print("🚀 SUCESSO! Site e Banco de dados sincronizados.")
        except Exception as e:
            print(f"❌ Erro ao salvar no banco: {e}")
    else:
        print("💀 Erro: Nenhum dado capturado para enviar.")

if __name__ == "__main__":
    main()
