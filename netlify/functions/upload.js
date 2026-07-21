const { getStore } = require("@netlify/blobs");

const MAX_BYTES = 20 * 1024 * 1024;

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload)
  };
}

function sanitizeFilename(name) {
  const safe = String(name || "")
    .split("")
    .filter((ch) => /[a-zA-Z0-9\-_.]/.test(ch))
    .join("");
  return safe.replace(/^\.+/, "");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Método não suportado" });
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const folder = payload.folder;
    const filename = sanitizeFilename(payload.filename);
    const contentBase64 = payload.contentBase64;

    if (folder !== "media" && folder !== "flyers") {
      return jsonResponse(400, { error: "folder deve ser 'media' ou 'flyers'" });
    }
    if (!filename) {
      return jsonResponse(400, { error: "filename inválido" });
    }
    if (typeof contentBase64 !== "string" || !contentBase64) {
      return jsonResponse(400, { error: "contentBase64 inválido" });
    }

    const buffer = Buffer.from(contentBase64, "base64");
    if (buffer.length === 0) {
      return jsonResponse(400, { error: "contentBase64 não é válido" });
    }
    if (buffer.length > MAX_BYTES) {
      return jsonResponse(400, { error: "Ficheiro excede o limite de 20MB" });
    }

    const store = getStore("tv-media");
    const key = `${folder}/${filename}`;
    await store.set(key, buffer);

    return jsonResponse(200, { ok: true, src: `./api/media/${folder}/${filename}` });
  } catch (error) {
    return jsonResponse(400, { error: error.message });
  }
};
