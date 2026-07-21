const listEl = document.getElementById("list");
const statusEl = document.getElementById("adminStatus");
const saveBtn = document.getElementById("saveBtn");
const addBtn = document.getElementById("addBtn");
const reloadBtn = document.getElementById("reloadBtn");
const screenOrientationEl = document.getElementById("screenOrientation");
const showClockEl = document.getElementById("showClock");
const weatherPositionEl = document.getElementById("weatherPosition");
const previewModalEl = document.getElementById("previewModal");
const previewDialogEl = document.getElementById("previewDialog");
const previewCloseEl = document.getElementById("previewClose");

const API_PLAYLIST_URL = "./api/playlist";
const FILE_PLAYLIST_URL = "./config/playlist.json";
const API_UPLOAD_URL = "./api/upload";

const WEATHER_POSITIONS = ["top-right", "top-left", "bottom-right", "bottom-left"];

let playlist = [];
let appSettings = {
  orientation: "landscape",
  showClock: false,
  weatherPosition: "top-right"
};

function normalizeWeatherPosition(value) {
  return WEATHER_POSITIONS.includes(value) ? value : "top-right";
}

const newTypeEl = document.getElementById("newType");
const newDurationEl = document.getElementById("newDuration");
const newSrcEl = document.getElementById("newSrc");
const newFileEl = document.getElementById("newFile");
const newStartEl = document.getElementById("newStart");
const newEndEl = document.getElementById("newEnd");
const newDaysEl = document.getElementById("newDays");

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.classList.remove("ok", "error");
  if (type) statusEl.classList.add(type);
}

function normalizeOrientation(value) {
  return value === "portrait" ? "portrait" : "landscape";
}

function applySettingsToForm() {
  screenOrientationEl.value = normalizeOrientation(appSettings.orientation);
  showClockEl.value = appSettings.showClock ? "true" : "false";
  weatherPositionEl.value = normalizeWeatherPosition(appSettings.weatherPosition);
}

function readSettingsFromForm() {
  appSettings.orientation = normalizeOrientation(screenOrientationEl.value);
  appSettings.showClock = showClockEl.value === "true";
  appSettings.weatherPosition = normalizeWeatherPosition(weatherPositionEl.value);
}

function parseDays(value) {
  if (!value || !value.trim()) return [];
  const result = value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((num) => Number.isInteger(num) && num >= 0 && num <= 6);

  return [...new Set(result)];
}

function daysToText(days) {
  if (!Array.isArray(days) || days.length === 0) return "";
  return days.join(",");
}

function buildSchedule(start, end, daysText) {
  const schedule = {};
  const days = parseDays(daysText);

  if (start) schedule.start = start;
  if (end) schedule.end = end;
  if (days.length > 0) schedule.days = days;

  return Object.keys(schedule).length > 0 ? schedule : undefined;
}

function normalizeItem(item) {
  const normalized = {
    type: item.type === "image" ? "image" : "video",
    src: String(item.src || "").trim()
  };

  if (normalized.type === "image") {
    const duration = Number(item.duration);
    normalized.duration = Number.isFinite(duration) && duration > 0 ? duration : 10;
  }

  if (item.schedule && typeof item.schedule === "object") {
    const schedule = buildSchedule(
      String(item.schedule.start || ""),
      String(item.schedule.end || ""),
      daysToText(item.schedule.days)
    );
    if (schedule) normalized.schedule = schedule;
  }

  return normalized;
}

function closePreviewModal() {
  previewModalEl.classList.add("hidden");
  previewModalEl.setAttribute("aria-hidden", "true");
  previewDialogEl.innerHTML = "";
}

function openPreviewModal(item) {
  previewDialogEl.innerHTML = "";

  const media = document.createElement(item.type === "image" ? "img" : "video");
  media.src = item.src;
  media.title = item.src;

  if (item.type === "image") {
    media.alt = "Pré-visualização ampliada do flyer";
  } else {
    media.controls = true;
    media.autoplay = true;
    media.muted = true;
    media.playsInline = true;
  }

  previewDialogEl.appendChild(media);
  previewModalEl.classList.remove("hidden");
  previewModalEl.setAttribute("aria-hidden", "false");
  previewCloseEl.focus();
}

