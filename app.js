const appEl = document.getElementById("app");
const videoEl = document.getElementById("videoPlayer");
const imageEl = document.getElementById("imagePlayer");
const weatherWidgetEl = document.getElementById("weatherWidget");
const weatherIconEl = document.getElementById("weatherIcon");
const weatherPeriodEl = document.getElementById("weatherPeriod");
const weatherTempEl = document.getElementById("weatherTemp");
const weatherDescEl = document.getElementById("weatherDesc");
const weatherTimeEl = document.getElementById("weatherTime");

const DEFAULT_IMAGE_DURATION_SECONDS = 10;
const API_PLAYLIST_URL = "./api/playlist";
const FILE_PLAYLIST_URL = "./config/playlist.json";
const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";
const WEATHER_REFRESH_MS = 10 * 60 * 1000;
const CLOCK_REFRESH_MS = 30 * 1000;
const DEFAULT_COORDS = { latitude: 38.7167, longitude: -9.1333 };
const WEATHER_POSITIONS = ["top-right", "top-left", "bottom-right", "bottom-left"];

const WEATHER_CODES = {
  0: { desc: "Céu limpo", icon: "clear" },
  1: { desc: "Praticamente limpo", icon: "clear" },
  2: { desc: "Parcialmente nublado", icon: "cloudy" },
  3: { desc: "Nublado", icon: "cloudy" },
  45: { desc: "Nevoeiro", icon: "fog" },
  48: { desc: "Nevoeiro gelado", icon: "fog" },
  51: { desc: "Chuvisco fraco", icon: "rain" },
  53: { desc: "Chuvisco", icon: "rain" },
  55: { desc: "Chuvisco forte", icon: "rain" },
  56: { desc: "Chuvisco gelado", icon: "rain" },
  57: { desc: "Chuvisco gelado forte", icon: "rain" },
  61: { desc: "Chuva fraca", icon: "rain" },
  63: { desc: "Chuva", icon: "rain" },
  65: { desc: "Chuva forte", icon: "rain" },
  66: { desc: "Chuva gelada", icon: "rain" },
  67: { desc: "Chuva gelada forte", icon: "rain" },
  71: { desc: "Neve fraca", icon: "snow" },
  73: { desc: "Neve", icon: "snow" },
  75: { desc: "Neve forte", icon: "snow" },
  77: { desc: "Granizo fino", icon: "snow" },
  80: { desc: "Aguaceiros fracos", icon: "rain" },
  81: { desc: "Aguaceiros", icon: "rain" },
  82: { desc: "Aguaceiros fortes", icon: "rain" },
  85: { desc: "Aguaceiros de neve", icon: "snow" },
  86: { desc: "Aguaceiros de neve fortes", icon: "snow" },
  95: { desc: "Trovoada", icon: "storm" },
  96: { desc: "Trovoada com granizo", icon: "storm" },
  99: { desc: "Trovoada com granizo forte", icon: "storm" }
};

const WEATHER_ICONS = {
  clear: (isDay) => isDay
    ? '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="14" fill="#ffd25a"/><g stroke="#ffd25a" stroke-width="4" stroke-linecap="round"><line x1="32" y1="4" x2="32" y2="12"/><line x1="32" y1="52" x2="32" y2="60"/><line x1="4" y1="32" x2="12" y2="32"/><line x1="52" y1="32" x2="60" y2="32"/><line x1="12" y1="12" x2="17.5" y2="17.5"/><line x1="46.5" y1="46.5" x2="52" y2="52"/><line x1="12" y1="52" x2="17.5" y2="46.5"/><line x1="46.5" y1="17.5" x2="52" y2="12"/></g></svg>'
    : '<svg viewBox="0 0 64 64"><path d="M42 8a20 20 0 1 0 14 34 16 16 0 0 1-14-34z" fill="#e8ecf7"/></svg>',
  cloudy: () => '<svg viewBox="0 0 64 64"><circle cx="24" cy="28" r="12" fill="#ffd25a"/><path d="M20 44a12 12 0 0 1 0-24 14 14 0 0 1 27 4 10 10 0 0 1-3 20H20z" fill="#f4f7ff"/></svg>',
  fog: () => '<svg viewBox="0 0 64 64"><g stroke="#e8ecf7" stroke-width="4" stroke-linecap="round"><line x1="8" y1="24" x2="56" y2="24"/><line x1="8" y1="34" x2="56" y2="34"/><line x1="8" y1="44" x2="56" y2="44"/></g></svg>',
  rain: () => '<svg viewBox="0 0 64 64"><path d="M18 34a12 12 0 0 1 0-24 14 14 0 0 1 27 4 10 10 0 0 1-3 20H18z" fill="#f4f7ff"/><g stroke="#bcd4ff" stroke-width="4" stroke-linecap="round"><line x1="22" y1="46" x2="18" y2="56"/><line x1="34" y1="46" x2="30" y2="56"/><line x1="46" y1="46" x2="42" y2="56"/></g></svg>',
  snow: () => '<svg viewBox="0 0 64 64"><path d="M18 32a12 12 0 0 1 0-24 14 14 0 0 1 27 4 10 10 0 0 1-3 20H18z" fill="#f4f7ff"/><g fill="#dce8ff"><circle cx="20" cy="50" r="3"/><circle cx="32" cy="54" r="3"/><circle cx="44" cy="50" r="3"/></g></svg>',
  storm: () => '<svg viewBox="0 0 64 64"><path d="M18 30a12 12 0 0 1 0-24 14 14 0 0 1 27 4 10 10 0 0 1-3 20H18z" fill="#e8ecf7"/><path d="M30 40l-8 14h8l-4 10 14-16h-8l6-8z" fill="#ffd25a"/></svg>'
};

