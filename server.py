#!/usr/bin/env python3
"""
스마트스토어 AI 설명 생성 - 로컬 프록시 서버
사용법: python3 server.py
접속: http://localhost:3000
"""
import http.server
import json
import urllib.request
import urllib.error
import os

PORT = 3000
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {format % args}")

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, x-api-key, anthropic-version")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/claude":
            self.handle_claude()
        else:
            self.send_error(404, "Not Found")

    def handle_claude(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            data = json.loads(body)

            api_key = data.get("apiKey", "")
            payload = data.get("payload", {})

            if not api_key:
                self.send_json(400, {"error": "API 키가 없습니다."})
                return

            req = urllib.request.Request(
                "https://api.anthropic.com/v1/messages",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                },
                method="POST"
            )
            with urllib.request.urlopen(req) as resp:
                result = json.loads(resp.read())
            self.send_json(200, result)

        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                err_json = json.loads(err_body)
            except Exception:
                err_json = {"error": err_body}
            self.send_json(e.code, err_json)
        except Exception as e:
            self.send_json(500, {"error": str(e)})

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/" or path == "":
            path = "/index.html"
        file_path = os.path.join(STATIC_DIR, path.lstrip("/"))
        if os.path.isfile(file_path):
            self.serve_file(file_path)
        else:
            self.send_error(404, "File not found")

    def serve_file(self, file_path):
        ext = os.path.splitext(file_path)[1]
        content_types = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css",
            ".js": "application/javascript",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".svg": "image/svg+xml",
        }
        ct = content_types.get(ext, "application/octet-stream")
        with open(file_path, "rb") as f:
            content = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ct)
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(content)

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

if __name__ == "__main__":
    server = http.server.HTTPServer(("", PORT), Handler)
    print(f"서버 시작! 브라우저에서 http://localhost:{PORT} 으로 접속하세요.")
    print("종료하려면 Ctrl+C 를 누르세요.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n서버를 종료합니다.")
