import os
import re
from pathlib import Path
from backend.storage_manager import guardar_jogo_na_caixa

BASE_DIR = Path(__file__).resolve().parent
IMPORT_DIR = BASE_DIR / "storage" / "importacoes"

# Extensões suportadas por ecossistema
EXTENSOES_VALIDAS = {
    "switch": {".nsp", ".xci", ".nsz"},
    "ps5": {".pkg"},
    "xbox": {".iso", ".xbe"},
    "steam": {".exe", ".zip", ".7z"}
}

def extrair_metadados_nome(arquivo_path: Path, plataforma: str):
    """
    Tenta identificar Title ID entre colchetes [0100...] ou gera um identificador seguro.
    Exemplo: "New Super Mario Bros U Deluxe [0100EA80032C2000].nsp"
    """
    nome_sem_ext = arquivo_path.stem
    match_id = re.search(r"\[([A-Za-z0-9_-]{8,16})\]", nome_sem_ext)
    
    if match_id:
        title_id = match_id.group(1).upper()
        titulo = re.sub(r"\[.*?\]", "", nome_sem_ext).strip()
    else:
        # Se não tiver [TitleID], limpa o nome e gera um ID amigável
        titulo = nome_sem_ext.strip()
        slug = re.sub(r"[^A-Za-z0-9]", "", titulo).upper()[:10]
        title_id = f"{plataforma.upper()}-{slug}"

    return title_id, titulo

def processar_pasta_importacoes():
    print("==================================================")
    print("      SWITCHVAULT - SCANNER DE IMPORTAÇÕES        ")
    print("==================================================")

    total_processados = 0

    for plataforma, extensoes in EXTENSOES_VALIDAS.items():
        pasta_plataforma = IMPORT_DIR / plataforma
        if not pasta_plataforma.exists():
            continue

        # Procura arquivos válidos na pasta da plataforma
        arquivos = [f for f in pasta_plataforma.iterdir() if f.is_file() and f.suffix.lower() in extensoes]

        if not arquivos:
            continue

        print(f"\n📁 Verificando plataforma: [{plataforma.upper()}] - {len(arquivos)} arquivo(s) encontrado(s)")

        for arq in arquivos:
            title_id, titulo = extrair_metadados_nome(arq, plataforma)

            # Procura por uma capa com o mesmo nome na pasta (ex: mario.jpg ou cover.png)
            capa = None
            for ext_capa in [".png", ".jpg", ".jpeg", ".webp"]:
                capa_candidata = pasta_plataforma / f"{arq.stem}{ext_capa}"
                capa_padrao = pasta_plataforma / f"cover{ext_capa}"
                if capa_candidata.exists():
                    capa = str(capa_candidata)
                    break
                elif capa_padrao.exists():
                    capa = str(capa_padrao)
                    break

            tamanho_gb = arq.stat().st_size / (1024**3)
            print(f"\n-> Processando: {titulo}")
            print(f"   ID: {title_id} | Tamanho: {tamanho_gb:.2f} GB")
            print("   Calculando SHA-256 e empacotando caixa sólida .7z...")

            resultado = guardar_jogo_na_caixa(
                title_id=title_id,
                titulo=titulo,
                estilo="Geral",
                plataforma=plataforma,
                arquivos_origem=[{
                    "caminho": str(arq),
                    "tipo": "BASE",
                    "versao": "1.0.0"
                }],
                caminho_capa_origem=capa
            )

            if resultado.get("sucesso"):
                print(f"   ✓ Sucesso! Pacote final: {resultado['tamanho_compactado_bytes'] / (1024**2):.2f} MB")
                total_processados += 1
            else:
                print(f"   ❌ Falha: {resultado.get('erro')}")

    print("\n==================================================")
    print(f"Scanner finalizado. Total de jogos empacotados: {total_processados}")
    print("==================================================")

if __name__ == "__main__":
    processar_pasta_importacoes()