from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class PaperTrade(Base):
    __tablename__ = "paper_trades"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    ticker = Column(String, index=True)
    action = Column(String)
    signal = Column(String)
    price = Column(Float)
    shares = Column(Float)
    capital_used = Column(Float)
    profit_loss = Column(Float, default=0.0)
    is_open = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PaperPortfolio(Base):
    __tablename__ = "paper_portfolio"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True)
    cash_balance = Column(Float, default=100000.0)
    total_invested = Column(Float, default=0.0)
    total_value = Column(Float, default=100000.0)
    total_pnl = Column(Float, default=0.0)
    total_trades = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)