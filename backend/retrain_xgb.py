import sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv(override=True)

from app.database import SessionLocal
from app.services.data_fetcher import fetch_and_save
from app.services.feature_engineer import get_features_for_ticker
from app.services.xgboost_trainer import train_xgboost
from app.services.model_trainer import train_lstm

TICKERS = ['MSFT', 'TSLA', 'AMZN', 'ETH-USD', '^NSEI', '^GSPC']

db = SessionLocal()

print('Loading remaining stock data...')
for ticker in TICKERS:
    print(f'  Loading {ticker}...')
    try:
        count = fetch_and_save(ticker=ticker, start='2010-01-01', end='2025-01-01', db=db)
        print(f'  Done: {count} rows')
    except Exception as e:
        print(f'  Error: {e}')

print('Training XGBoost...')
for ticker in TICKERS:
    print(f'XGBoost: {ticker}...')
    try:
        df = get_features_for_ticker(ticker, db)
        if df.empty:
            print(f'  No data!')
            continue
        result = train_xgboost(ticker, df)
        print(f'  Done! Acc: {round(result.get("accuracy",0)*100,1)}%')
    except Exception as e:
        print(f'  Error: {e}')

print('Training LSTM...')
for ticker in TICKERS:
    print(f'LSTM: {ticker}...')
    try:
        df = get_features_for_ticker(ticker, db)
        if df.empty:
            print(f'  No data!')
            continue
        result = train_lstm(ticker, df)
        print(f'  Done! Acc: {round(result.get("accuracy",0)*100,1)}%')
    except Exception as e:
        print(f'  Error: {e}')

db.close()
print('ALL DONE!')