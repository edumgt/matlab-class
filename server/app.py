import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "stocks.json"
HOST = "0.0.0.0"
PORT = 8000


def load_stock_data() -> dict:
    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


class StockRequestHandler(BaseHTTPRequestHandler):
    server_version = "PythonStockBackend/1.0"

    def _send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/api/stocks":
            try:
                self._send_json(load_stock_data())
            except FileNotFoundError:
                self._send_json(
                    {"error": "stock data file not found"},
                    HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            except json.JSONDecodeError:
                self._send_json(
                    {"error": "stock data file is invalid"},
                    HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return

        if self.path == "/api/health":
            self._send_json({"status": "ok"})
            return

        self._send_json(
            {
                "message": "Python stock analysis backend",
                "endpoints": ["/api/health", "/api/stocks"],
            },
            HTTPStatus.OK,
        )


def main() -> None:
    with ThreadingHTTPServer((HOST, PORT), StockRequestHandler) as server:
        print(f"🚀 Python stock backend running on http://{HOST}:{PORT}")
        server.serve_forever()


if __name__ == "__main__":
    main()
