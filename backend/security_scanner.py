import hashlib
from pathlib import Path

def calcular_hash_sha256(caminho_arquivo: str, buffer_size: int = 4 * 1024 * 1024) -> str:
    """
    Calcula o hash SHA-256 utilizando leitura otimizada em blocos de 4 MB na RAM.
    Processa arquivos gigabytes na velocidade máxima do SSD.
    """
    p = Path(caminho_arquivo)
    if not p.exists():
        raise FileNotFoundError(f"Arquivo não localizado: {caminho_arquivo}")

    sha256 = hashlib.sha256()
    with open(p, "rb") as f:
        while True:
            bloco = f.read(buffer_size)
            if not bloco:
                break
            sha256.update(bloco)
            
    return sha256.hexdigest()