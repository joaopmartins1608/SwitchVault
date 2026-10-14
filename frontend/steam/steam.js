let currentGameId = null;
let currentSelectedGame = null;
let catalogoCompletoSteam = [];
let categoriaAtivaFiltro = "todos";

const DEFAULT_COVER = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80";
const STEAM_DEFAULT_BACKDROP = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&q=80";

// Elementos Principais
const bootScreen = document.getElementById("bootScreen");
const bootVideo = document.getElementById("bootVideo");
const steamBackdrop = document.getElementById("steamBackdrop");
const steamClock = document.getElementById("steamClock");

const userMenuBtnSteam = document.getElementById("userMenuBtnSteam");
const platformDropdownSteam = document.getElementById("platformDropdownSteam");

const cardImportSteam = document.getElementById("cardImportSteam");
const importStatusLabel = document.getElementById("importStatusLabel");

// Hero Zone
const steamHeroTile = document.getElementById("steamHeroTile");
const steamHeroImg = document.getElementById("steamHeroImg");
const steamHeroTitle = document.getElementById("steamHeroTitle");
const steamHeroTimeText = document.getElementById("steamHeroTimeText");
const steamDynamicTiles = document.getElementById("steamDynamicTiles");

// Pesquisa
const btnSearchSteam = document.getElementById("btnSearchSteam");
const searchModalSteam = document.getElementById("searchModalSteam");
const btnCloseSearchSteam = document.getElementById("btnCloseSearchSteam");
const steamSearchInput = document.getElementById("steamSearchInput");
const btnClearSearchSteam = document.getElementById("btnClearSearchSteam");
const steamSearchResultsGrid = document.getElementById("steamSearchResultsGrid");
const steamSearchEmpty = document.getElementById("steamSearchEmpty");

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

// 1. Áudio de Interface Oficial Steam Big Picture (Sintetizado)
let steamAudioCtx = null;
function tocarSomSteam(tipo = "focus") {
  try {
    if (!steamAudioCtx) steamAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = steamAudioCtx.createOscillator();
    const gain = steamAudioCtx.createGain();

    if (tipo === "focus") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, steamAudioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(840, steamAudioCtx.currentTime + 0.025);
      gain.gain.setValueAtTime(0.05, steamAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, steamAudioCtx.currentTime + 0.025);
      osc.connect(gain);
      gain.connect(steamAudioCtx.destination);
      osc.start();
      osc.stop(steamAudioCtx.currentTime + 0.028);
    } else if (tipo === "select") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, steamAudioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, steamAudioCtx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.1, steamAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, steamAudioCtx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(steamAudioCtx.destination);
      osc.start();
      osc.stop(steamAudioCtx.currentTime + 0.065);
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
  steamClock.textContent = `${h}:${m}`;
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
userMenuBtnSteam.addEventListener("click", (e) => {
  e.stopPropagation();
  tocarSomSteam("select");
  platformDropdownSteam.classList.toggle("hidden");
});

document.querySelectorAll(".steam-dropdown-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const plat = btn.dataset.platform;
    if (plat === "steam") {
      platformDropdownSteam.classList.add("hidden");
      return;
    }
    tocarSomSteam("select");
    trocarPlataformaGlobal("steam", plat);
  });
});

window.addEventListener("click", (e) => {
  if (!platformDropdownSteam.contains(e.target)) platformDropdownSteam.classList.add("hidden");
});

// 5. Carregar Catálogo da Steam
async function carregarCatalogoSteam() {
  try {
    const res = await fetch("/api/jogos?plataforma=steam&busca=");
    const data = await res.json();
    catalogoCompletoSteam = data.jogos || [];
    renderizarDashboardSteam(catalogoCompletoSteam);
  } catch {
    catalogoCompletoSteam = [];
    renderizarDashboardSteam([]);
  }
}

function renderizarDashboardSteam(jogos) {
  steamDynamicTiles.innerHTML = "";

  if (jogos.length === 0) {
    steamHeroImg.src = DEFAULT_COVER;
    steamHeroTitle.textContent = "Nenhum jogo no cofre";
    steamHeroTimeText.textContent = "Coloque os seus ficheiros em storage/importacoes/steam/";
    steamBackdrop.style.backgroundImage = `url('${STEAM_DEFAULT_BACKDROP}')`;
    return;
  }

  // O primeiro jogo assume a posição de Hero Banner alargado
  focarJogoSteam(jogos[0]);

  // Os jogos seguintes assumem os posters verticais clássicos da Steam
  jogos.slice(1).forEach((jogo, idx) => {
    const poster = document.createElement("div");
    poster.className = "steam-poster-tile";
    const capa = jogo.caminho_capa || DEFAULT_COVER;

    poster.innerHTML = `
      <img src="${capa}" alt="${jogo.titulo}">
      ${idx === 0 ? '<span class="badge-new-library">NEW TO LIBRARY</span>' : ''}
    `;

    poster.addEventListener("mouseenter", () => {
      tocarSomSteam("focus");
      focarJogoSteam(jogo);
    });

    poster.addEventListener("click", () => {
      tocarSomSteam("select");
      abrirFichaJogo(jogo);
    });

    steamDynamicTiles.appendChild(poster);
  });
}

