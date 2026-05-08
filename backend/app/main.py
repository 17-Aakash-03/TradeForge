from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.database import create_tables, get_db
from app.services.data_fetcher import fetch_and_save, TICKERS
from app.dependencies import get_authenticated_user, get_pro_user
from app.models.user import User

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="TradeForge API",
    description="AI-powered algorithmic trading strategy backtester",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UpgradeRequest(BaseModel):
    email: str

class AlertRequest(BaseModel):
    ticker: str
    to_email: str

class PortfolioRequest(BaseModel):
    tickers: List[str]
    capital: float = 100000.0

class PaperTradeRequest(BaseModel):
    ticker: str
    signal: str

@app.on_event("startup")
def startup():
    create_tables()
    print("Tables created successfully")
    print("TradeForge database tables created successfully!")

@app.get("/")
def root():
    return {
        "app": settings.app_name,
        "message": "TradeForge API is running successfully",
        "environment": settings.environment
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/auth/register")
@limiter.limit("10/minute")
def register(request: Request, body: RegisterRequest,
             db: Session = Depends(get_db)):
    from app.services.auth import register_user
    result = register_user(body.email, body.username, body.password, db)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.post("/auth/login")
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest,
          db: Session = Depends(get_db)):
    from app.services.auth import login_user
    result = login_user(body.email, body.password, db)
    if "error" in result:
        raise HTTPException(status_code=401, detail=result["error"])
    return result

@app.get("/auth/me")
def get_me(current_user: User = Depends(get_authenticated_user)):
    return {
        "email": current_user.email,
        "username": current_user.username,
        "tier": current_user.tier,
        "is_active": current_user.is_active
    }

