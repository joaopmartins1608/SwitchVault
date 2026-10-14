import subprocess
import shutil
from pathlib import Path

# Localiza a pasta de assets
BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "frontend" / "assets"

# Lista de vídeos a processar e suas resoluções/fps ideais
CONFIG_VIDEOS = {
    "boot_switch.mp4": {"escala": "1920:1080", "fps": 60, "crf": 17},
    "boot_ps5.mp4":    {"escala": "2560:1440", "fps": 60, "crf": 16},
    "boot_xbox.mp4":   {"escala": "2560:1440", "fps": 60, "crf": 16}, # 1440p é ideal para fluidez na web
    "boot_steam.mp4":  {"escala": "1080:1080", "fps": 60, "crf": 17}
}

def verificar_ffmpeg():
    if not shutil.which("ffmpeg"):
        raise RuntimeError(
            "FFmpeg não foi encontrado no PATH do sistema. "
            "Execute 'winget install -e --id Gyan.FFmpeg' e reinicie o terminal."
        )

def otimizar_video(nome_arquivo: str, config: dict):
    origem = ASSETS_DIR / nome_arquivo
    if not origem.exists():
        print(f"[!] Ficheiro não encontrado: {origem.name}")
        return

    backup = ASSETS_DIR / f"original_{origem.name}"
    saida = ASSETS_DIR / f"temp_{origem.name}"

    # Faz backup do arquivo original se ainda não existir
    if not backup.exists():
        shutil.copy2(origem, backup)
        print(f"-> Backup guardado em: {backup.name}")

    print(f"\n==========================================")
    print(f"A codificar '{origem.name}' em alta fidelidade...")
    print(f"Resolução alvo: {config['escala']} | FPS: {config['fps']} | CRF: {config['crf']}")
    print(f"==========================================")

    # Comando FFmpeg otimizado para qualidade máxima e reprodução instantânea na web
    cmd = [
        "ffmpeg",
        "-y",                       # Sobrescrever sem perguntar
        "-i", str(backup),          # Arquivo de entrada (o backup)
        "-vf", f"scale={config['escala']}:flags=lanczos,fps={config['fps']}", # Upscaling limpo via Lanczos
        "-c:v", "libx264",          # Codec H.264
        "-preset", "slow",          # Algoritmo de compressão aprofundada
        "-crf", str(config["crf"]), # Qualidade quase imperceptível de perda visual
        "-profile:v", "high",       # Perfil High para melhor gradiente
        "-pix_fmt", "yuv420p",      # Padrão nativo para navegadores
        "-movflags", "+faststart",  # Permite streaming imediato
        "-c:a", "aac",              # Áudio AAC estéreo limpo
        "-b:a", "192k",
        str(saida)
    ]

    processo = subprocess.run(cmd)

    if processo.returncode == 0:
        # Substitui o arquivo original pelo arquivo codificado
        origem.unlink()
        saida.rename(origem)
        print(f"✓ '{origem.name}' recodificado com sucesso e pronto para uso!")
    else:
        if saida.exists():
            saida.unlink()
        print(f"[X] Falha ao codificar '{origem.name}'.")

def main():
    verificar_ffmpeg()
    print(f"Directório de assets: {ASSETS_DIR}")
    for nome, cfg in CONFIG_VIDEOS.items():
        otimizar_video(nome, cfg)
    print("\nTodos os vídeos foram aprimorados com sucesso!")

if __name__ == "__main__":
    main()