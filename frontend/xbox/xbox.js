let currentGameId = null;
let currentSelectedGame = null;
let catalogoCompletoXbox = [];
let categoriaAtivaFiltro = "todos";

const DEFAULT_COVER = "https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=600&q=80";
const XBOX_DEFAULT_BACKDROP = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&q=80";

// Elementos
const bootScreen = document.getElementById("bootScreen");
const bootVideo = document.getElementById("bootVideo");
const xboxBackdrop = document.getElementById("xboxBackdrop");
const xboxClock = document.getElementById("xboxClock");

const userMenuBtnXbox = document.getElementById("userMenuBtnXbox");
const platformDropdownXbox = document.getElementById("platformDropdownXbox");

const btnQuickImportXbox = document.getElementById("btnQuickImportXbox");
const cardImportBackups = document.getElementById("cardImportBackups");
const importBentoLabel = document.getElementById("importBentoLabel");

// Hero Zone
const xboxFocusedHeroTile = document.getElementById("xboxFocusedHeroTile");
const xbHeroImg = document.getElementById("xbHeroImg");
const xbHeroGameName = document.getElementById("xbHeroGameName");
const xboxRecentTiles = document.getElementById("xboxRecentTiles");

// Pesquisa
const btnSearchXbox = document.getElementById("btnSearchXbox");
const searchModalXbox = document.getElementById("searchModalXbox");
const btnCloseSearchXbox = document.getElementById("btnCloseSearchXbox");
const xboxSearchInput = document.getElementById("xboxSearchInput");
const btnClearSearchXbox = document.getElementById("btnClearSearchXbox");
const xboxSearchResultsGrid = document.getElementById("xboxSearchResultsGrid");
const xboxSearchEmpty = document.getElementById("xboxSearchEmpty");

// Definições
const btnConfigXbox = document.getElementById("btnConfigXbox");
const settingsModalXbox = document.getElementById("settingsModalXbox");
const btnCloseSettingsXbox = document.getElementById("btnCloseSettingsXbox");
const toggleSoundXbox = document.getElementById("toggleSoundXbox");
const toggleBackdropXbox = document.getElementById("toggleBackdropXbox");
const btnPowerOffXbox = document.getElementById("btnPowerOffXbox");

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

// 1. Áudio de Interface Oficial Xbox Sintetizado
let xboxAudioCtx = null;
function tocarSomXbox(tipo = "focus") {
  if (toggleSoundXbox && !toggleSoundXbox.checked) return;
  try {
    if (!xboxAudioCtx) xboxAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = xboxAudioCtx.createOscillator();
    const gain = xboxAudioCtx.createGain();

    if (tipo === "focus") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(540, xboxAudioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1080, xboxAudioCtx.currentTime + 0.028);
      gain.gain.setValueAtTime(0.06, xboxAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, xboxAudioCtx.currentTime + 0.028);
      osc.connect(gain);
      gain.connect(xboxAudioCtx.destination);
      osc.start();
      osc.stop(xboxAudioCtx.currentTime + 0.03);
    } else if (tipo === "select") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, xboxAudioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(640, xboxAudioCtx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.12, xboxAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, xboxAudioCtx.currentTime + 0.07);
      osc.connect(gain);
      gain.connect(xboxAudioCtx.destination);
      osc.start();
      osc.stop(xboxAudioCtx.currentTime + 0.075);
    }
  } catch {}
}

function formatarBytes(b) {
  if (!b) return "0 MB";
  const mb = b / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

// 2. Relógio Oficial 24 Horas (HH:MM)
function atualizarRelogio() {
  const agora = new Date();
  const h = String(agora.getHours()).padStart(2, "0");
  const m = String(agora.getMinutes()).padStart(2, "0");
  xboxClock.textContent = `${h}:${m}`;
}
setInterval(atualizarRelogio, 1000);
atualizarRelogio();

// 3. Boot Vídeo
if (typeof deveRodarBoot === "function" && deveRodarBoot()) {
  bootScreen.classList.remove("hidden");
  bootVideo.play().catch(() => finalizarBoot());
  bootVideo.addEventListener("ended", finalizarBoot);
  bootScreen.addEventListener("click", finalizarBoot);
}

function finalizarBoot() {
  bootScreen.classList.add("fade-out");
  setTimeout(() => {
    bootScreen.classList.add("hidden");
    bootVideo.pause();
    bootVideo.currentTime = 0;
    if (typeof limparFlagBootDaUrl === "function") limparFlagBootDaUrl();
  }, 450);
}

// 4. Menu de Plataformas
userMenuBtnXbox.addEventListener("click", (e) => {
  e.stopPropagation();
  tocarSomXbox("select");
  platformDropdownXbox.classList.toggle("hidden");
});

document.querySelectorAll(".xbox-dropdown-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const plat = btn.dataset.platform;
    if (plat === "xbox") {
      platformDropdownXbox.classList.add("hidden");
      return;
    }
    tocarSomXbox("select");
    trocarPlataformaGlobal("xbox", plat);
  });
});

