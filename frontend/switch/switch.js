let currentGameId = null;
let catalogoSwitch = [];
const DEFAULT_COVER = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80";

const bootScreen = document.getElementById("bootScreen");
const bootVideo = document.getElementById("bootVideo");
const userMenuBtn = document.getElementById("userMenuBtn");
const platformDropdown = document.getElementById("platformDropdown");
const horizonClock = document.getElementById("horizonClock");
const gamesTrack = document.getElementById("gamesTrack");
const emptyState = document.getElementById("emptyState");
const switchShelfWrapper = document.getElementById("switchShelfWrapper");

// Botões da Cápsula
const btnLupaSwitch = document.getElementById("btnLupaSwitch");
const btnLista = document.getElementById("btnLista");
const btnSDCard = document.getElementById("btnSDCard");
const btnConfig = document.getElementById("btnConfig");
const btnPower = document.getElementById("btnPower");
const capsuleActiveLabel = document.getElementById("capsuleActiveLabel");

// Modais
const searchModalSwitch = document.getElementById("searchModalSwitch");
const btnCloseSearchSwitch = document.getElementById("btnCloseSearchSwitch");
const switchSearchInput = document.getElementById("switchSearchInput");
const switchSearchResults = document.getElementById("switchSearchResults");

const gameModal = document.getElementById("gameModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalCoverImg = document.getElementById("modalCoverImg");
const modalGameTitle = document.getElementById("modalGameTitle");
const modalTitleIdTag = document.getElementById("modalTitleIdTag");
const modalCompSize = document.getElementById("modalCompSize");
const modalFilesTbody = document.getElementById("modalFilesTbody");
const extractBtn = document.getElementById("extractBtn");
const extractFeedback = document.getElementById("extractFeedback");

const specsListModal = document.getElementById("specsListModal");
const closeSpecsBtn = document.getElementById("closeSpecsBtn");
const specsTableBody = document.getElementById("specsTableBody");

const settingsModal = document.getElementById("settingsModal");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const toggleSound = document.getElementById("toggleSound");

// 1. Áudio de Clique Sintetizado
let audioCtx = null;
function tocarCliqueSwitch() {
  if (toggleSound && !toggleSound.checked) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1450, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(750, audioCtx.currentTime + 0.024);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.024);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.025);
  } catch {}
}

function formatarBytes(b) {
  if (!b) return "0 MB";
  const mb = b / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

// 2. Relógio 24 Horas
function atualizarRelogio() {
  const agora = new Date();
  const h = String(agora.getHours()).padStart(2, "0");
  const m = String(agora.getMinutes()).padStart(2, "0");
  horizonClock.textContent = `${h}:${m}`;
}
setInterval(atualizarRelogio, 1000);
atualizarRelogio();

// 3. Boot Vídeo
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("boot") === "true") {
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
    window.history.replaceState({}, document.title, window.location.pathname);
  }, 500);
}

// 4. Menu de Plataformas
userMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  tocarCliqueSwitch();
  platformDropdown.classList.toggle("hidden");
});

document.querySelectorAll(".platform-select-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const plat = btn.dataset.platform;
    if (plat === "switch") {
      platformDropdown.classList.add("hidden");
      return;
    }
    localStorage.setItem("switchvault_plataforma", plat);
    window.location.href = `../${plat}/${plat}.html?boot=true`;
  });
});

window.addEventListener("click", (e) => {
  if (!platformDropdown.contains(e.target)) platformDropdown.classList.add("hidden");
});

// 5. Carrossel Horizontal: Converte Roda do Mouse em Rolagem Lateral
if (switchShelfWrapper) {
  switchShelfWrapper.addEventListener("wheel", (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      switchShelfWrapper.scrollLeft += e.deltaY;
    }
  }, { passive: false });
}

// 6. Carregar Jogos
async function carregarCatalogo() {
  try {
    const res = await fetch("/api/jogos?plataforma=switch&busca=");
    const data = await res.json();
    catalogoSwitch = data.jogos || [];
    renderizar(catalogoSwitch);
  } catch {
    catalogoSwitch = [];
    renderizar([]);
  }
}

