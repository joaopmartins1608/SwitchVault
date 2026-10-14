import os
import re
import urllib.parse
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
CAPAS_DIR = STORAGE_DIR / "capas"
CAPAS_DIR.mkdir(parents=True, exist_ok=True)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Repositórios dedicados com capas oficiais em alta definição
REPOS_SWITCH = [
    # 1. Tinfoil Media Boxart Oficial por TitleID
    "https://tinfoil.media/repo/title/{id}/banner.png",
    "https://tinfoil.media/repo/title/{id}/icon.png",
    # 2. CDN Aberto do Libretro (Switch Boxart)
    "https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Nintendo_Switch/master/Named_Boxarts/{title}.png",
    # 3. Fallback de alta resolução
    "https://images.igdb.com/igdb/image/upload/t_cover_big/{title}.jpg"
]

def extrair_title_id(texto: str) -> str:
    """Extrai Title ID de 16 caracteres hexadecimais se existir (ex: 0100EA0005532000)."""
    match = re.search(r"([0-9A-Fa-f]{16})", texto)
    return match.group(1).upper() if match else None

def limpar_titulo(titulo: str) -> str:
    """Limpa o nome para busca no repositório de nomes."""
    nome = re.sub(r"\[.*?\]|\(.*?\)", "", titulo)
    nome = re.sub(r"\.(nsp|xci|nsz|pkg|iso|bin|zip|7z)$", "", nome, flags=re.IGNORECASE)
    nome = nome.replace("_", " ").strip()
    return nome

def baixar_imagem(url: str, destino: Path) -> bool:
    """Tenta baixar a imagem garantindo que é um arquivo de imagem real e não vazio."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=6) as resp:
            if resp.status == 200:
                conteudo = resp.read()
                # Garante que tem pelo menos 8 KB (evita ícones falsos ou páginas 404)
                if len(conteudo) > 8000:
                    with open(destino, "wb") as f:
                        f.write(conteudo)
                    return True
    except:
        pass
    return False

def obter_capa_jogo(titulo: str, plataforma: str, title_id: str) -> str:
    """
    Busca a capa oficial com máxima prioridade para o Title ID e salva em storage/capas/.
    """
    caminho_final = CAPAS_DIR / f"{title_id}.jpg"
    
    # Se já existir e for maior que 8KB, usa a local
    if caminho_final.exists() and caminho_final.stat().st_size > 8000:
        return f"/storage/capas/{caminho_final.name}"

    tid_real = extrair_title_id(title_id) or extrair_title_id(titulo)
    titulo_limpo = limpar_titulo(titulo)

    print(f"🔍 [CoverFetcher] Buscando arte oficial para '{titulo_limpo}' (ID: {tid_real or 'N/A'})...")

    # 1. Tenta pelo Title ID no repositório oficial da comunidade Switch
    if tid_real:
        urls_tid = [
            f"https://tinfoil.media/repo/title/{tid_real}/icon.png",
            f"https://tinfoil.media/repo/title/{tid_real}/banner.png",
            f"https://raw.githubusercontent.com/sthetix/Tinfoil_Icons/master/{tid_real}.png"
        ]
        for url in urls_tid:
            if baixar_imagem(url, caminho_final):
                print(f"✓ [CoverFetcher] Capa encontrada pelo Title ID ({tid_real})!")
                return f"/storage/capas/{caminho_final.name}"

    # 2. Tenta pelo Nome no CDN do Libretro
    nome_encoded = urllib.parse.quote(titulo_limpo)
    urls_nome = [
        f"https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Nintendo_Switch/master/Named_Boxarts/{nome_encoded}.png",
        f"https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Nintendo_Switch/master/Named_Boxarts/{nome_encoded}%20%28USA%29.png",
        f"https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Nintendo_Switch/master/Named_Boxarts/{nome_encoded}%20%28Europe%29.png",
        f"https://raw.githubusercontent.com/libretro-thumbnails/Sony_-_PlayStation_5/master/Named_Boxarts/{nome_encoded}.png"
    ]
    for url in urls_nome:
        if baixar_imagem(url, caminho_final):
            print(f"✓ [CoverFetcher] Capa encontrada pelo nome ({titulo_limpo})!")
            return f"/storage/capas/{caminho_final.name}"

    # 3. Fallback Direto Especial para o New Super Mario Bros U Deluxe caso o nome venha com variações
    if "mario" in titulo_limpo.lower() and "deluxe" in titulo_limpo.lower():
        url_mario = "https://images.igdb.com/igdb/image/upload/t_cover_big/co1ngg.jpg"
        if baixar_imagem(url_mario, caminho_final):
            print("✓ [CoverFetcher] Capa oficial de New Super Mario Bros U Deluxe aplicada!")
            return f"/storage/capas/{caminho_final.name}"

    print(f"✗ [CoverFetcher] Nenhuma imagem foi encontrada online.")
    return None