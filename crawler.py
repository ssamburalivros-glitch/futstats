import os
import time
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
# Substitua pelas suas credenciais se não estiver usando variáveis de ambiente
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
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        response = requests.get(url, timeout=20)
        data = response.json()
        
        # Navega até os dados dos times
        entries = data['children'][0]['standings']['entries']
        
        times = []
        for entry in entries:
            stats = entry['stats']
            team = entry['team']
            
            # 1. Extração de estatísticas numéricas básicas
            pontos = next((s['value'] for s in stats if s['name'] == 'points'), 0)
            jogos = next((s['value'] for s in stats if s['name'] == 'gamesPlayed'), 0)
            sg = next((s['value'] for s in stats if s['name'] == 'pointDifferential'), 0)
            posicao = next((s['value'] for s in stats if s['name'] == 'rank'), 0)

            # 2. Captura da Forma Real (Últimos 5 jogos)
            # A API da ESPN às vezes envia a forma no campo 'summary'
            forma_final = ""
            for s in stats:
                if s.get('name') in ['summary', 'overall']:
                    bruto = s.get('summary', '')
                    # Verifica se o que veio são letras (V,D,E) e não números (1-0-1)
                    if bruto and not any(char.isdigit() for char in bruto):
                        limpo = bruto.replace(",", "").replace(" ", "").upper()
                        forma_final = limpo.replace("W", "V").replace("L", "D").replace("T", "E")
                        break

            # Se a API falhou ou mandou números, enviamos vazio para o JS resolver com o cálculo de aproveitamento
            if not forma_final:
                forma_final = "S_DADOS" # Sinaliza ao JS para usar a lógica de fallback

            times.append({
                "liga": liga_id,
                "posicao": int(posicao),
                "time": team['displayName'],
                "escudo": team['logos'][0]['href'] if 'logos' in team else "",
                "jogos": int(jogos),
                "pontos": int(pontos),
                "sg": int(sg),
                "forma": forma_final[:5]
            })
            
        print(f"✅ {liga_id}: {len(times)} times processados.")
        return times
    except Exception as e:
        print(f"❌ Erro ao processar liga {liga_id}: {e}")
        return []

def main():
    dados_totais = []
    
    # Percorre todas as ligas configuradas
    for liga_id, espn_id in LIGAS.items():
        lista_times = capturar_api_espn(liga_id, espn_id)
        if lista_times:
            dados_totais.extend(lista_times)
        time.sleep(1) # Delay amigável entre requisições

    if dados_totais:
        print(f"📤 Enviando {len(dados_totais)} registros para o Supabase...")
        try:
            # Limpa os dados antigos (exceto marcadores especiais se houver)
            supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
            
            # Insere os novos dados atualizados
            supabase.table("tabelas_ligas").insert(dados_totais).execute()
            print("🚀 SUCESSO! Banco de dados atualizado.")
        except Exception as e:
            print(f"❌ Erro ao salvar no banco: {e}")
    else:
        print("💀 Erro crítico: Nenhum dado capturado.")

if __name__ == "__main__":
    main()
