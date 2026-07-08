const appEl = document.getElementById("app");
const videoEl = document.getElementById("videoPlayer");
const imageEl = document.getElementById("imagePlayer");
const statusEl = document.getElementById("status");

const DEFAULT_IMAGE_DURATION_SECONDS = 10;
const API_PLAYLIST_URL = "./api/playlist";
const FILE_PLAYLIST_URL = "./config/playlist.json";

let playlist = [];
let currentIndex = 0;
let imageTimerId = null;
let paused = false;
let portraitMode = false;

const orientationParam = new URLSearchParams(window.location.search).get("orientation");
const forceOrientationFromUrl = orientationParam === "portrait" || orientationParam === "landscape";

if (forceOrientationFromUrl) {
  portraitMode = orientationParam === "portrait";
}

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.classList.remove("ok", "error");
  if (type) statusEl.classList.add(type);
}

function applyOrientation() {
  appEl.classList.toggle("screen-portrait", portraitMode);
}

function applyOrientationFromSettings(settings) {
  if (forceOrientationFromUrl) return;
  portraitMode = settings?.orientation === "portrait";
  applyOrientation();
}

function toggleOrientation() {
  portraitMode = !portraitMode;
  applyOrientation();
  setStatus(`Modo ${portraitMode ? "vertical" : "horizontal"} ativo`, "ok");
}

function clearImageTimer() {
  if (imageTimerId) {
    clearTimeout(imageTimerId);
    imageTimerId = null;
  }
}

function hidePlayers() {
  videoEl.pause();
  videoEl.classList.add("hidden");
  imageEl.classList.add("hidden");
}

function parseTimeToMinutes(value) {
  if (!value || typeof value !== "string") return null;
  const parts = value.split(":").map(Number);
  if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  const [hours, minutes] = parts;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function isItemActiveNow(item, now = new Date()) {
  if (!item || typeof item !== "object") return false;
  const schedule = item.schedule;
  if (!schedule || typeof schedule !== "object") return true;

  if (Array.isArray(schedule.days) && schedule.days.length > 0) {
    if (!schedule.days.includes(now.getDay())) return false;
  }

  const startMinutes = parseTimeToMinutes(schedule.start);
  const endMinutes = parseTimeToMinutes(schedule.end);

  if (startMinutes === null || endMinutes === null) {
    return true;
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  }

  return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
}

function findNextPlayableIndex(startIndex) {
  if (!playlist.length) return -1;

  for (let offset = 0; offset < playlist.length; offset += 1) {
    const idx = (startIndex + offset) % playlist.length;
    if (isItemActiveNow(playlist[idx])) {
      return idx;
    }
  }

  return -1;
}

function showVideo(item) {
  clearImageTimer();
  imageEl.classList.add("hidden");
  videoEl.classList.remove("hidden");

  videoEl.src = item.src;
  videoEl.currentTime = 0;
  videoEl.loop = false;

  const playPromise = videoEl.play();
  if (playPromise && typeof playPromise.then === "function") {
    playPromise.catch(() => {
      setStatus("Autoplay bloqueado. Carrega em F11 e permite autoplay no browser.", "error");
    });
  }

  setStatus(`A reproduzir vídeo (${currentIndex + 1}/${playlist.length})`, "ok");
}

function showImage(item) {
  clearImageTimer();
  videoEl.pause();
  videoEl.removeAttribute("src");
  videoEl.load();
  videoEl.classList.add("hidden");

  imageEl.src = item.src;
  imageEl.classList.remove("hidden");

  const seconds = Number(item.duration ?? DEFAULT_IMAGE_DURATION_SECONDS);
  const duration = Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_IMAGE_DURATION_SECONDS;

  setStatus(`A mostrar flyer ${duration}s (${currentIndex + 1}/${playlist.length})`, "ok");
  imageTimerId = setTimeout(() => nextItem(), duration * 1000);
}

function playCurrentItem() {
  if (!playlist.length) {
    hidePlayers();
    setStatus("Playlist vazia. Edita em /admin.html", "error");
    return;
  }

  const playableIndex = findNextPlayableIndex(currentIndex);
  if (playableIndex === -1) {
    hidePlayers();
    setStatus("Sem itens ativos neste horário. Verifica o agendamento.", "error");
    return;
  }

  currentIndex = playableIndex;
  const item = playlist[currentIndex];

  if (!item || !item.type || !item.src) {
    setStatus(`Item inválido no índice ${currentIndex}.`, "error");
    return;
  }

  if (item.type === "video") {
    showVideo(item);
    return;
  }

  if (item.type === "image") {
    showImage(item);
    return;
  }

  setStatus(`Tipo '${item.type}' não suportado. Usa 'video' ou 'image'.`, "error");
}

function nextItem() {
  if (!playlist.length || paused) return;
  currentIndex = (currentIndex + 1) % playlist.length;
  playCurrentItem();
}

async function fetchPlaylistPayload(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data.items)) {
    throw new Error("Formato inválido. Esperado: { items: [] }");
  }
  return data;
}

async function loadPlaylist() {
  try {
    const data = await fetchPlaylistPayload(API_PLAYLIST_URL);
    playlist = data.items;
    applyOrientationFromSettings(data.settings);
    currentIndex = 0;
    playCurrentItem();
    return;
  } catch (_) {
    // fallback para ficheiro estático
  }

  try {
    const data = await fetchPlaylistPayload(FILE_PLAYLIST_URL);
    playlist = data.items;
    applyOrientationFromSettings(data.settings);
    currentIndex = 0;
    playCurrentItem();
  } catch (error) {
    setStatus(`Erro ao carregar playlist: ${error.message}`, "error");
  }
}

videoEl.addEventListener("ended", () => {
  nextItem();
});

videoEl.addEventListener("error", () => {
  setStatus(`Erro no vídeo: ${videoEl.currentSrc || "desconhecido"}`, "error");
  nextItem();
});

imageEl.addEventListener("error", () => {
  setStatus(`Erro na imagem: ${imageEl.currentSrc || "desconhecida"}`, "error");
  nextItem();
});

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key === "f") {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  if (key === "n") {
    nextItem();
  }

  if (key === "a") {
    window.location.href = "./admin.html";
  }

  if (key === "o") {
    toggleOrientation();
  }

  if (event.key === " ") {
    paused = !paused;
    if (!paused) {
      setStatus("Retomado", "ok");
      playCurrentItem();
    } else {
      videoEl.pause();
      clearImageTimer();
      setStatus("Pausado", "error");
    }
  }

  if (key === "r") {
    setStatus("A recarregar playlist...", "ok");
    loadPlaylist();
  }
});

applyOrientation();
loadPlaylist();
