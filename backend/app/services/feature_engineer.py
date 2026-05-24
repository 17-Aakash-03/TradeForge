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
    df['returns_lag2'] = df['returns'].shift(2)
    df['returns_lag3'] = df['returns'].shift(3)
    df['macd_lag1'] = df['macd'].shift(1)
    df['macd_lag2'] = df['macd'].shift(2)
    df['rsi_lag1'] = df['rsi'].shift(1)
    df['rsi_lag5'] = df['rsi'].shift(5)

    # Volatility
    df['volatility'] = df['returns'].rolling(20).std()
    df['volatility_10'] = df['returns'].rolling(10).std()

    # Additional features
    df['high_low_ratio'] = df['high'] / df['low']
    df['close_open_ratio'] = df['close'] / df['open']
    df['volume_ma'] = df['volume'].rolling(20).mean()
    df['volume_ratio'] = df['volume'] / df['volume_ma']
    df['price_momentum'] = df['close'] / df['close'].shift(10) - 1
    df['rsi_signal'] = (df['rsi'] > 70).astype(int) - (df['rsi'] < 30).astype(int)
    df['macd_cross'] = (df['macd'] > df['macd_signal']).astype(int)
    df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
    df['ema_cross'] = (df['ema_20'] > df['ema_50']).astype(int)
    df['day_high'] = df['high']
    df['day_low'] = df['low']

    df.dropna(inplace=True)

    print(f"{ticker}: {len(df)} rows with {len(df.columns)} features")
    return df