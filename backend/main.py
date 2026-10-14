import os
import re
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

try:
    from database import inicializar_banco, obter_conexao
    from storage_manager import resgatar_jogo_da_caixa, guardar_jogo_na_caixa, EXTENSOES_IMAGENS
except ImportError:
    from backend.database import inicializar_banco, obter_conexao
    from backend.storage_manager import resgatar_jogo_da_caixa, guardar_jogo_na_caixa, EXTENSOES_IMAGENS

# Inicializa o esquema de tabelas e índices do SQLite
inicializar_banco()

app = FastAPI(
    title="SwitchVault API",
    description="Backend de alta performance com C++ (7-Zip) e SQLite para multi-consoles",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
FRONTEND_DIR = BASE_DIR / "frontend"

STORAGE_DIR.mkdir(parents=True, exist_ok=True)
(STORAGE_DIR / "caixas").mkdir(parents=True, exist_ok=True)
(STORAGE_DIR / "capas").mkdir(parents=True, exist_ok=True)
(STORAGE_DIR / "extraidos").mkdir(parents=True, exist_ok=True)
(STORAGE_DIR / "importacoes").mkdir(parents=True, exist_ok=True)

for sub in ["switch", "ps5", "xbox", "steam"]:
    (STORAGE_DIR / "importacoes" / sub).mkdir(parents=True, exist_ok=True)
    (STORAGE_DIR / "caixas" / sub).mkdir(parents=True, exist_ok=True)

FRONTEND_DIR.mkdir(parents=True, exist_ok=True)

# Monta o armazenamento estático para que /storage/capas/... seja acessível no navegador
app.mount("/storage", StaticFiles(directory=str(STORAGE_DIR)), name="storage")


# ============================================================
# ROTAS DA API REST
# ============================================================

@app.get("/api/jogos")
def listar_jogos(
    plataforma: str = Query("switch", description="Plataforma: switch, ps5, xbox ou steam"),
    busca: str = Query("", description="Termo de pesquisa por título ou ID")
):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        termo = f"%{busca.strip()}%"
        
        cursor.execute("""
            SELECT id, title_id, titulo, estilo, plataforma, caminho_capa, 
                   tamanho_compactado_bytes, caminho_pacote_7z, data_cadastro
            FROM jogos
            WHERE LOWER(plataforma) = LOWER(?)
              AND (LOWER(titulo) LIKE LOWER(?) OR LOWER(title_id) LIKE LOWER(?))
            ORDER BY data_cadastro DESC
        """, (plataforma, termo, termo))
        
        jogos = [dict(row) for row in cursor.fetchall()]
        return {"total": len(jogos), "plataforma": plataforma, "jogos": jogos}


@app.get("/api/jogos/{jogo_id}")
def obter_detalhes_jogo(jogo_id: int):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM jogos WHERE id = ?", (jogo_id,))
        jogo = cursor.fetchone()
        
        if not jogo:
            raise HTTPException(status_code=404, detail="Jogo não encontrado.")
            
        cursor.execute("""
            SELECT id, nome_arquivo, tipo, versao, tamanho_original_bytes, hash_sha256
            FROM arquivos_conteudo
            WHERE jogo_id = ?
        """, (jogo_id,))
        
        arquivos = [dict(row) for row in cursor.fetchall()]
        resultado = dict(jogo)
        resultado["arquivos"] = arquivos
        return resultado


@app.post("/api/jogos/{jogo_id}/extrair")
def extrair_jogo(jogo_id: int):
    resultado = resgatar_jogo_da_caixa(jogo_id)
    if not resultado.get("sucesso"):
        raise HTTPException(status_code=500, detail=resultado.get("erro", "Falha na extração dos arquivos."))
    return resultado


@app.post("/api/importacoes/escanear")
def escanear_e_importar():
    """
    Varre storage/importacoes/{plataforma} procurando ROMs e suas capas em QUALQUER formato de imagem.
    """
    try:
        pasta_importacoes = STORAGE_DIR / "importacoes"
        pasta_importacoes.mkdir(parents=True, exist_ok=True)
        
        plataformas_suportadas = ["switch", "ps5", "xbox", "steam"]
        jogos_processados = []

        extensoes_roms = {
            "switch": [".nsp", ".xci", ".nsz"],
            "ps5":    [".pkg", ".iso", ".bin"],
            "xbox":   [".iso", ".xbe", ".bin"],
            "steam":  [".bin", ".zip", ".tar"]
        }

        for plat in plataformas_suportadas:
            pasta_plat = pasta_importacoes / plat
            if not pasta_plat.exists():
                pasta_plat.mkdir(parents=True, exist_ok=True)
                continue

            for item in pasta_plat.iterdir():
                arquivos = []
                capa_local = None
                title_id = ""
                titulo = ""

                # CASO 1: O jogo é uma PASTA (ex: Pasta com ROM + Imagem)
                if item.is_dir():
                    nome_pasta = item.name
                    match_id = re.search(r"\[([A-Fa-f0-9]{16})\]", nome_pasta)
                    if match_id:
                        title_id = match_id.group(1).upper()
                        titulo = nome_pasta.split("[")[0].strip().replace("_", " ")
                    else:
                        title_id = re.sub(r"[^A-Za-z0-9]", "", nome_pasta).upper()[:16]
                        titulo = nome_pasta.replace("_", " ")

                    for f in item.iterdir():
                        # Identifica qualquer formato de imagem dentro da pasta
                        if f.suffix.lower() in EXTENSOES_IMAGENS and not capa_local:
                            capa_local = str(f)
                        elif f.is_file() and f.suffix.lower() in extensoes_roms.get(plat, []):
                            nome_lower = f.name.lower()
                            tipo = "UPDATE" if "upd" in nome_lower or "[v" in nome_lower else ("DLC" if "dlc" in nome_lower else "BASE")
                            arquivos.append({"caminho": str(f), "tipo": tipo, "versao": "1.0.0"})

                # CASO 2: O jogo é um ARQUIVO SOLTO (ex: Mario.nsp + Mario.png/jpg/webp)
                elif item.is_file() and item.suffix.lower() in extensoes_roms.get(plat, []):
                    nome_arquivo = item.stem
                    match_id = re.search(r"\[([A-Fa-f0-9]{16})\]", nome_arquivo)
                    if match_id:
                        title_id = match_id.group(1).upper()
                        titulo = nome_arquivo.split("[")[0].strip().replace("_", " ")
                    else:
                        title_id = re.sub(r"[^A-Za-z0-9]", "", nome_arquivo).upper()[:16]
                        titulo = nome_arquivo.replace("_", " ")

                    arquivos.append({"caminho": str(item), "tipo": "BASE", "versao": "1.0.0"})

                    # Procura qualquer extensão de imagem correspondente ao nome da ROM
                    for ext in EXTENSOES_IMAGENS:
                        possivel_capa = item.with_suffix(ext)
                        if possivel_capa.exists():
                            capa_local = str(possivel_capa)
                            break

                # Processa a gravação
                if arquivos:
                    if not title_id:
                        title_id = f"{plat.upper()}_{len(titulo):04d}"

                    res = guardar_jogo_na_caixa(
                        title_id=title_id,
                        titulo=titulo,
                        plataforma=plat,
                        arquivos_origem=arquivos,
                        caminho_capa_origem=capa_local
                    )
                    if res.get("sucesso"):
                        jogos_processados.append(f"[{plat.upper()}] {titulo}")

        return {"total": len(jogos_processados), "jogos_importados": jogos_processados}
    except Exception as e:
        print(f"[Erro no Escaneamento] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Monta os arquivos do Frontend na raiz (sempre por último)
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")