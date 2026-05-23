import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from app.models.stock import StockPrice

def calculate_rsi(prices, period=14):
    delta = prices.diff()
    gain = delta.where(delta > 0, 0).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def calculate_macd(prices, fast=12, slow=26, signal=9):
    ema_fast = prices.ewm(span=fast).mean()
    ema_slow = prices.ewm(span=slow).mean()
    macd = ema_fast - ema_slow
    signal_line = macd.ewm(span=signal).mean()
    return macd, signal_line

def calculate_bollinger(prices, period=20):
    sma = prices.rolling(window=period).mean()
    std = prices.rolling(window=period).std()
    upper = sma + (std * 2)
    lower = sma - (std * 2)
    return upper, sma, lower

def get_features_for_ticker(ticker: str, db: Session) -> pd.DataFrame:
    rows = db.query(StockPrice).filter(
        StockPrice.ticker == ticker
    ).order_by(StockPrice.date).all()

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame([{
        'date': r.date,
        'open': float(r.open),
        'high': float(r.high),
        'low': float(r.low),
        'close': float(r.close),
        'volume': float(r.volume)
    } for r in rows])

    df.set_index('date', inplace=True)

    # RSI
    df['rsi'] = calculate_rsi(df['close'], 14)

    # MACD
    df['macd'], df['macd_signal'] = calculate_macd(df['close'])
    df['macd_hist'] = df['macd'] - df['macd_signal']

    # Bollinger Bands
    df['bb_upper'], df['bb_mid'], df['bb_lower'] = calculate_bollinger(df['close'])

    # EMA
    df['ema_20'] = df['close'].ewm(span=20).mean()
    df['ema_50'] = df['close'].ewm(span=50).mean()

    # ATR
    high_low = df['high'] - df['low']
    high_close = (df['high'] - df['close'].shift()).abs()
    low_close = (df['low'] - df['close'].shift()).abs()
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    df['atr'] = tr.rolling(14).mean()

    # OBV
    obv = [0]
    for i in range(1, len(df)):
        if df['close'].iloc[i] > df['close'].iloc[i-1]:
            obv.append(obv[-1] + df['volume'].iloc[i])
        elif df['close'].iloc[i] < df['close'].iloc[i-1]:
            obv.append(obv[-1] - df['volume'].iloc[i])
        else:
            obv.append(obv[-1])
    df['obv'] = obv

    # Returns and lags
    df['returns'] = df['close'].pct_change()
    df['returns_lag1'] = df['returns'].shift(1)
    df['macd_lag1'] = df['macd'].shift(1)
    df['macd_lag2'] = df['macd'].shift(2)
    df['rsi_lag5'] = df['rsi'].shift(5)
    df['volatility_20'] = df['returns'].rolling(20).std()
    df['day_high'] = df['high']

    df.dropna(inplace=True)

    feature_cols = [
        'open', 'high', 'low', 'close', 'volume',
        'rsi', 'macd', 'macd_signal', 'macd_hist',
        'bb_upper', 'bb_lower',
        'ema_20', 'ema_50', 'atr', 'obv',
        'returns', 'returns_lag1'
    ]

    available = [c for c in feature_cols if c in df.columns]
    df = df[available]

    print(f"{ticker}: {len(df)} rows with {len(df.columns)} features")
    return df