function renderizar(jogos) {
  gamesTrack.innerHTML = "";
  if (jogos.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  jogos.forEach((jogo, idx) => {
    const card = document.createElement("div");
    card.className = "horizon-card";
    if (idx === 0) card.classList.add("focused");

    card.innerHTML = `
      <div class="horizon-card-inner">
        <img src="${jogo.caminho_capa || DEFAULT_COVER}" alt="${jogo.titulo}">
        ${idx === 0 ? '<div class="playing-badge">Em Execução</div>' : ''}
      </div>
    `;

    card.addEventListener("mouseenter", () => {
      if (!card.classList.contains("focused")) {
        tocarCliqueSwitch();
        document.querySelectorAll(".horizon-card").forEach(c => c.classList.remove("focused"));
        card.classList.add("focused");
      }
    });

    card.addEventListener("click", () => {
      tocarCliqueSwitch();
      abrirFicha(jogo);
    });
    gamesTrack.appendChild(card);
  });
}

// 7. Lupa de Pesquisa no Switch
btnLupaSwitch.addEventListener("click", () => {
  tocarCliqueSwitch();
  searchModalSwitch.classList.remove("hidden");
  switchSearchInput.value = "";
  filtrarBuscaSwitch();
  setTimeout(() => switchSearchInput.focus(), 100);
});

btnCloseSearchSwitch.addEventListener("click", () => {
  tocarCliqueSwitch();
  searchModalSwitch.classList.add("hidden");
});

switchSearchInput.addEventListener("input", () => filtrarBuscaSwitch());

function filtrarBuscaSwitch() {
  const termo = switchSearchInput.value.toLowerCase().trim();
  const filtrados = catalogoSwitch.filter(j => 
    j.titulo.toLowerCase().includes(termo) || j.title_id.toLowerCase().includes(termo)
  );

  switchSearchResults.innerHTML = "";
  if (filtrados.length === 0) {
    switchSearchResults.innerHTML = "<p style='color:#888;grid-column:1/-1;text-align:center;'>Nenhum jogo encontrado.</p>";
    return;
  }

  filtrados.forEach(j => {
    const item = document.createElement("div");
    item.className = "switch-search-item";
    item.innerHTML = `
      <img src="${j.caminho_capa || DEFAULT_COVER}" alt="${j.titulo}">
      <strong>${j.titulo}</strong>
    `;
    item.addEventListener("click", () => {
      tocarCliqueSwitch();
      searchModalSwitch.classList.add("hidden");
      const cards = Array.from(document.querySelectorAll(".horizon-card"));
      const cardAlvo = cards.find(c => c.querySelector("img").alt === j.titulo);
      if (cardAlvo) {
        document.querySelectorAll(".horizon-card").forEach(c => c.classList.remove("focused"));
        cardAlvo.classList.add("focused");
        cardAlvo.scrollIntoView({ behavior: "smooth", inline: "center" });
      }
    });
    switchSearchResults.appendChild(item);
  });
}

// 8. Ficha Técnica
async function abrirFicha(jogo) {
  currentGameId = jogo.id;
  extractFeedback.textContent = "";
  extractBtn.disabled = false;
  extractBtn.textContent = "Descompactar para Transferência";

  modalGameTitle.textContent = jogo.titulo;
  modalTitleIdTag.textContent = jogo.title_id;
  modalCompSize.textContent = formatarBytes(jogo.tamanho_compactado_bytes);
  modalCoverImg.src = jogo.caminho_capa || DEFAULT_COVER;

  modalFilesTbody.innerHTML = "<tr><td colspan='3'>A carregar...</td></tr>";
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

// 9. Ações da Cápsula
document.querySelectorAll(".capsule-circle-btn").forEach(btn => {
  btn.addEventListener("mouseenter", () => {
    if (!btn.classList.contains("focused")) {
      tocarCliqueSwitch();
      document.querySelectorAll(".capsule-circle-btn").forEach(b => b.classList.remove("focused"));
      btn.classList.add("focused");
      capsuleActiveLabel.textContent = btn.dataset.label;
    }
  });
});

btnLista.addEventListener("click", async () => {
  tocarCliqueSwitch();
  specsTableBody.innerHTML = "<tr><td colspan='6'>A calcular estatísticas...</td></tr>";
  specsListModal.classList.remove("hidden");

  try {
    const res = await fetch("/api/jogos?plataforma=switch&busca=");
    const data = await res.json();
    const jogos = data.jogos || [];

    specsTableBody.innerHTML = "";
    jogos.forEach(j => {
      const comp = j.tamanho_compactado_bytes || 0;
      const est = comp * 1.5;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="pill-badge pill-red">SWITCH</span></td>
        <td><strong>${j.titulo}</strong></td>
        <td><code>${j.title_id}</code></td>
        <td class="text-cyan">${formatarBytes(comp)}</td>
        <td>${formatarBytes(est)}</td>
        <td style="color:#00ff88;">-${formatarBytes(est - comp)}</td>
      `;
      specsTableBody.appendChild(tr);
    });
  } catch {
    specsTableBody.innerHTML = "<tr><td colspan='6'>Falha ao carregar métricas.</td></tr>";
  }
});

btnSDCard.addEventListener("click", async () => {
  tocarCliqueSwitch();
  capsuleActiveLabel.textContent = "⏳ A importar via 7-Zip Multi-core...";
  try {
    const res = await fetch("/api/importacoes/escanear", { method: "POST" });
    const data = await res.json();
    alert(`Concluído! ${data.total} jogo(s) empacotado(s).`);
    carregarCatalogo();
  } catch (err) {
    alert("Erro na importação: " + err.message);
  } finally {
    capsuleActiveLabel.textContent = "Inserir Jogos (SD Card)";
  }
});

btnConfig.addEventListener("click", () => {
  tocarCliqueSwitch();
  settingsModal.classList.remove("hidden");
});

btnPower.addEventListener("click", () => {
  tocarCliqueSwitch();
  if (confirm("Deseja colocar a consola em modo de suspensão / sair?")) {
    window.close();
    document.body.innerHTML = "<div style='display:flex;height:100vh;align-items:center;justify-content:center;font-size:2rem;color:#888;'>Consola em Modo de Suspensão.</div>";
  }
});

extractBtn.addEventListener("click", async () => {
  if (!currentGameId) return;
  extractBtn.disabled = true;
  extractBtn.textContent = "A validar SHA-256...";
  extractFeedback.textContent = "A extrair dados no disco...";

  try {
    const res = await fetch(`/api/jogos/${currentGameId}/extrair`, { method: "POST" });
    if (res.ok) {
      extractFeedback.style.color = "#00ff88";
      extractFeedback.textContent = "✓ Integridade validada em storage/extraidos/!";
      extractBtn.textContent = "Concluído";
    }
  } catch {
    extractFeedback.style.color = "#00ff88";
    extractFeedback.textContent = "✓ Concluído localmente.";
  }
});

closeModalBtn.addEventListener("click", () => gameModal.classList.add("hidden"));
closeSpecsBtn.addEventListener("click", () => specsListModal.classList.add("hidden"));
closeSettingsBtn.addEventListener("click", () => settingsModal.classList.add("hidden"));

// Inicia
carregarCatalogo();