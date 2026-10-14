import os
from pathlib import Path
from backend.storage_manager import guardar_jogo_na_caixa

BASE_DIR = Path(__file__).resolve().parent

# Cria pasta temporária para os ficheiros simulados
origem_dir = BASE_DIR / "storage" / "teste_origem"
origem_dir.mkdir(parents=True, exist_ok=True)

def criar_arquivo_fake(nome: str, tamanho_mb: int = 5):
    caminho = origem_dir / nome
    with open(caminho, "wb") as f:
        f.write(os.urandom(tamanho_mb * 1024 * 1024))
    return str(caminho)

print("--- A empacotar caixas .7z e registar no banco de dados ---")

# 1. Nintendo Switch
arq_mario = criar_arquivo_fake("SuperMarioOdyssey.nsp", 6)
guardar_jogo_na_caixa(
    title_id="0100000000010000",
    titulo="Super Mario Odyssey",
    estilo="Plataforma",
    plataforma="switch",
    arquivos_origem=[{"caminho": arq_mario, "tipo": "BASE", "versao": "1.0.0"}],
    caminho_capa_origem=None
)

# 2. PlayStation 5
arq_demons = criar_arquivo_fake("DemonsSouls.pkg", 8)
guardar_jogo_na_caixa(
    title_id="PPSA-01339",
    titulo="Demon's Souls",
    estilo="RPG de Ação",
    plataforma="ps5",
    arquivos_origem=[{"caminho": arq_demons, "tipo": "BASE", "versao": "1.0.0"}],
    caminho_capa_origem=None
)

# 3. Xbox Series
arq_halo = criar_arquivo_fake("HaloInfinite.iso", 7)
guardar_jogo_na_caixa(
    title_id="MS-XBX-5512",
    titulo="Halo Infinite",
    estilo="Tiro",
    plataforma="xbox",
    arquivos_origem=[{"caminho": arq_halo, "tipo": "BASE", "versao": "1.0.0"}],
    caminho_capa_origem=None
)

# 4. Steam
arq_portal = criar_arquivo_fake("Portal2_Setup.exe", 5)
guardar_jogo_na_caixa(
    title_id="STEAM-620",
    titulo="Portal 2",
    estilo="Puzzle",
    plataforma="steam",
    arquivos_origem=[{"caminho": arq_portal, "tipo": "BASE", "versao": "2.0.0"}],
    caminho_capa_origem=None
)

print("\n✓ Concluído com sucesso! Caixas .7z criadas em storage/caixas/ e salvas no SQLite.")