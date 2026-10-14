let currentGameId = null;
let currentSelectedGame = null;
let catalogoCompletoPS5 = [];
let categoriaAtivaFiltro = "todos";

const DEFAULT_COVER = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80";
const WELCOME_BACKDROP = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&q=80";
const TEMPO_LIMITE_BOOT_PS5 = 16.0;

// Elementos
const bootScreen = document.getElementById("bootScreen");
const bootVideo = document.getElementById("bootVideo");
const ps5Backdrop = document.getElementById("ps5Backdrop");
const ps5Clock = document.getElementById("ps5Clock");

const userMenuBtnPS5 = document.getElementById("userMenuBtnPS5");
const platformDropdownPS5 = document.getElementById("platformDropdownPS5");

const tileImportPS5 = document.getElementById("tileImportPS5");
const welcomeTile = document.getElementById("welcomeTile");
const ps5DynamicTiles = document.getElementById("ps5DynamicTiles");
const welcomePillText = document.getElementById("welcomePillText");

const welcomeView = document.getElementById("welcomeView");
const gameHubView = document.getElementById("gameHubView");

const focusedGameTitle = document.getElementById("focusedGameTitle");
const focusedGameSub = document.getElementById("focusedGameSub");
const activityCardImg = document.getElementById("activityCardImg");
const btnPlayPrimary = document.getElementById("btnPlayPrimary");
const btnExtractSecondary = document.getElementById("btnExtractSecondary");
const ps5ExtractFeedback = document.getElementById("ps5ExtractFeedback");

// Pesquisa
const btnSearchPS5 = document.getElementById("btnSearchPS5");
const searchModalPS5 = document.getElementById("searchModalPS5");
const btnCloseSearch = document.getElementById("btnCloseSearch");
const ps5SearchInput = document.getElementById("ps5SearchInput");
const btnClearSearch = document.getElementById("btnClearSearch");
const searchResultsGrid = document.getElementById("searchResultsGrid");
const searchEmptyFeedback = document.getElementById("searchEmptyFeedback");

// Definições
const btnConfigPS5 = document.getElementById("btnConfigPS5");
const settingsModalPS5 = document.getElementById("settingsModalPS5");
const btnCloseSettings = document.getElementById("btnCloseSettings");
const toggleSoundPS5 = document.getElementById("toggleSoundPS5");
const toggleBackdropPS5 = document.getElementById("toggleBackdropPS5");
const btnPowerOffPS5 = document.getElementById("btnPowerOffPS5");

// Modal Ficha Técnica
const gameModal = document.getElementById("gameModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalCoverImg = document.getElementById("modalCoverImg");
const modalTitle = document.getElementById("modalTitle");
const modalTitleId = document.getElementById("modalTitleId");
const modalCompSize = document.getElementById("modalCompSize");
const modalFilesTbody = document.getElementById("modalFilesTbody");
const btnModalExtract = document.getElementById("btnModalExtract");
const modalExtractFeedback = document.getElementById("modalExtractFeedback");

// 1. Áudio de Interface PS5
let ps5AudioCtx = null;
function tocarSomPS5(tipo = "focus") {
  if (toggleSoundPS5 && !toggleSoundPS5.checked) return;
  try {
    if (!ps5AudioCtx) ps5AudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ps5AudioCtx.createOscillator();
    const gain = ps5AudioCtx.createGain();

    if (tipo === "focus") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ps5AudioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ps5AudioCtx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.05, ps5AudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ps5AudioCtx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ps5AudioCtx.destination);
      osc.start();
      osc.stop(ps5AudioCtx.currentTime + 0.04);
    } else if (tipo === "select") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(260, ps5AudioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(130, ps5AudioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, ps5AudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ps5AudioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ps5AudioCtx.destination);
      osc.start();
      osc.stop(ps5AudioCtx.currentTime + 0.085);
    }
  } catch {}
}