@app.post("/auth/upgrade")
def upgrade_to_pro(body: UpgradeRequest, db: Session = Depends(get_db)):
    from app.models.user import User as UserModel
    user = db.query(UserModel).filter(UserModel.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.tier = "pro"
    db.commit()
    return {"message": f"{user.email} upgraded to Pro tier", "tier": user.tier}

@app.post("/data/load")
def load_data(db: Session = Depends(get_db)):
    results = {}
    for ticker in TICKERS:
        count = fetch_and_save(ticker=ticker, start="2010-01-01", end="2025-01-01", db=db)
        results[ticker] = f"{count} rows saved"
    return {"message": "Data loaded successfully", "results": results}

@app.get("/data/stocks")
def get_stocks(db: Session = Depends(get_db)):
    from app.models.stock import StockPrice
    count = db.query(StockPrice).count()
    tickers = db.query(StockPrice.ticker).distinct().all()
    return {"total_rows": count, "tickers": [t[0] for t in tickers]}

@app.get("/data/features/{ticker}")
def get_features(ticker: str, db: Session = Depends(get_db)):
    from app.services.feature_engineer import get_features_for_ticker
    df = get_features_for_ticker(ticker, db)
    if df.empty:
        return {"error": f"No data found for {ticker}"}
    return {
        "ticker": ticker,
        "rows": len(df),
        "features": list(df.columns),
        "total_features": len(df.columns),
        "sample": df.tail(3).to_dict()
    }

@app.post("/model/train/lstm/{ticker}")
def train_lstm_model(ticker: str,
                     current_user: User = Depends(get_authenticated_user),
                     db: Session = Depends(get_db)):
    from app.services.feature_engineer import get_features_for_ticker
    from app.services.model_trainer import train_lstm
    df = get_features_for_ticker(ticker, db)
    if df.empty:
        return {"error": f"No data found for {ticker}"}
    return train_lstm(ticker, df)

@app.post("/model/train/xgboost/{ticker}")
def train_xgboost_model(ticker: str,
                        current_user: User = Depends(get_authenticated_user),
                        db: Session = Depends(get_db)):
    from app.services.feature_engineer import get_features_for_ticker
    from app.services.xgboost_trainer import train_xgboost
    df = get_features_for_ticker(ticker, db)
    if df.empty:
        return {"error": f"No data found for {ticker}"}
    return train_xgboost(ticker, df)

@app.post("/model/train/tft/{ticker}")
def train_tft_model(ticker: str,
                    current_user: User = Depends(get_authenticated_user),
                    db: Session = Depends(get_db)):
    from app.services.feature_engineer import get_features_for_ticker
    from app.services.tft_trainer import train_tft
    df = get_features_for_ticker(ticker, db)
    if df.empty:
        return {"error": f"No data found for {ticker}"}
    return train_tft(ticker, df)

@app.get("/predict/tft/{ticker}")
def predict_tft_model(ticker: str,
                      current_user: User = Depends(get_authenticated_user),
                      db: Session = Depends(get_db)):
    from app.services.feature_engineer import get_features_for_ticker
    from app.services.tft_trainer import predict_tft
    df = get_features_for_ticker(ticker, db)
    if df.empty:
        return {"error": f"No data found for {ticker}"}
    return predict_tft(ticker, df)

@app.get("/predict/{ticker}")
@limiter.limit("30/minute")
def predict(request: Request, ticker: str,
            model: str = "ensemble",
            current_user: User = Depends(get_authenticated_user),
            db: Session = Depends(get_db)):
    from app.services.feature_engineer import get_features_for_ticker
    from app.services.predictor import predict_lstm, predict_xgboost, predict_ensemble
    if model == "xgboost" and current_user.tier != "pro":
        raise HTTPException(status_code=403, detail="XGBoost model requires Pro tier")
    df = get_features_for_ticker(ticker, db)
    if df.empty:
        return {"error": f"No data found for {ticker}"}
    if model == "lstm":
        return predict_lstm(ticker, df)
    elif model == "xgboost":
        return predict_xgboost(ticker, df)
    else:
        return predict_ensemble(ticker, df)

@app.get("/backtest/{ticker}")
def backtest(ticker: str,
             capital: float = 100000.0,
             current_user: User = Depends(get_authenticated_user),
             db: Session = Depends(get_db)):
    from app.services.feature_engineer import get_features_for_ticker
    from app.services.backtester import run_backtest
    df = get_features_for_ticker(ticker, db)
    if df.empty:
        return {"error": f"No data found for {ticker}"}
    return run_backtest(ticker, df, initial_capital=capital)

@app.post("/portfolio/backtest")
def portfolio_backtest(
    body: PortfolioRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db)
):
    from app.services.portfolio_backtester import run_portfolio_backtest
    if len(body.tickers) < 2:
        return {"error": "Please select at least 2 stocks"}
    if len(body.tickers) > 5:
        return {"error": "Maximum 5 stocks allowed"}
    return run_portfolio_backtest(body.tickers, db, body.capital)

@app.get("/explain/{ticker}")
def explain(ticker: str,
            current_user: User = Depends(get_authenticated_user),
            db: Session = Depends(get_db)):
    from app.services.feature_engineer import get_features_for_ticker
    from app.services.explainer import explain_xgboost
    df = get_features_for_ticker(ticker, db)
    if df.empty:
        return {"error": f"No data found for {ticker}"}
    return explain_xgboost(ticker, df)

@app.get("/sentiment/{ticker}")
def get_sentiment(ticker: str,
                  current_user: User = Depends(get_authenticated_user),
                  db: Session = Depends(get_db)):
    from app.services.sentiment import get_sentiment_analysis
    return get_sentiment_analysis(ticker, settings.news_api_key)

@app.get("/chart/{ticker}")
def get_chart_data(
    ticker: str,
    days: int = 90,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db)
):
    from app.models.stock import StockPrice
    from sqlalchemy import desc
    rows = db.query(StockPrice).filter(
        StockPrice.ticker == ticker
    ).order_by(desc(StockPrice.date)).limit(days).all()

    if not rows:
        return {"error": f"No data found for {ticker}"}

    rows = sorted(rows, key=lambda x: x.date)

    candles = []
    volumes = []
    for row in rows:
        date_str = row.date.strftime('%Y-%m-%d')
        candles.append({
            "time": date_str,
            "open": round(float(row.open), 2),
            "high": round(float(row.high), 2),
            "low": round(float(row.low), 2),
            "close": round(float(row.close), 2),
        })
        volumes.append({
            "time": date_str,
            "value": round(float(row.volume), 0),
            "color": "#00d4aa44" if float(row.close) >= float(row.open) else "#ff444444"
        })

    return {
        "ticker": ticker,
        "candles": candles,
        "volumes": volumes,
        "total_candles": len(candles)
    }