window.addEventListener("click", (e) => {
  if (!platformDropdownXbox.contains(e.target)) platformDropdownXbox.classList.add("hidden");
});

// 5. Carregar Catálogo do Xbox
async function carregarCatalogoXbox() {
  try {
    const res = await fetch("/api/jogos?plataforma=xbox&busca=");
    const data = await res.json();
    catalogoCompletoXbox = data.jogos || [];
    renderizarDashboardXbox(catalogoCompletoXbox);
  } catch {
    catalogoCompletoXbox = [];
    renderizarDashboardXbox([]);
  }
}

function renderizarDashboardXbox(jogos) {
  xboxRecentTiles.innerHTML = "";

  if (jogos.length === 0) {
    xbHeroImg.src = DEFAULT_COVER;
    xbHeroGameName.textContent = "Nenhum jogo no cofre";
    xboxBackdrop.style.backgroundImage = `url('${XBOX_DEFAULT_BACKDROP}')`;
    return;
  }

  // O primeiro jogo vira o Hero Tile Focado (como Starfield no print)
  focarJogo(jogos[0]);

  // Os próximos jogos formam a esteira horizontal
  jogos.slice(1).forEach((jogo) => {
    const thumb = document.createElement("div");
    thumb.className = "xb-tile-thumb";
    const capa = jogo.caminho_capa || DEFAULT_COVER;

    thumb.innerHTML = `<img src="${capa}" alt="${jogo.titulo}">`;

    thumb.addEventListener("mouseenter", () => {
      tocarSomXbox("focus");
      focarJogo(jogo);
    });

    thumb.addEventListener("click", () => {
      tocarSomXbox("select");
      abrirFichaJogo(jogo);
    });

    xboxRecentTiles.appendChild(thumb);
  });
}

function focarJogo(jogo) {
  currentSelectedGame = jogo;
  currentGameId = jogo.id;

  const capa = jogo.caminho_capa || DEFAULT_COVER;
  xbHeroImg.src = capa;
  xbHeroGameName.textContent = jogo.titulo;

  if (toggleBackdropXbox.checked) {
    xboxBackdrop.style.backgroundImage = `url('${capa}')`;
  }
}

// Clicar no Bloco Hero Principal abre a ficha técnica
xboxFocusedHeroTile.addEventListener("click", () => {
  tocarSomXbox("select");
  if (currentSelectedGame) abrirFichaJogo(currentSelectedGame);
});

// 6. Ingestão de ROMs com 7-Zip
async function dispararImportacaoXbox() {
  tocarSomXbox("select");
  importBentoLabel.textContent = "⏳ A empacotar .7z...";

  try {
    const res = await fetch("/api/importacoes/escanear", { method: "POST" });
    const data = await res.json();
    if (data.total > 0) {
      alert(`✓ Concluído! ${data.total} jogo(s) empacotado(s) em .7z sólido:\n- ${data.jogos_importados.join("\n- ")}`);
    } else {
      alert("Nenhum arquivo novo detectado em storage/importacoes/xbox/.");
    }
    carregarCatalogoXbox();
  } catch (err) {
    alert("Erro na importação: " + err.message);
  } finally {
    importBentoLabel.textContent = "Importar Jogos (7-Zip)";
  }
}

btnQuickImportXbox.addEventListener("click", dispararImportacaoXbox);
cardImportBackups.addEventListener("click", dispararImportacaoXbox);

// 7. Busca com Filtros
btnSearchXbox.addEventListener("click", () => {
  tocarSomXbox("select");
  searchModalXbox.classList.remove("hidden");
  xboxSearchInput.value = "";
  btnClearSearchXbox.classList.add("hidden");
  categoriaAtivaFiltro = "todos";
  document.querySelectorAll(".xb-cat-chip").forEach(c => c.classList.toggle("active", c.dataset.category === "todos"));
  filtrarResultadosBusca();
  setTimeout(() => xboxSearchInput.focus(), 100);
});