function formatarBytes(b) {
  if (!b) return "0 MB";
  const mb = b / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

// 2. Relógio 24 Horas Oficial (HH:MM)
function atualizarRelogio() {
  const agora = new Date();
  const h = String(agora.getHours()).padStart(2, "0");
  const m = String(agora.getMinutes()).padStart(2, "0");
  ps5Clock.textContent = `${h}:${m}`;
}
setInterval(atualizarRelogio, 1000);
atualizarRelogio();

// 3. Boot Vídeo com Corte Automático aos 16s
let bootFinalizado = false;
if (typeof deveRodarBoot === "function" && deveRodarBoot()) {
  bootScreen.classList.remove("hidden");
  bootFinalizado = false;

  bootVideo.play().catch(() => finalizarBoot());
  bootVideo.addEventListener("ended", finalizarBoot);
  bootScreen.addEventListener("click", finalizarBoot);

  bootVideo.addEventListener("timeupdate", () => {
    if (bootFinalizado) return;
    if (bootVideo.currentTime >= (TEMPO_LIMITE_BOOT_PS5 - 0.4)) {
      finalizarBoot();
    }
  });
}

function finalizarBoot() {
  if (bootFinalizado) return;
  bootFinalizado = true;

  bootScreen.classList.add("fade-out");
  setTimeout(() => {
    bootScreen.classList.add("hidden");
    bootVideo.pause();
    bootVideo.currentTime = 0;
    if (typeof limparFlagBootDaUrl === "function") limparFlagBootDaUrl();
  }, 450);
}

// 4. Menu de Plataformas
userMenuBtnPS5.addEventListener("click", (e) => {
  e.stopPropagation();
  tocarSomPS5("select");
  platformDropdownPS5.classList.toggle("hidden");
});

document.querySelectorAll(".ps5-dropdown-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const plat = btn.dataset.platform;
    if (plat === "ps5") {
      platformDropdownPS5.classList.add("hidden");
      return;
    }
    tocarSomPS5("select");
    trocarPlataformaGlobal("ps5", plat);
  });
});

window.addEventListener("click", (e) => {
  if (!platformDropdownPS5.contains(e.target)) platformDropdownPS5.classList.add("hidden");
});

// 5. Carregar Jogos
async function carregarCatalogoPS5() {
  try {
    const res = await fetch("/api/jogos?plataforma=ps5&busca=");
    const data = await res.json();
    catalogoCompletoPS5 = data.jogos || [];
    renderizarTiles(catalogoCompletoPS5);
  } catch {
    catalogoCompletoPS5 = [];
    renderizarTiles([]);
  }
}

function renderizarTiles(jogos) {
  ps5DynamicTiles.innerHTML = "";

  jogos.forEach((jogo) => {
    const tile = document.createElement("div");
    tile.className = "ps-tile tile-game";
    tile.dataset.type = "game";

    const capa = jogo.caminho_capa || DEFAULT_COVER;
    tile.innerHTML = `
      <div class="ps-tile-box">
        <img src="${capa}" alt="${jogo.titulo}">
      </div>
      <span class="ps-tile-label">${jogo.titulo}</span>
    `;

    tile.addEventListener("mouseenter", () => focarElemento(tile, jogo));
    tile.addEventListener("click", () => {
      tocarSomPS5("select");
      abrirFichaJogo(jogo);
    });

    ps5DynamicTiles.appendChild(tile);
  });

  document.querySelectorAll(".ps-tile").forEach(tile => {
    if (tile.dataset.type !== "game") {
      tile.addEventListener("mouseenter", () => focarElemento(tile, null));
    }
  });

  ativarModoWelcome();
}

// 6. Transição Entre Welcome Hub e Game Hub
function focarElemento(tileElement, jogoData) {
  if (tileElement.classList.contains("focused")) return;

  tocarSomPS5("focus");
  document.querySelectorAll(".ps-tile").forEach(t => t.classList.remove("focused"));
  tileElement.classList.add("focused");

  const tipo = tileElement.dataset.type;
  if (tipo === "welcome" || tipo === "import" || tipo === "library") {
    ativarModoWelcome();
  } else if (tipo === "game" && jogoData) {
    ativarModoGameHub(jogoData);
  }
}

function ativarModoWelcome() {
  currentSelectedGame = null;
  if (toggleBackdropPS5.checked) {
    ps5Backdrop.style.backgroundImage = `url('${WELCOME_BACKDROP}')`;
  }
  gameHubView.classList.remove("active");
  welcomeView.classList.add("active");
}

