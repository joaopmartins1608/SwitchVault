import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "storage" / "switchvault.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

def obter_conexao():
    """Retorna uma conexão ativa com o SQLite configurada para dicionário."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def inicializar_banco():
    """Cria e atualiza o esquema do banco de dados relacional."""
    with obter_conexao() as conn:
        cursor = conn.cursor()
        
        # 1. Tabela Principal de Jogos
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS jogos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title_id TEXT UNIQUE NOT NULL,
                titulo TEXT NOT NULL,
                estilo TEXT DEFAULT 'Geral',
                plataforma TEXT NOT NULL DEFAULT 'switch',
                caminho_capa TEXT,
                tamanho_compactado_bytes INTEGER NOT NULL,
                caminho_pacote_7z TEXT NOT NULL,
                data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Tabela de Arquivos Internos da Caixa Sólida (.7z)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS arquivos_conteudo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jogo_id INTEGER NOT NULL,
                nome_arquivo TEXT NOT NULL,
                tipo TEXT NOT NULL,
                versao TEXT DEFAULT '1.0.0',
                tamanho_original_bytes INTEGER NOT NULL,
                hash_sha256 TEXT NOT NULL,
                FOREIGN KEY (jogo_id) REFERENCES jogos(id) ON DELETE CASCADE
            );
        """)

        # Índices de performance para busca instantânea
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_jogos_plataforma ON jogos(plataforma);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_jogos_title_id ON jogos(title_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_arquivos_jogo_id ON arquivos_conteudo(jogo_id);")

        conn.commit()
        print("✓ [Database] SQLite inicializado com índices multi-plataforma.")

if __name__ == "__main__":
    inicializar_banco()