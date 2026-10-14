/**
 * SwitchVault - Módulo Compartilhado Global
 */

// Formatação universal de bytes para MB / GB
function formatarBytesGlobal(bytes) {
  if (!bytes || bytes === 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

// Troca de plataforma com persistência e execução do boot na nova página
function trocarPlataformaGlobal(plataformaAtual, novaPlataforma) {
  if (plataformaAtual === novaPlataforma) return;
  
  // Salva no navegador para próximas aberturas
  localStorage.setItem("switchvault_plataforma", novaPlataforma);
  
  // Redireciona para o arquivo da nova plataforma solicitando a execução do boot
  window.location.href = `../${novaPlataforma}/${novaPlataforma}.html?boot=true`;
}

// Utilitário para verificar se a página foi aberta com flag de boot
function deveRodarBoot() {
  const params = new URLSearchParams(window.location.search);
  return params.get("boot") === "true";
}

// Limpa a URL removendo a flag ?boot=true sem dar refresh na página
function limparFlagBootDaUrl() {
  window.history.replaceState({}, document.title, window.location.pathname);
}