function createPreview(item) {
  const preview = document.createElement("div");
  preview.className = "playlist-preview";
  preview.tabIndex = 0;
  preview.role = "button";
  preview.ariaLabel = "Ampliar pré-visualização";

  const media = document.createElement(item.type === "image" ? "img" : "video");
  media.src = item.src;
  media.title = item.src;

  if (item.type === "image") {
    media.alt = "Pré-visualização do flyer";
    media.loading = "lazy";
  } else {
    media.controls = true;
    media.muted = true;
    media.preload = "metadata";
    media.playsInline = true;
  }

  media.addEventListener("error", () => {
    preview.classList.add("playlist-preview-error");
    preview.textContent = "Pré-visualização indisponível";
  });

  preview.appendChild(media);
  preview.addEventListener("click", () => openPreviewModal(item));
  preview.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPreviewModal(item);
    }
  });

  return preview;
}

function createRow(item, index) {
  const row = document.createElement("div");
  row.className = "playlist-item";

  const typeLabel = item.type === "image" ? "Flyer" : "Vídeo";
  const durationText = item.type === "image" ? ` | ${item.duration || 10}s` : "";
  const scheduleText = item.schedule
    ? ` | ${item.schedule.start || "--:--"}-${item.schedule.end || "--:--"} | dias: ${daysToText(item.schedule.days) || "todos"}`
    : "";

  const content = document.createElement("div");
  content.className = "playlist-content";

  const main = document.createElement("div");
  main.className = "playlist-main";

  const title = document.createElement("strong");
  title.textContent = `${index + 1}. ${typeLabel}`;

  const details = document.createElement("span");
  details.textContent = `${item.src}${durationText}${scheduleText}`;

  const openLink = document.createElement("a");
  openLink.className = "playlist-open";
  openLink.href = item.src;
  openLink.target = "_blank";
  openLink.rel = "noopener";
  openLink.textContent = "Abrir ficheiro";

  main.append(title, details, openLink);
  content.append(createPreview(item), main);

  const actions = document.createElement("div");
  actions.className = "playlist-actions";

  [
    ["up", "↑"],
    ["down", "↓"],
    ["edit", "Editar"],
    ["delete", "Remover"]
  ].forEach(([action, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.textContent = label;
    actions.appendChild(button);
  });

  row.append(content, actions);

  row.querySelector('[data-action="up"]').addEventListener("click", () => moveItem(index, -1));
  row.querySelector('[data-action="down"]').addEventListener("click", () => moveItem(index, 1));
  row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteItem(index));
  row.querySelector('[data-action="edit"]').addEventListener("click", () => editItem(index));

  return row;
}

function renderList() {
  listEl.innerHTML = "";

  if (!playlist.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Sem itens na playlist.";
    listEl.appendChild(empty);
    return;
  }

  playlist.forEach((item, index) => {
    listEl.appendChild(createRow(item, index));
  });
}

function moveItem(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= playlist.length) return;
  [playlist[index], playlist[target]] = [playlist[target], playlist[index]];
  renderList();
}

function deleteItem(index) {
  playlist.splice(index, 1);
  renderList();
}

function editItem(index) {
  const item = playlist[index];

  const newSrc = prompt("Src/caminho do item", item.src);
  if (newSrc === null) return;

  const newType = prompt("Tipo (video/image)", item.type);
  if (newType === null) return;

  const newDuration = item.type === "image"
    ? prompt("Duração da imagem (segundos)", String(item.duration || 10))
    : null;

  const currentStart = item.schedule?.start || "";
  const currentEnd = item.schedule?.end || "";
  const currentDays = daysToText(item.schedule?.days || []);

  const start = prompt("Hora início HH:MM (vazio sem limite)", currentStart);
  if (start === null) return;

  const end = prompt("Hora fim HH:MM (vazio sem limite)", currentEnd);
  if (end === null) return;

  const days = prompt("Dias 0-6 separados por vírgula (vazio=todos)", currentDays);
  if (days === null) return;

  const normalized = normalizeItem({
    type: String(newType).trim().toLowerCase(),
    src: String(newSrc).trim(),
    duration: newDuration,
    schedule: buildSchedule(start.trim(), end.trim(), days.trim())
  });

  if (!normalized.src) {
    setStatus("Item inválido: src obrigatório.", "error");
    return;
  }

  playlist[index] = normalized;
  renderList();
  setStatus("Item atualizado localmente.", "ok");
}

