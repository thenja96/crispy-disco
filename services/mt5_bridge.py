from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, urlparse

TIMEFRAME_NAMES = {
    "M1": "TIMEFRAME_M1",
    "M5": "TIMEFRAME_M5",
    "M15": "TIMEFRAME_M15",
    "M30": "TIMEFRAME_M30",
    "H1": "TIMEFRAME_H1",
    "H4": "TIMEFRAME_H4",
    "D1": "TIMEFRAME_D1",
}


class Mt5Runtime:
    def __init__(self, default_symbol: str) -> None:
        self.default_symbol = default_symbol
        self.mt5: Any | None = None
        self.error: str | None = None
        self._load()

    def _load(self) -> None:
        try:
            import MetaTrader5 as mt5  # type: ignore[import-not-found]
        except Exception as exc:  # pragma: no cover - depends on local terminal setup
            self.error = f"MetaTrader5 Python package is not available: {exc}"
            return

        if not mt5.initialize():
            self.error = f"MT5 initialize failed: {mt5.last_error()}"
            return

        self.mt5 = mt5

    def timeframe(self, name: str) -> Any:
        if self.mt5 is None:
            raise RuntimeError(self.error or "MT5 is not initialized")

        constant_name = TIMEFRAME_NAMES.get(name.upper())
        if constant_name is None:
            raise ValueError(f"Unsupported timeframe: {name}")

        return getattr(self.mt5, constant_name)

    def candles(self, symbol: str, timeframe: str, bars: int) -> list[dict[str, Any]]:
        if self.mt5 is None:
            raise RuntimeError(self.error or "MT5 is not initialized")

        if not self.mt5.symbol_select(symbol, True):
            raise RuntimeError(f"Could not select symbol {symbol}. Check MT5 Market Watch symbol name.")

        rates = self.mt5.copy_rates_from_pos(symbol, self.timeframe(timeframe), 0, bars)
        if rates is None:
            raise RuntimeError(f"No rates returned for {symbol}: {self.mt5.last_error()}")

        output = []
        for rate in rates:
            output.append(
                {
                    "time": datetime.fromtimestamp(int(rate["time"]), tz=timezone.utc).isoformat().replace("+00:00", "Z"),
                    "open": float(rate["open"]),
                    "high": float(rate["high"]),
                    "low": float(rate["low"]),
                    "close": float(rate["close"]),
                }
            )
        return output

    def tick(self, symbol: str) -> dict[str, Any]:
        if self.mt5 is None:
            raise RuntimeError(self.error or "MT5 is not initialized")

        if not self.mt5.symbol_select(symbol, True):
            raise RuntimeError(f"Could not select symbol {symbol}. Check MT5 Market Watch symbol name.")

        tick = self.mt5.symbol_info_tick(symbol)
        if tick is None:
            raise RuntimeError(f"No tick returned for {symbol}: {self.mt5.last_error()}")

        return {
            "symbol": symbol,
            "bid": float(tick.bid),
            "ask": float(tick.ask),
            "last": float(tick.last),
            "time": datetime.fromtimestamp(int(tick.time), tz=timezone.utc).isoformat().replace("+00:00", "Z"),
        }

    def symbols(self, pattern: str) -> list[dict[str, Any]]:
        if self.mt5 is None:
            raise RuntimeError(self.error or "MT5 is not initialized")

        symbols = self.mt5.symbols_get(pattern) or []
        return [
            {
                "name": symbol.name,
                "description": symbol.description,
                "visible": bool(symbol.visible),
                "path": symbol.path,
            }
            for symbol in symbols
        ]


def make_handler(runtime: Mt5Runtime) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def do_OPTIONS(self) -> None:
            self.send_response(204)
            self._cors()
            self.end_headers()

        def do_GET(self) -> None:
            parsed = urlparse(self.path)
            query = parse_qs(parsed.query)
            symbol = query.get("symbol", [runtime.default_symbol])[0]

            try:
                if parsed.path == "/health":
                    self._json({"ok": runtime.mt5 is not None, "symbol": runtime.default_symbol, "error": runtime.error})
                    return

                if parsed.path == "/api/candles":
                    timeframe = query.get("timeframe", ["M15"])[0]
                    bars = max(10, min(1000, int(query.get("bars", ["300"])[0])))
                    self._json({"symbol": symbol, "timeframe": timeframe.upper(), "candles": runtime.candles(symbol, timeframe, bars)})
                    return

                if parsed.path == "/api/tick":
                    self._json(runtime.tick(symbol))
                    return

                if parsed.path == "/api/symbols":
                    pattern = query.get("pattern", ["*XAU*"])[0]
                    self._json({"pattern": pattern, "symbols": runtime.symbols(pattern)})
                    return

                self._json({"error": "Not found"}, status=404)
            except Exception as exc:
                self._json({"error": str(exc)}, status=503)

        def log_message(self, format: str, *args: Any) -> None:
            sys.stderr.write(f"MT5 bridge: {format % args}\n")

        def _cors(self) -> None:
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def _json(self, payload: dict[str, Any], status: int = 200) -> None:
            encoded = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

    return Handler


def main() -> None:
    parser = argparse.ArgumentParser(description="Local MT5 candle bridge for XAUUSD Command Center.")
    parser.add_argument("--symbol", default="XAUUSD.s")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    runtime = Mt5Runtime(args.symbol)
    server = ThreadingHTTPServer((args.host, args.port), make_handler(runtime))
    print(f"MT5 bridge listening on http://{args.host}:{args.port} for {args.symbol}", flush=True)
    if runtime.error:
      print(runtime.error, file=sys.stderr, flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
