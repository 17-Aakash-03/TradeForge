import yfinance as yf
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.stock import StockPrice

TICKERS = [
    "RELIANCE.NS",
    "TCS.NS",
    "BTC-USD",
]

def fetch_and_save(ticker: str, start: str, end: str, db: Session):
    print(f"Downloading {ticker} from {start} to {end}...")

    try:
        db.execute(text(
            f"DELETE FROM stock_prices WHERE ticker = '{ticker}'"
        ))
        db.commit()
        print(f"Cleared old data for {ticker}")
    except Exception as e:
        db.rollback()
        print(f"Clear error: {e}")

    data = yf.download(ticker, start=start, end=end, auto_adjust=True)

    if data.empty:
        print(f"No data found for {ticker}")
        return 0

    count = 0
    batch = []

    for date, row in data.iterrows():
        try:
            o = float(row["Open"].iloc[0] if hasattr(row["Open"], 'iloc') else row["Open"])
            h = float(row["High"].iloc[0] if hasattr(row["High"], 'iloc') else row["High"])
            l = float(row["Low"].iloc[0] if hasattr(row["Low"], 'iloc') else row["Low"])
            c = float(row["Close"].iloc[0] if hasattr(row["Close"], 'iloc') else row["Close"])
            v = int(row["Volume"].iloc[0] if hasattr(row["Volume"], 'iloc') else row["Volume"])
        except Exception:
            continue

        record = StockPrice(
            ticker=ticker,
            date=date,
            open=o,
            high=h,
            low=l,
            close=c,
            volume=v,
        )
        batch.append(record)
        count += 1

        if len(batch) >= 500:
            try:
                db.bulk_save_objects(batch)
                db.commit()
                print(f"  Saved batch of {len(batch)} rows for {ticker}")
                batch = []
            except Exception as e:
                db.rollback()
                print(f"  Batch error: {e}")
                batch = []

    if batch:
        try:
            db.bulk_save_objects(batch)
            db.commit()
            print(f"  Saved final batch of {len(batch)} rows for {ticker}")
        except Exception as e:
            db.rollback()
            print(f"  Final batch error: {e}")

    print(f"Saved {count} rows for {ticker}")
    return count