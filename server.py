#!/usr/bin/env python3
import argparse
import base64
import json
import mimetypes
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "config" / "playlist.json"
MEDIA_PATH = ROOT / "assets" / "media"
FLYERS_PATH = ROOT / "assets" / "flyers"


class TVRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _send_json(self, status_code, payload):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            raise ValueError("Body vazio")
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def _sanitize_filename(self, name):
        safe = "".join(ch for ch in name if ch.isalnum() or ch in ("-", "_", "."))
        return safe.strip(".")

    def _save_playlist(self, payload):
        if not isinstance(payload, dict) or not isinstance(payload.get("items"), list):
            raise ValueError("Formato inválido. Esperado: {\"items\": []}")

        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        CONFIG_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def _handle_upload(self, payload):
        if not isinstance(payload, dict):
            raise ValueError("Payload inválido")

        folder = payload.get("folder")
        filename = self._sanitize_filename(str(payload.get("filename", "")))
        content_base64 = payload.get("contentBase64")

        if folder not in ("media", "flyers"):
            raise ValueError("folder deve ser 'media' ou 'flyers'")
        if not filename:
            raise ValueError("filename inválido")
        if not isinstance(content_base64, str) or not content_base64:
            raise ValueError("contentBase64 inválido")

        try:
            content = base64.b64decode(content_base64, validate=True)
        except Exception as exc:
            raise ValueError("contentBase64 não é válido") from exc

        target_dir = MEDIA_PATH if folder == "media" else FLYERS_PATH
        target_dir.mkdir(parents=True, exist_ok=True)

        target_path = target_dir / filename
        target_path.write_bytes(content)

        rel_src = f"./assets/{folder}/{filename}"
        return {"src": rel_src}

    def do_GET(self):
        if self.path == "/api/playlist":
            try:
                if not CONFIG_PATH.exists():
                    payload = {"items": []}
                else:
                    payload = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
                    if not isinstance(payload, dict) or not isinstance(payload.get("items"), list):
                        payload = {"items": []}
                self._send_json(200, payload)
            except Exception as exc:
                self._send_json(500, {"error": f"Falha ao ler playlist: {exc}"})
            return

        super().do_GET()

    def do_POST(self):
        if self.path == "/api/playlist":
            try:
                payload = self._read_json_body()
                self._save_playlist(payload)
                self._send_json(200, {"ok": True})
            except Exception as exc:
                self._send_json(400, {"error": str(exc)})
            return

        if self.path == "/api/upload":
            try:
                payload = self._read_json_body()
                result = self._handle_upload(payload)
                self._send_json(200, {"ok": True, **result})
            except Exception as exc:
                self._send_json(400, {"error": str(exc)})
            return

        self._send_json(404, {"error": "Rota não encontrada"})

    def guess_type(self, path):
        guessed = super().guess_type(path)
        if guessed != "application/octet-stream":
            return guessed
        mime, _ = mimetypes.guess_type(path)
        return mime or guessed


def main():
    parser = argparse.ArgumentParser(description="Servidor local para TV signage")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()

    server = ThreadingHTTPServer(("0.0.0.0", args.port), TVRequestHandler)
    print(f"Servidor ativo em http://localhost:{args.port}")
    print("TV: / | Administração: /admin.html")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nA terminar servidor...")


if __name__ == "__main__":
    main()