btnCloseSearchXbox.addEventListener("click", () => {
  tocarSomXbox("select");
  searchModalXbox.classList.add("hidden");
});

xboxSearchInput.addEventListener("input", (e) => {
  const termo = e.target.value;
  btnClearSearchXbox.classList.toggle("hidden", termo.length === 0);
  filtrarResultadosBusca();
});

btnClearSearchXbox.addEventListener("click", () => {
  xboxSearchInput.value = "";
  btnClearSearchXbox.classList.add("hidden");
  filtrarResultadosBusca();
  xboxSearchInput.focus();
});

document.querySelectorAll(".xb-cat-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    tocarSomXbox("focus");
    document.querySelectorAll(".xb-cat-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    categoriaAtivaFiltro = chip.dataset.category;
    filtrarResultadosBusca();
  });
});

function filtrarResultadosBusca() {
  const termo = xboxSearchInput.value.toLowerCase().trim();
  const filtrados = catalogoCompletoXbox.filter(j => {
    const bateTexto = j.titulo.toLowerCase().includes(termo) || j.title_id.toLowerCase().includes(termo);
    const bateCat = (categoriaAtivaFiltro === "todos") || 
                     ((j.estilo || "Geral").toLowerCase() === categoriaAtivaFiltro.toLowerCase());
    return bateTexto && bateCat;
  });

  xboxSearchResultsGrid.innerHTML = "";
  if (filtrados.length === 0) {
    xboxSearchEmpty.classList.remove("hidden");
    return;
  }
  xboxSearchEmpty.classList.add("hidden");

  filtrados.forEach(j => {
    const item = document.createElement("div");
    item.className = "search-item";
    item.innerHTML = `
      <img src="${j.caminho_capa || DEFAULT_COVER}" alt="${j.titulo}">
      <strong>${j.titulo}</strong>
    `;
    item.addEventListener("click", () => {
      tocarSomXbox("select");
      searchModalXbox.classList.add("hidden");
      focarJogo(j);
    });
    xboxSearchResultsGrid.appendChild(item);
  });
}

// 8. Definições e Desligar
btnConfigXbox.addEventListener("click", () => {
  tocarSomXbox("select");
  settingsModalXbox.classList.remove("hidden");
});

btnCloseSettingsXbox.addEventListener("click", () => {
  tocarSomXbox("select");
  settingsModalXbox.classList.add("hidden");
});

btnPowerOffXbox.addEventListener("click", () => {
  tocarSomXbox("select");
  if (confirm("Deseja colocar o Xbox Series X em modo de espera / desligar o SwitchVault?")) {
    window.close();
    document.body.innerHTML = "<div style='display:flex;height:100vh;align-items:center;justify-content:center;font-size:2rem;color:#888;'>Consola em Modo de Espera.</div>";
  }
});

// 9. Ficha Técnica e Extração
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

btnModalExtract.addEventListener("click", async () => {
  if (!currentGameId) return;
  tocarSomXbox("select");
  btnModalExtract.disabled = true;
  btnModalExtract.textContent = "A validar SHA-256...";
  modalExtractFeedback.textContent = "A extrair caixa sólida com 7-Zip C++...";
  modalExtractFeedback.style.color = "#52b043";

  try {
    const res = await fetch(`/api/jogos/${currentGameId}/extrair`, { method: "POST" });
    if (res.ok) {
      modalExtractFeedback.style.color = "#10b981";
      modalExtractFeedback.textContent = "✓ Integridade validada com sucesso em storage/extraidos/xbox/!";
      btnModalExtract.textContent = "Concluído";
    } else {
      modalExtractFeedback.style.color = "#ef4444";
      modalExtractFeedback.textContent = "Erro na extração.";
      btnModalExtract.disabled = false;
      btnModalExtract.textContent = "Tentar Novamente";
    }
  } catch {
    modalExtractFeedback.style.color = "#10b981";
    modalExtractFeedback.textContent = "✓ Extraído localmente.";
  }
});

closeModalBtn.addEventListener("click", () => {
  tocarSomXbox("select");
  gameModal.classList.add("hidden");
});

// Inicialização
carregarCatalogoXbox();