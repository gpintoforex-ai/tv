const { connectLambda, getStore } = require("@netlify/blobs");

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime"
};

function guessMime(filename) {
  const dot = filename.lastIndexOf(".");
  const ext = dot >= 0 ? filename.slice(dot).toLowerCase() : "";
  return MIME_TYPES[ext] || "application/octet-stream";
}

exports.handler = async (event) => {
  connectLambda(event);

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Método não suportado" };
  }

  const path = event.path.replace(/^.*\/api\/media\//, "");
  const [folder, ...rest] = path.split("/");
  const filename = rest.join("/");

  if ((folder !== "media" && folder !== "flyers") || !filename) {
    return { statusCode: 404, body: "Não encontrado" };
  }

  const store = getStore("tv-media");
  const data = await store.get(`${folder}/${filename}`, { type: "arrayBuffer" });

  if (!data) {
    return { statusCode: 404, body: "Ficheiro não encontrado" };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": guessMime(filename),
      "Cache-Control": "public, max-age=31536000, immutable"
    },
    isBase64Encoded: true,
    body: Buffer.from(data).toString("base64")
  };
};
