const fs = require("fs");
const path = require("path");
const { getStore } = require("@netlify/blobs");

const STORE_NAME = "tv-config";
const KEY = "playlist.json";
const DEFAULT_PAYLOAD = { settings: { orientation: "landscape" }, items: [] };

function readBundledPlaylist() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, "..", "..", "config", "playlist.json"), "utf-8");
    const payload = JSON.parse(raw);
    return isValidPayload(payload) ? payload : DEFAULT_PAYLOAD;
  } catch (_) {
    return DEFAULT_PAYLOAD;
  }
}

function isValidPayload(payload) {
  return payload && typeof payload === "object" && Array.isArray(payload.items);
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload)
  };
}

exports.handler = async (event) => {
  const store = getStore(STORE_NAME);

  if (event.httpMethod === "GET") {
    try {
      const payload = await store.get(KEY, { type: "json" });
      return jsonResponse(200, isValidPayload(payload) ? payload : readBundledPlaylist());
    } catch (error) {
      return jsonResponse(500, { error: `Falha ao ler playlist: ${error.message}` });
    }
  }

  if (event.httpMethod === "POST") {
    try {
      const payload = JSON.parse(event.body || "{}");
      if (!Array.isArray(payload.items)) {
        return jsonResponse(400, { error: 'Formato inválido. Esperado: {"items": []}' });
      }
      await store.setJSON(KEY, payload);
      return jsonResponse(200, { ok: true });
    } catch (error) {
      return jsonResponse(400, { error: error.message });
    }
  }

  return jsonResponse(405, { error: "Método não suportado" });
};
