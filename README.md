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