async function readFileAsBase64(file) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function uploadFileIfNeeded(type, file) {
  if (!file) return null;

  const folder = type === "image" ? "flyers" : "media";
  const payload = {
    folder,
    filename: file.name,
    contentBase64: await readFileAsBase64(file)
  };

  const response = await fetch(API_UPLOAD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || `Upload falhou (HTTP ${response.status})`);
  }

  return data.src;
}

async function addItem() {
  const type = newTypeEl.value;
  const file = newFileEl.files?.[0] || null;

  try {
    let src = newSrcEl.value.trim();
    if (file) {
      setStatus("A fazer upload...", "");
      src = await uploadFileIfNeeded(type, file);
    }

    const schedule = buildSchedule(newStartEl.value.trim(), newEndEl.value.trim(), newDaysEl.value.trim());

    const item = normalizeItem({
      type,
      src,
      duration: newDurationEl.value,
      schedule
    });

    if (!item.src) {
      setStatus("Define um src manual ou seleciona um ficheiro.", "error");
      return;
    }

    playlist.push(item);
    renderList();

    newSrcEl.value = "";
    newFileEl.value = "";
    newStartEl.value = "";
    newEndEl.value = "";
    newDaysEl.value = "";

    setStatus("Item adicionado. Clica em 'Guardar playlist' para aplicar no TV.", "ok");
  } catch (error) {
    setStatus(`Erro ao adicionar item: ${error.message}`, "error");
  }
}

async function savePlaylist() {
  readSettingsFromForm();

  try {
    const response = await fetch(API_PLAYLIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: {
          orientation: normalizeOrientation(appSettings.orientation),
          showClock: Boolean(appSettings.showClock),
          weatherPosition: normalizeWeatherPosition(appSettings.weatherPosition)
        },
        items: playlist
      })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || `Falha ao guardar (HTTP ${response.status})`);
    }

    setStatus("Playlist e modo de ecrã gravados com sucesso.", "ok");
  } catch (error) {
    setStatus(`Erro ao guardar playlist: ${error.message}`, "error");
  }
}

function hydrateFromPayload(data) {
  playlist = Array.isArray(data.items) ? data.items.map(normalizeItem) : [];
  appSettings.orientation = normalizeOrientation(data?.settings?.orientation);
  appSettings.showClock = Boolean(data?.settings?.showClock);
  appSettings.weatherPosition = normalizeWeatherPosition(data?.settings?.weatherPosition);
  applySettingsToForm();
  renderList();
}

async function loadPlaylist() {
  try {
    const response = await fetch(API_PLAYLIST_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    hydrateFromPayload(data);
    setStatus("Playlist carregada da API.", "ok");
    return;
  } catch (_) {
    // fallback estático
  }

  try {
    const response = await fetch(FILE_PLAYLIST_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    hydrateFromPayload(data);
    setStatus("Playlist carregada de ficheiro estático.", "ok");
  } catch (error) {
    playlist = [];
    appSettings.orientation = "landscape";
    appSettings.showClock = false;
    appSettings.weatherPosition = "top-right";
    applySettingsToForm();
    renderList();
    setStatus(`Erro ao carregar playlist: ${error.message}`, "error");
  }
}

saveBtn.addEventListener("click", savePlaylist);
addBtn.addEventListener("click", addItem);
reloadBtn.addEventListener("click", loadPlaylist);
previewCloseEl.addEventListener("click", closePreviewModal);
previewModalEl.addEventListener("click", (event) => {
  if (event.target === previewModalEl) closePreviewModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !previewModalEl.classList.contains("hidden")) {
    closePreviewModal();
  }
});

loadPlaylist();