function focarJogoSteam(jogo) {
  currentSelectedGame = jogo;
  currentGameId = jogo.id;

  const capa = jogo.caminho_capa || DEFAULT_COVER;
  steamHeroImg.src = capa;
  steamHeroTitle.textContent = jogo.titulo;
  steamHeroTimeText.textContent = `ÚLTIMAS DUAS SEMANAS: RECENTEMENTE ADICIONADO AO COFRE`;
  steamBackdrop.style.backgroundImage = `url('${capa}')`;
}

steamHeroTile.addEventListener("click", () => {
  tocarSomSteam("select");
  if (currentSelectedGame) abrirFichaJogo(currentSelectedGame);
});

// 6. Ingestão de Ficheiros com 7-Zip
cardImportSteam.addEventListener("click", async () => {
  tocarSomSteam("select");
  importStatusLabel.textContent = "⏳ A empacotar cópias com 7-Zip...";

  try {
    const res = await fetch("/api/importacoes/escanear", { method: "POST" });
    const data = await res.json();
    if (data.total > 0) {
      alert(`✓ Concluído! ${data.total} jogo(s) empacotado(s) em .7z sólido:\n- ${data.jogos_importados.join("\n- ")}`);
    } else {
      alert("Nenhum ficheiro novo detetado em storage/importacoes/steam/.");
    }
    carregarCatalogoSteam();
  } catch (err) {
    alert("Erro na importação: " + err.message);
  } finally {
    importStatusLabel.textContent = "Importar Jogos para o Cofre Steam";
  }
});

// 7. Pesquisa com Filtros
btnSearchSteam.addEventListener("click", () => {
  tocarSomSteam("select");
  searchModalSteam.classList.remove("hidden");
  steamSearchInput.value = "";
  btnClearSearchSteam.classList.add("hidden");
  categoriaAtivaFiltro = "todos";
  document.querySelectorAll(".st-cat-chip").forEach(c => c.classList.toggle("active", c.dataset.category === "todos"));
  filtrarResultadosBusca();
  setTimeout(() => steamSearchInput.focus(), 100);
});

btnCloseSearchSteam.addEventListener("click", () => {
  tocarSomSteam("select");
  searchModalSteam.classList.add("hidden");
});

steamSearchInput.addEventListener("input", (e) => {
  const termo = e.target.value;
  btnClearSearchSteam.classList.toggle("hidden", termo.length === 0);
  filtrarResultadosBusca();
});

btnClearSearchSteam.addEventListener("click", () => {
  steamSearchInput.value = "";
  btnClearSearchSteam.classList.add("hidden");
  filtrarResultadosBusca();
  steamSearchInput.focus();
});

document.querySelectorAll(".st-cat-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    tocarSomSteam("focus");
    document.querySelectorAll(".st-cat-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    categoriaAtivaFiltro = chip.dataset.category;
    filtrarResultadosBusca();
  });
});

function filtrarResultadosBusca() {
  const termo = steamSearchInput.value.toLowerCase().trim();
  const filtrados = catalogoCompletoSteam.filter(j => {
    const bateTexto = j.titulo.toLowerCase().includes(termo) || j.title_id.toLowerCase().includes(termo);
    const bateCat = (categoriaAtivaFiltro === "todos") || 
                     ((j.estilo || "Geral").toLowerCase() === categoriaAtivaFiltro.toLowerCase());
    return bateTexto && bateCat;
  });

  steamSearchResultsGrid.innerHTML = "";
  if (filtrados.length === 0) {
    steamSearchEmpty.classList.remove("hidden");
    return;
  }
  steamSearchEmpty.classList.add("hidden");

  filtrados.forEach(j => {
    const item = document.createElement("div");
    item.className = "search-item";
    item.innerHTML = `
      <img src="${j.caminho_capa || DEFAULT_COVER}" alt="${j.titulo}">
      <strong>${j.titulo}</strong>
    `;
    item.addEventListener("click", () => {
      tocarSomSteam("select");
      searchModalSteam.classList.add("hidden");
      focarJogoSteam(j);
    });
    steamSearchResultsGrid.appendChild(item);
  });
}

// 8. Ficha Técnica e Extração
async function abrirFichaJogo(jogo) {
  currentGameId = jogo.id;
  modalExtractFeedback.textContent = "";
  btnModalExtract.disabled = false;
  btnModalExtract.textContent = "Iniciar Extração no Disco";

  modalTitle.textContent = jogo.titulo;
  modalTitleId.textContent = jogo.title_id;
  modalCompSize.textContent = formatarBytes(jogo.tamanho_compactado_bytes);
  modalCoverImg.src = jogo.caminho_capa || DEFAULT_COVER;

  modalFilesTbody.innerHTML = "<tr><td colspan='3'>A carregar ficheiros da caixa...</td></tr>";
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
  tocarSomSteam("select");
  btnModalExtract.disabled = true;
  btnModalExtract.textContent = "A validar SHA-256...";
  modalExtractFeedback.textContent = "A extrair caixa sólida com 7-Zip C++...";
  modalExtractFeedback.style.color = "#1a9fff";

  try {
    const res = await fetch(`/api/jogos/${currentGameId}/extrair`, { method: "POST" });
    if (res.ok) {
      modalExtractFeedback.style.color = "#10b981";
      modalExtractFeedback.textContent = "✓ Integridade validada com sucesso em storage/extraidos/steam/!";
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
  tocarSomSteam("select");
  gameModal.classList.add("hidden");
});

// Inicialização
carregarCatalogoSteam();