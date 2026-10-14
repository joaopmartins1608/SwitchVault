import os
import re
import shutil
import hashlib
import subprocess
from pathlib import Path

try:
    from database import obter_conexao
except ImportError:
    from backend.database import obter_conexao

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
CAIXAS_DIR = STORAGE_DIR / "caixas"
CAPAS_DIR = STORAGE_DIR / "capas"
EXTRAIDOS_DIR = STORAGE_DIR / "extraidos"

EXTENSOES_IMAGENS = [
    ".jpg", ".jpeg", ".png", ".webp", ".bmp", 
    ".gif", ".tiff", ".tif", ".ico", ".svg", ".avif"
]

for d in [CAIXAS_DIR, CAPAS_DIR, EXTRAIDOS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

def localizar_7zip():
    caminhos = [
        "7z",
        r"C:\Program Files\7-Zip\7z.exe",
        r"C:\Program Files (x86)\7-Zip\7z.exe",
        str(BASE_DIR / "backend" / "tools" / "7z.exe")
    ]
    for c in caminhos:
        if shutil.which(c) or Path(c).exists():
            return c
    return "7z"

CAMINHO_7Z = localizar_7zip()

def calcular_sha256(caminho_arquivo: Path) -> str:
    sha = hashlib.sha256()
    with open(caminho_arquivo, "rb") as f:
        while chunk := f.read(1024 * 1024):
            sha.update(chunk)
    return sha.hexdigest()

def normalizar_texto(texto: str) -> str:
    """Remove pontuação, traços e espaços extras para comparação."""
    return re.sub(r"[^a-zA-Z0-9]", "", texto).lower()

def extrair_palavras_chave(texto: str) -> set:
    """Separa o nome em palavras-chave úteis ignorando artigos e preposições."""
    palavras = re.findall(r"[a-zA-Z0-9]+", texto.lower())
    stop_words = {"the", "a", "an", "de", "do", "da", "of", "and", "em", "para"}
    return {p for p in palavras if p not in stop_words and len(p) > 1}

def encontrar_capa_inteligente(title_id: str, titulo: str) -> str:
    """
    Localiza em storage/capas/ por:
    1. Title ID exato
    2. Nome do jogo normalizado
    3. Cruzamento inteligente de palavras-chave (ex: 'mario', 'deluxe', 'super')
    """
    arquivos_capas = [f for f in CAPAS_DIR.iterdir() if f.is_file() and f.suffix.lower() in EXTENSOES_IMAGENS]
    if not arquivos_capas:
        return None

    norm_title_id = normalizar_texto(title_id)
    norm_titulo = normalizar_texto(titulo)
    palavras_jogo = extrair_palavras_chave(titulo)

    # Nível 1: Match direto por Title ID
    for f in arquivos_capas:
        if norm_title_id and norm_title_id in normalizar_texto(f.stem):
            return f"/storage/capas/{f.name}"

    # Nível 2: Match direto por nome sem pontuação
    for f in arquivos_capas:
        norm_stem = normalizar_texto(f.stem)
        if norm_titulo in norm_stem or norm_stem in norm_titulo:
            return f"/storage/capas/{f.name}"

    # Nível 3: Match por relevância de palavras-chave
    melhor_arquivo = None
    maior_coincidencia = 0

    for f in arquivos_capas:
        palavras_arquivo = extrair_palavras_chave(f.stem)
        intersecao = palavras_jogo.intersection(palavras_arquivo)
        if len(intersecao) > maior_coincidencia:
            maior_coincidencia = len(intersecao)
            melhor_arquivo = f

    # Se coincidir com pelo menos 2 palavras-chave principais (ex: 'mario' e 'deluxe')
    if melhor_arquivo and maior_coincidencia >= min(2, len(palavras_jogo)):
        return f"/storage/capas/{melhor_arquivo.name}"

    return None

def guardar_jogo_na_caixa(
    title_id: str,
    titulo: str,
    arquivos_origem: list,
    plataforma: str = "switch",
    caminho_capa_origem: str = None
) -> dict:
    pasta_destino_caixa = CAIXAS_DIR / plataforma
    pasta_destino_caixa.mkdir(parents=True, exist_ok=True)

    nome_seguro = "".join([c if c.isalnum() or c in " ._-" else "_" for c in titulo]).strip()
    caminho_7z = pasta_destino_caixa / f"{nome_seguro}.7z"

    # 1. Se veio capa da importação, copia com o nome original limpo
    caminho_capa_db = None
    if caminho_capa_origem and Path(caminho_capa_origem).exists():
        origem_p = Path(caminho_capa_origem)
        destino_p = CAPAS_DIR / origem_p.name
        shutil.copy2(caminho_capa_origem, destino_p)
        caminho_capa_db = f"/storage/capas/{destino_p.name}"

    # 2. Se não veio, faz a busca inteligente por nome ou ID dentro de storage/capas/
    if not caminho_capa_db:
        caminho_capa_db = encontrar_capa_inteligente(title_id, titulo)

    # Compactação via 7-Zip
    arquivos_metadados = []
    lista_caminhos_7z = []

    for item in arquivos_origem:
        p = Path(item["caminho"])
        if p.exists() and p.is_file():
            tamanho = p.stat().st_size
            hash_val = calcular_sha256(p)
            arquivos_metadados.append({
                "nome_arquivo": p.name,
                "tipo": item.get("tipo", "BASE"),
                "versao": item.get("versao", "1.0.0"),
                "tamanho": tamanho,
                "hash": hash_val
            })
            lista_caminhos_7z.append(str(p))

    if not lista_caminhos_7z:
        return {"sucesso": False, "erro": "Nenhum arquivo físico válido encontrado para empacotar."}

    comando = [
        CAMINHO_7Z,
        "a",
        str(caminho_7z),
        "-ms=on",
        "-mx=7",
        "-mmt=on"
    ] + lista_caminhos_7z

    try:
        proc = subprocess.run(comando, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if proc.returncode != 0:
            return {"sucesso": False, "erro": f"Erro do 7-Zip: {proc.stderr or proc.stdout}"}
    except Exception as e:
        return {"sucesso": False, "erro": f"Falha ao executar 7-Zip: {str(e)}"}

    tamanho_compactado = caminho_7z.stat().st_size

    # Persistência no SQLite
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO jogos (title_id, titulo, estilo, plataforma, caminho_capa, tamanho_compactado_bytes, caminho_pacote_7z)
            VALUES (?, ?, 'Geral', ?, ?, ?, ?)
            ON CONFLICT(title_id) DO UPDATE SET
                titulo = excluded.titulo,
                plataforma = excluded.plataforma,
                caminho_capa = COALESCE(excluded.caminho_capa, jogos.caminho_capa),
                tamanho_compactado_bytes = excluded.tamanho_compactado_bytes,
                caminho_pacote_7z = excluded.caminho_pacote_7z
        """, (
            title_id,
            titulo,
            plataforma,
            caminho_capa_db,
            tamanho_compactado,
            f"/storage/caixas/{plataforma}/{caminho_7z.name}"
        ))

        cursor.execute("SELECT id FROM jogos WHERE title_id = ?", (title_id,))
        jogo_id = cursor.fetchone()["id"]

        cursor.execute("DELETE FROM arquivos_conteudo WHERE jogo_id = ?", (jogo_id,))
        for arq in arquivos_metadados:
            cursor.execute("""
                INSERT INTO arquivos_conteudo (jogo_id, nome_arquivo, tipo, versao, tamanho_original_bytes, hash_sha256)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (jogo_id, arq["nome_arquivo"], arq["tipo"], arq["versao"], arq["tamanho"], arq["hash"]))

        conn.commit()

    return {"sucesso": True, "jogo_id": jogo_id, "tamanho": tamanho_compactado, "capa": caminho_capa_db}

def resgatar_jogo_da_caixa(jogo_id: int) -> dict:
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM jogos WHERE id = ?", (jogo_id,))
        jogo = cursor.fetchone()
        if not jogo:
            return {"sucesso": False, "erro": "Jogo não localizado."}

        cursor.execute("SELECT * FROM arquivos_conteudo WHERE jogo_id = ?", (jogo_id,))
        arquivos = [dict(r) for r in cursor.fetchall()]

    caminho_7z_real = BASE_DIR / jogo["caminho_pacote_7z"].lstrip("/")
    if not caminho_7z_real.exists():
        return {"sucesso": False, "erro": f"Caixa {caminho_7z_real.name} não encontrada no disco."}

    pasta_saida = EXTRAIDOS_DIR / jogo["plataforma"] / jogo["title_id"]
    pasta_saida.mkdir(parents=True, exist_ok=True)

    comando = [CAMINHO_7Z, "x", str(caminho_7z_real), f"-o{str(pasta_saida)}", "-y"]
    subprocess.run(comando, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    for arq in arquivos:
        arquivo_extraido = pasta_saida / arq["nome_arquivo"]
        if arquivo_extraido.exists():
            if calcular_sha256(arquivo_extraido) != arq["hash_sha256"]:
                return {"sucesso": False, "erro": f"Corrupção detectada no arquivo {arq['nome_arquivo']}."}

    return {"sucesso": True, "pasta_destino": str(pasta_saida)}