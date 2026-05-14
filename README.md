# 🚀 TradeForge — AI-Powered Algorithmic Trading Strategy Backtester

![Python](https://img.shields.io/badge/Python-3.12-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.135-green)
![React](https://img.shields.io/badge/React-18-blue)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.21-orange)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

> A full-stack AI trading platform with LSTM + XGBoost ensemble models, SHAP explainability, FinBERT sentiment analysis, paper trading, and professional backtesting.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Signal Predictor | LSTM + XGBoost ensemble generates BUY/SELL/HOLD signals |
| 🧠 SHAP Explainability | Explains WHY the AI made each decision |
| 📰 FinBERT Sentiment | Real news headlines analyzed with NLP |
| 📈 Strategy Backtester | Simulate trading strategy on historical data |
| 📊 Portfolio Backtester | Multi-stock portfolio analysis with pie charts |
| 🎯 Paper Trading | Virtual trading with real AI signals |
| 📄 PDF Reports | Professional backtest reports downloadable |
| 📧 Email Alerts | BUY/SELL signals delivered to Gmail |
| 🔄 Auto Retraining | Models retrain automatically every 7 days |
| 📉 Candlestick Charts | Interactive OHLCV charts with volume bars |
| 🐳 Docker Ready | Full containerization with docker-compose |

---

## 🧠 AI Models

- **LSTM** — Long Short-Term Memory deep learning model
- **XGBoost** — Gradient boosting with 33 features
- **Ensemble** — Majority vote between LSTM and XGBoost
- **FinBERT** — BERT model fine-tuned for financial sentiment

**Trained on 18 stocks:**
- Indian: RELIANCE.NS, TCS.NS, INFY.NS, HDFCBANK.NS, ICICIBANK.NS, WIPRO.NS, ADANIENT.NS, BAJFINANCE.NS, ITC.NS
- US: AAPL, GOOGL, MSFT, TSLA, AMZN
- Crypto: BTC-USD, ETH-USD
- Indices: ^NSEI, ^GSPC

---

## 🛠 Tech Stack

**Backend:**
- FastAPI + SQLAlchemy + PostgreSQL
- TensorFlow/Keras (LSTM)
- XGBoost + SHAP
- HuggingFace Transformers (FinBERT)
- ReportLab (PDF generation)
- APScheduler (auto retraining)

**Frontend:**
- React 18 + Vite
- Recharts + Lightweight Charts
- Axios + React Router

**DevOps:**
- Docker + Docker Compose
- GitHub Actions CI/CD

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12
- Node.js 20
- PostgreSQL 18
- Docker (optional)

### Local Development

**1. Clone the repo:**
```bash
git clone https://github.com/17-Aakash-03/TradeForge.git
cd TradeForge
```

**2. Backend setup:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

**3. Create `.env` file in backend/:**

DATABASE_URL=postgresql://postgres:yourpassword@localhost/tradeforge_db
JWT_SECRET_KEY=your-secret-key
NEWS_API_KEY=your-newsapi-key
EMAIL_SENDER=your@gmail.com
EMAIL_PASSWORD=your-app-password
ENVIRONMENT=development

**4. Start backend:**
```bash
uvicorn app.main:app --reload
```

**5. Frontend setup:**
```bash
cd frontend
npm install
npm run dev
```

**6. Load data and train models:**
```bash
# Load stock data
curl -X POST http://127.0.0.1:8000/data/load

# Train models
python train_all.py
```

### Docker Setup
```bash
docker-compose up --build
```

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login and get JWT token |
| GET | `/predict/{ticker}` | Get AI signal for a stock |
| GET | `/backtest/{ticker}` | Run strategy backtest |
| POST | `/portfolio/backtest` | Multi-stock portfolio backtest |
| GET | `/explain/{ticker}` | SHAP feature explanation |
| GET | `/sentiment/{ticker}` | FinBERT news sentiment |
| GET | `/report/{ticker}` | Download PDF report |
| POST | `/paper/auto-trade/{ticker}` | Execute paper trade |
| GET | `/paper/portfolio` | Get paper portfolio status |
| GET | `/retrain/status` | Check model freshness |
| POST | `/retrain/run` | Trigger model retraining |
| GET | `/chart/{ticker}` | Get OHLCV chart data |

Full API docs: `http://localhost:8000/docs`

---

## 🧪 Testing

```bash
cd backend
python tests/test_api.py
```

All 12 API tests pass ✓

---

## 📁 Project Structure

TradeForge/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy models
│   │   ├── services/        # AI models, backtester, etc.
│   │   ├── main.py          # FastAPI app
│   │   ├── config.py        # Settings
│   │   └── database.py      # DB connection
│   ├── tests/               # API tests
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # CandlestickChart
│   │   ├── pages/           # Dashboard, Login, Register
│   │   ├── context/         # AuthContext
│   │   └── services/        # API calls
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .github/workflows/ci.yml
└── README.md