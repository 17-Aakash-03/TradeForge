import os
import joblib
import time
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

MODELS_DIR = "app/models_saved"
TICKERS = [
    "RELIANCE.NS", "TCS.NS", "BTC-USD",
    "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS", "WIPRO.NS",
    "ADANIENT.NS", "BAJFINANCE.NS", "ITC.NS",
    "AAPL", "GOOGL", "MSFT", "TSLA", "AMZN",
    "ETH-USD", "^NSEI", "^GSPC"
]
MODEL_TYPES = ["lstm", "xgboost"]

def get_model_age_days(ticker: str, model_type: str) -> float:
    ticker_clean = ticker.replace('.', '_')
    if model_type == "lstm":
        path = f"{MODELS_DIR}/lstm_{ticker_clean}.keras"
    else:
        path = f"{MODELS_DIR}/xgboost_{ticker_clean}.pkl"

    if not os.path.exists(path):
        return 999.0

    modified_time = os.path.getmtime(path)
    age_seconds = time.time() - modified_time
    return age_seconds / 86400

def get_retraining_status() -> dict:
    status = []
    for ticker in TICKERS:
        for model_type in MODEL_TYPES:
            age = get_model_age_days(ticker, model_type)
            ticker_clean = ticker.replace('.', '_')
            if model_type == "lstm":
                path = f"{MODELS_DIR}/lstm_{ticker_clean}.keras"
            else:
                path = f"{MODELS_DIR}/xgboost_{ticker_clean}.pkl"

            exists = os.path.exists(path)
            last_trained = None
            if exists:
                modified_time = os.path.getmtime(path)
                last_trained = datetime.fromtimestamp(modified_time).strftime('%Y-%m-%d %H:%M')

            status.append({
                "ticker": ticker,
                "model": model_type.upper(),
                "exists": exists,
                "age_days": round(age, 1),
                "last_trained": last_trained,
                "needs_retraining": age > 7,
                "status": "Fresh" if age <= 7 else "Outdated" if exists else "Not trained"
            })

    return {
        "models": status,
        "total_models": len(status),
        "outdated_count": sum(1 for m in status if m["needs_retraining"]),
        "fresh_count": sum(1 for m in status if not m["needs_retraining"] and m["exists"]),
        "checked_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }

def retrain_all_models(db: Session, force: bool = False) -> dict:
    from app.services.feature_engineer import get_features_for_ticker
    from app.services.model_trainer import train_lstm
    from app.services.xgboost_trainer import train_xgboost

    results = []
    start_time = datetime.now()

    for ticker in TICKERS:
        for model_type in MODEL_TYPES:
            age = get_model_age_days(ticker, model_type)

            if not force and age <= 7:
                results.append({
                    "ticker": ticker,
                    "model": model_type.upper(),
                    "action": "skipped",
                    "reason": f"Model is fresh ({round(age, 1)} days old)"
                })
                continue

            try:
                print(f"Retraining {model_type.upper()} for {ticker}...")
                df = get_features_for_ticker(ticker, db)

                if df.empty:
                    results.append({
                        "ticker": ticker,
                        "model": model_type.upper(),
                        "action": "failed",
                        "reason": "No data found"
                    })
                    continue

                if model_type == "lstm":
                    result = train_lstm(ticker, df)
                else:
                    result = train_xgboost(ticker, df)

                if "error" in result:
                    results.append({
                        "ticker": ticker,
                        "model": model_type.upper(),
                        "action": "failed",
                        "reason": result["error"]
                    })
                else:
                    results.append({
                        "ticker": ticker,
                        "model": model_type.upper(),
                        "action": "retrained",
                        "accuracy": result.get("accuracy", 0),
                        "samples": result.get("samples", 0)
                    })

            except Exception as e:
                results.append({
                    "ticker": ticker,
                    "model": model_type.upper(),
                    "action": "failed",
                    "reason": str(e)
                })

    duration = (datetime.now() - start_time).seconds

    retrained = sum(1 for r in results if r["action"] == "retrained")
    skipped = sum(1 for r in results if r["action"] == "skipped")
    failed = sum(1 for r in results if r["action"] == "failed")

    return {
        "summary": {
            "retrained": retrained,
            "skipped": skipped,
            "failed": failed,
            "duration_seconds": duration,
            "completed_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        },
        "results": results,
        "force": force
    }

def schedule_retraining(db_factory):
    from apscheduler.schedulers.background import BackgroundScheduler

    def retrain_job():
        print(f"[{datetime.now()}] Auto retraining started...")
        db = next(db_factory())
        try:
            result = retrain_all_models(db, force=False)
            print(f"[{datetime.now()}] Auto retraining complete: {result['summary']}")
        finally:
            db.close()

    scheduler = BackgroundScheduler()
    scheduler.add_job(
        retrain_job,
        'interval',
        days=7,
        id='auto_retrain',
        next_run_time=None
    )
    scheduler.start()
    print("Auto retraining scheduler started — runs every 7 days")
    return scheduler