let playlist = [];
let currentIndex = 0;
let imageTimerId = null;
let weatherClockTimerId = null;
let weatherFetchTimerId = null;
let paused = false;
let portraitMode = false;
let lastWeatherData = null;

const orientationParam = new URLSearchParams(window.location.search).get("orientation");
const forceOrientationFromUrl = orientationParam === "portrait" || orientationParam === "landscape";

if (forceOrientationFromUrl) {
  portraitMode = orientationParam === "portrait";
}

function setStatus(message, type = "") {
  if (type === "error") {
    console.error(message);
  } else {
    console.log(message);
  }
}

function applyOrientation() {
  appEl.classList.toggle("screen-portrait", portraitMode);
}

function applyOrientationFromSettings(settings) {
  if (forceOrientationFromUrl) return;
  portraitMode = settings?.orientation === "portrait";
  applyOrientation();
}

function getDayPeriod(hour) {
  if (hour >= 5 && hour < 12) return "Manhã";
  if (hour >= 12 && hour < 20) return "Tarde";
  return "Noite";
}

function updateWeatherClock() {
  const now = new Date();
  weatherPeriodEl.textContent = getDayPeriod(now.getHours());
  weatherTimeEl.textContent = now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function renderWeather(data) {
  const info = WEATHER_CODES[data.weatherCode] || { desc: "Condição desconhecida", icon: "cloudy" };
  const iconFn = WEATHER_ICONS[info.icon] || WEATHER_ICONS.cloudy;
  weatherIconEl.innerHTML = iconFn(data.isDay);
  weatherTempEl.textContent = `${Math.round(data.temperature)}°C`;
  weatherDescEl.textContent = info.desc;
}

async function fetchWeather(coords) {
  const params = new URLSearchParams({
    latitude: coords.latitude,
    longitude: coords.longitude,
    current: "temperature_2m,weather_code,is_day",
    timezone: "auto"
  });

  const response = await fetch(`${WEATHER_API_URL}?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const current = data.current;
  if (!current) throw new Error("Resposta de meteorologia inválida");

  return {
    temperature: current.temperature_2m,
    weatherCode: current.weather_code,
    isDay: current.is_day === 1
  };
}

function getCoords() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(DEFAULT_COORDS);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(DEFAULT_COORDS),
      { timeout: 8000 }
    );
  });
}

async function refreshWeather() {
  try {
    const coords = await getCoords();
    lastWeatherData = await fetchWeather(coords);
    renderWeather(lastWeatherData);
  } catch (_) {
    if (lastWeatherData) renderWeather(lastWeatherData);
  }
}

function stopWeatherWidget() {
  if (weatherClockTimerId) {
    clearInterval(weatherClockTimerId);
    weatherClockTimerId = null;
  }
  if (weatherFetchTimerId) {
    clearInterval(weatherFetchTimerId);
    weatherFetchTimerId = null;
  }
  weatherWidgetEl.classList.add("hidden");
}

function startWeatherWidget() {
  weatherWidgetEl.classList.remove("hidden");
  updateWeatherClock();
  if (!weatherClockTimerId) {
    weatherClockTimerId = setInterval(updateWeatherClock, CLOCK_REFRESH_MS);
  }
  if (!weatherFetchTimerId) {
    refreshWeather();
    weatherFetchTimerId = setInterval(refreshWeather, WEATHER_REFRESH_MS);
  }
}

function applyWeatherPosition(position) {
  const normalized = WEATHER_POSITIONS.includes(position) ? position : "top-right";
  WEATHER_POSITIONS.forEach((pos) => weatherWidgetEl.classList.remove(`pos-${pos}`));
  weatherWidgetEl.classList.add(`pos-${normalized}`);
}

function applyClockFromSettings(settings) {
  applyWeatherPosition(settings?.weatherPosition);
  if (settings?.showClock) {
    startWeatherWidget();
  } else {
    stopWeatherWidget();
  }
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
    applyClockFromSettings(data.settings);
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
    applyClockFromSettings(data.settings);
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
