import pandas as pd
import pandas_ta as ta
from sqlalchemy.orm import Session
from app.models.stock import StockPrice

def get_stock_dataframe(ticker: str, db: Session) -> pd.DataFrame:
    rows = db.query(StockPrice).filter(
        StockPrice.ticker == ticker
    ).order_by(StockPrice.date).all()

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame([{
        "date": r.date,
        "open": r.open,
        "high": r.high,
        "low": r.low,
        "close": r.close,
        "volume": r.volume
    } for r in rows])

    df.set_index("date", inplace=True)
    return df

def add_features(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty or len(df) < 60:
        return df

    df["rsi"] = ta.rsi(df["close"], length=14)
    df["ema_20"] = ta.ema(df["close"], length=20)
    df["ema_50"] = ta.ema(df["close"], length=50)

    macd = ta.macd(df["close"])
    if macd is not None and not macd.empty:
        df["macd"] = macd.iloc[:, 0]
        df["macd_signal"] = macd.iloc[:, 1]

    bbands = ta.bbands(df["close"], length=20)
    if bbands is not None and not bbands.empty:
        df["bb_upper"] = bbands.iloc[:, 2]
        df["bb_mid"] = bbands.iloc[:, 1]
        df["bb_lower"] = bbands.iloc[:, 0]

    df["atr"] = ta.atr(df["high"], df["low"], df["close"], length=14)
    df["obv"] = ta.obv(df["close"], df["volume"])

    df["returns"] = df["close"].pct_change()
    df["volatility"] = df["returns"].rolling(20).std()

    df.dropna(inplace=True)
    return df

def get_features_for_ticker(ticker: str, db: Session) -> pd.DataFrame:
    df = get_stock_dataframe(ticker, db)
    if df.empty:
        return df
    df = add_features(df)
    print(f"{ticker}: {len(df)} rows with {len(df.columns)} features")
    return df