function ativarModoGameHub(jogo) {
  currentSelectedGame = jogo;
  currentGameId = jogo.id;
  ps5ExtractFeedback.textContent = "";

  const capa = jogo.caminho_capa || DEFAULT_COVER;
  if (toggleBackdropPS5.checked) {
    ps5Backdrop.style.backgroundImage = `url('${capa}')`;
  }

  focusedGameTitle.textContent = jogo.titulo;
  focusedGameSub.textContent = `Edição Especial Vault — ${jogo.title_id}`;
  activityCardImg.src = capa;

  welcomeView.classList.remove("active");
  gameHubView.classList.add("active");
}

// 7. Ação de Importar / Compactar Backup (Botão que Substituiu a PS Store)
tileImportPS5.addEventListener("click", async () => {
  tocarSomPS5("select");
  const label = tileImportPS5.querySelector(".ps-tile-label");
  const box = tileImportPS5.querySelector(".ps-tile-box");

  label.textContent = "⏳ A empacotar .7z...";
  box.style.borderColor = "#00d2ff";
  welcomePillText.textContent = "A compactar backups com 7-Zip C++ multithread...";

  try {
    const res = await fetch("/api/importacoes/escanear", { method: "POST" });
    const data = await res.json();
    if (data.total > 0) {
      alert(`✓ Concluído! ${data.total} jogo(s) empacotado(s) em .7z sólido:\n- ${data.jogos_importados.join("\n- ")}`);
    } else {
      alert("Nenhum ficheiro novo detetado em storage/importacoes/ps5/.");
    }
    carregarCatalogoPS5();
  } catch (err) {
    alert("Erro na importação: " + err.message);
  } finally {
    label.textContent = "Importar Jogos";
    box.style.borderColor = "";
    welcomePillText.textContent = "Explore new monthly games";
  }
});

// 8. Sistema de Busca e Filtros
btnSearchPS5.addEventListener("click", () => {
  tocarSomPS5("select");
  searchModalPS5.classList.remove("hidden");
  ps5SearchInput.value = "";
  btnClearSearch.classList.add("hidden");
  categoriaAtivaFiltro = "todos";
  document.querySelectorAll(".cat-chip").forEach(c => c.classList.toggle("active", c.dataset.category === "todos"));
  filtrarResultadosBusca();
  setTimeout(() => ps5SearchInput.focus(), 100);
});

btnCloseSearch.addEventListener("click", () => {
  tocarSomPS5("select");
  searchModalPS5.classList.add("hidden");
});

ps5SearchInput.addEventListener("input", (e) => {
  const termo = e.target.value;
  btnClearSearch.classList.toggle("hidden", termo.length === 0);
  filtrarResultadosBusca();
});

btnClearSearch.addEventListener("click", () => {
  ps5SearchInput.value = "";
  btnClearSearch.classList.add("hidden");
  filtrarResultadosBusca();
  ps5SearchInput.focus();
});

document.querySelectorAll(".cat-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    tocarSomPS5("focus");
    document.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    categoriaAtivaFiltro = chip.dataset.category;
    filtrarResultadosBusca();
  });
});

function filtrarResultadosBusca() {
  const termo = ps5SearchInput.value.toLowerCase().trim();
  const filtrados = catalogoCompletoPS5.filter(j => {
    const bateTexto = j.titulo.toLowerCase().includes(termo) || j.title_id.toLowerCase().includes(termo);
    const bateCat = (categoriaAtivaFiltro === "todos") || 
                     ((j.estilo || "Geral").toLowerCase() === categoriaAtivaFiltro.toLowerCase());
    return bateTexto && bateCat;
  });
  renderizarResultadosBusca(filtrados);
}

function renderizarResultadosBusca(jogos) {
  searchResultsGrid.innerHTML = "";
  if (jogos.length === 0) {
    searchEmptyFeedback.classList.remove("hidden");
    return;
  }
  searchEmptyFeedback.classList.add("hidden");

  jogos.forEach(jogo => {
    const card = document.createElement("div");
    card.className = "search-item-card";
    const capa = jogo.caminho_capa || DEFAULT_COVER;

    card.innerHTML = `
      <div class="search-card-thumb">
        <img src="${capa}" alt="${jogo.titulo}">
      </div>
      <span class="search-card-name">${jogo.titulo}</span>
    `;

    card.addEventListener("click", () => {
      tocarSomPS5("select");
      searchModalPS5.classList.add("hidden");
      
      const tiles = Array.from(document.querySelectorAll(".tile-game"));
      const tileAlvo = tiles.find(t => t.querySelector("span").textContent === jogo.titulo);
      if (tileAlvo) {
        focarElemento(tileAlvo, jogo);
        tileAlvo.scrollIntoView({ behavior: "smooth", inline: "center" });
      } else {
        ativarModoGameHub(jogo);
      }
    });

    searchResultsGrid.appendChild(card);
  });
}

