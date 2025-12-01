import yfinance as yf
import pandas as pd
from datetime import datetime

WATCH = [
    "6920.T", "8035.T", "4751.T",
    "3994.T", "4165.T", "3681.T", "4382.T"
]

def fetch_market_data():
    print("=== Market Check ===")
    print("Time:", datetime.now())
    print("--------------------")

    for code in WATCH:
        ticker = yf.Ticker(code)
        data = ticker.history(period="1d")

        if data.empty:
            print(code, "→ データ取得失敗")
            continue

        close = data["Close"].iloc[-1]
        open_price = data["Open"].iloc[-1]
        pct = (close - open_price) / open_price * 100

        print(f"{code}: 現値={close:.0f}, 始値比={pct:+.2f}%")

if __name__ == "__main__":
    fetch_market_data()