@app.post("/alert/send")
def send_alert(body: AlertRequest,
               current_user: User = Depends(get_authenticated_user),
               db: Session = Depends(get_db)):
    from app.services.feature_engineer import get_features_for_ticker
    from app.services.predictor import predict_ensemble
    from app.services.email_alert import send_signal_alert
    df = get_features_for_ticker(body.ticker, db)
    if df.empty:
        return {"error": f"No data found for {body.ticker}"}
    prediction = predict_ensemble(body.ticker, df)
    if "error" in prediction:
        return prediction
    result = send_signal_alert(
        to_email=body.to_email,
        ticker=body.ticker,
        signal=prediction["signal"],
        confidence=prediction.get("xgb_confidence", 0),
        lstm_vote=prediction["votes"]["LSTM"],
        xgb_vote=prediction["votes"]["XGBoost"],
        sender_email=settings.email_sender,
        sender_password=settings.email_password
    )
    return result

@app.post("/alert/test")
def test_alert(current_user: User = Depends(get_authenticated_user)):
    from app.services.email_alert import send_test_email
    result = send_test_email(
        to_email=current_user.email,
        sender_email=settings.email_sender,
        sender_password=settings.email_password
    )
    return result

@app.post("/paper/trade")
def paper_trade(
    body: PaperTradeRequest,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db)
):
    from app.services.paper_trader import execute_paper_trade
    return execute_paper_trade(current_user.id, body.ticker, body.signal, db)

@app.get("/paper/portfolio")
def paper_portfolio(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db)
):
    from app.services.paper_trader import get_portfolio_status
    return get_portfolio_status(current_user.id, db)

@app.post("/paper/reset")
def paper_reset(
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db)
):
    from app.services.paper_trader import reset_portfolio
    return reset_portfolio(current_user.id, db)

@app.post("/paper/auto-trade/{ticker}")
def paper_auto_trade(
    ticker: str,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db)
):
    from app.services.feature_engineer import get_features_for_ticker
    from app.services.predictor import predict_ensemble
    from app.services.paper_trader import execute_paper_trade
    df = get_features_for_ticker(ticker, db)
    if df.empty:
        return {"error": f"No data for {ticker}"}
    prediction = predict_ensemble(ticker, df)
    if "error" in prediction:
        return prediction
    signal = prediction["signal"]
    result = execute_paper_trade(current_user.id, ticker, signal, db)
    result["ai_signal"] = signal
    result["confidence"] = prediction.get("xgb_confidence", 0)
    return result

@app.get("/retrain/status")
def retraining_status(
    current_user: User = Depends(get_authenticated_user)
):
    from app.services.retrainer import get_retraining_status
    return get_retraining_status()

@app.post("/retrain/run")
def run_retraining(
    force: bool = False,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db)
):
    from app.services.retrainer import retrain_all_models
    return retrain_all_models(db, force=force)

@app.get("/chart/{ticker}")
def get_chart_data(
    ticker: str,
    days: int = 90,
    current_user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db)
):
    from app.models.stock import StockPrice
    from sqlalchemy import desc
    rows = db.query(StockPrice).filter(
        StockPrice.ticker == ticker
    ).order_by(desc(StockPrice.date)).limit(days).all()

    if not rows:
        return {"error": f"No data found for {ticker}"}

    rows = sorted(rows, key=lambda x: x.date)

    candles = []
    volumes = []
    for row in rows:
        timestamp = int(row.date.timestamp())
        candles.append({
            "time": timestamp,
            "open": round(float(row.open), 2),
            "high": round(float(row.high), 2),
            "low": round(float(row.low), 2),
            "close": round(float(row.close), 2),
        })
        volumes.append({
            "time": timestamp,
            "value": round(float(row.volume), 0),
            "color": "#00d4aa44" if float(row.close) >= float(row.open) else "#ff444444"
        })

    return {
        "ticker": ticker,
        "candles": candles,
        "volumes": volumes,
        "total_candles": len(candles)
    }