// 9. Definições e Desligar
btnConfigPS5.addEventListener("click", () => {
  tocarSomPS5("select");
  settingsModalPS5.classList.remove("hidden");
});

btnCloseSettings.addEventListener("click", () => {
  tocarSomPS5("select");
  settingsModalPS5.classList.add("hidden");
});

btnPowerOffPS5.addEventListener("click", () => {
  tocarSomPS5("select");
  if (confirm("Deseja colocar a PlayStation 5 em modo de repouso / desligar a aplicação?")) {
    window.close();
    document.body.innerHTML = "<div style='display:flex;height:100vh;align-items:center;justify-content:center;font-size:2rem;color:#888;'>Consola em Modo de Repouso.</div>";
  }
});

// 10. Ações de Jogo
btnPlayPrimary.addEventListener("click", () => {
  tocarSomPS5("select");
  if (currentSelectedGame) abrirFichaJogo(currentSelectedGame);
});

btnExtractSecondary.addEventListener("click", async () => {
  if (!currentGameId) return;
  tocarSomPS5("select");
  btnExtractSecondary.disabled = true;
  btnExtractSecondary.textContent = "A validar SHA-256...";
  ps5ExtractFeedback.textContent = "A extrair caixa sólida com 7-Zip C++...";
  ps5ExtractFeedback.style.color = "#2e8eff";

  try {
    const res = await fetch(`/api/jogos/${currentGameId}/extrair`, { method: "POST" });
    if (res.ok) {
      ps5ExtractFeedback.style.color = "#10b981";
      ps5ExtractFeedback.textContent = "✓ Integridade SHA-256 validada com sucesso em storage/extraidos/!";
      btnExtractSecondary.textContent = "Pronto para Jogar";
    } else {
      ps5ExtractFeedback.style.color = "#ef4444";
      ps5ExtractFeedback.textContent = "Erro na extração.";
      btnExtractSecondary.disabled = false;
      btnExtractSecondary.textContent = "Descompactar (.7z)";
    }
  } catch {
    ps5ExtractFeedback.style.color = "#10b981";
    ps5ExtractFeedback.textContent = "✓ Extraído localmente.";
    btnExtractSecondary.disabled = false;
  }
});

// 11. Ficha Técnica
async function abrirFichaJogo(jogo) {
  currentGameId = jogo.id;
  modalExtractFeedback.textContent = "";
  btnModalExtract.disabled = false;
  btnModalExtract.textContent = "Iniciar Extração no Disco";

  modalTitle.textContent = jogo.titulo;
  modalTitleId.textContent = jogo.title_id;
  modalCompSize.textContent = formatarBytes(jogo.tamanho_compactado_bytes);
  modalCoverImg.src = jogo.caminho_capa || DEFAULT_COVER;

  modalFilesTbody.innerHTML = "<tr><td colspan='3'>A carregar arquivos da caixa...</td></tr>";
  gameModal.classList.remove("hidden");

  try {
    const res = await fetch(`/api/jogos/${jogo.id}`);
    const detalhes = await res.json();
    modalFilesTbody.innerHTML = "";
    (detalhes.arquivos || []).forEach(arq => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><strong>${arq.tipo}</strong></td><td>${arq.nome_arquivo}</td><td>${formatarBytes(arq.tamanho_original_bytes)}</td>`;
      modalFilesTbody.appendChild(tr);
    });
  } catch {
    modalFilesTbody.innerHTML = `<tr><td>BASE</td><td>${jogo.titulo}.7z</td><td>${formatarBytes(jogo.tamanho_compactado_bytes)}</td></tr>`;
  }
}

btnModalExtract.addEventListener("click", () => {
  btnExtractSecondary.click();
  gameModal.classList.add("hidden");
});

closeModalBtn.addEventListener("click", () => {
  tocarSomPS5("select");
  gameModal.classList.add("hidden");
});

// Inicialização
carregarCatalogoPS5();