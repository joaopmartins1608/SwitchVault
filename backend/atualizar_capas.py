import sqlite3
from pathlib import Path
from database import obter_conexao
from cover_fetcher import obter_capa_jogo

def reparar_capas():
    print("==================================================")
    print("   SwitchVault — Reparador Automático de Capas    ")
    print("==================================================")
    
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title_id, titulo, plataforma, caminho_capa FROM jogos;")
        jogos = cursor.fetchall()

        if not jogos:
            print("Nenhum jogo encontrado no banco de dados.")
            return

        atualizados = 0
        for jogo in jogos:
            j = dict(jogo)
            capa_atual = j.get("caminho_capa")

            # Atualiza caso a capa esteja nula ou vazia
            if not capa_atual or "unsplash" in capa_atual:
                print(f"\nBaixando capa para: {j['titulo']} ({j['plataforma']})...")
                nova_capa = obter_capa_jogo(
                    titulo=j["titulo"],
                    plataforma=j["plataforma"],
                    title_id=j["title_id"]
                )

                if nova_capa:
                    cursor.execute(
                        "UPDATE jogos SET caminho_capa = ? WHERE id = ?;",
                        (nova_capa, j["id"])
                    )
                    conn.commit()
                    print(f"✓ Capa vinculada ao jogo: {nova_capa}")
                    atualizados += 1
                else:
                    print(f"✗ Não foi possível encontrar capa online para: {j['titulo']}")
            else:
                print(f"Jogo '{j['titulo']}' já possui capa cadastrada.")

        print(f"\nProcesso concluído! {atualizados} jogo(s) atualizado(s).")

if __name__ == "__main__":
    reparar_capas()