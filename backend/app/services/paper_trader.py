import yfinance as yf
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.paper_trade import PaperTrade, PaperPortfolio, Base
from app.database import engine

def init_paper_tables():
    Base.metadata.create_all(bind=engine)

def get_or_create_portfolio(user_id: int, db: Session) -> PaperPortfolio:
    portfolio = db.query(PaperPortfolio).filter(
        PaperPortfolio.user_id == user_id
    ).first()
    if not portfolio:
        portfolio = PaperPortfolio(
            user_id=user_id,
            cash_balance=100000.0,
            total_invested=0.0,
            total_value=100000.0,
            total_pnl=0.0,
            total_trades=0
        )
        db.add(portfolio)
        db.commit()
        db.refresh(portfolio)
    return portfolio

def get_current_price(ticker: str) -> float:
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="1d")
        if not hist.empty:
            return float(hist['Close'].iloc[-1])
        return 0.0
    except:
        return 0.0

def execute_paper_trade(
    user_id: int,
    ticker: str,
    signal: str,
    db: Session
) -> dict:
    try:
        init_paper_tables()
        portfolio = get_or_create_portfolio(user_id, db)
        current_price = get_current_price(ticker)

        if current_price <= 0:
            return {"error": f"Could not get price for {ticker}"}

        existing_position = db.query(PaperTrade).filter(
            PaperTrade.user_id == user_id,
            PaperTrade.ticker == ticker,
            PaperTrade.is_open == True
        ).first()

        if signal == "BUY" and not existing_position:
            invest_amount = min(portfolio.cash_balance * 0.2, portfolio.cash_balance)
            if invest_amount < 100:
                return {"message": "Insufficient balance to buy", "balance": portfolio.cash_balance}

            shares = invest_amount / current_price

            trade = PaperTrade(
                user_id=user_id,
                ticker=ticker,
                action="BUY",
                signal=signal,
                price=current_price,
                shares=shares,
                capital_used=invest_amount,
                is_open=True
            )
            db.add(trade)

            portfolio.cash_balance -= invest_amount
            portfolio.total_invested += invest_amount
            portfolio.total_trades += 1
            portfolio.updated_at = datetime.utcnow()
            db.commit()

            return {
                "action": "BUY",
                "ticker": ticker,
                "price": round(current_price, 2),
                "shares": round(shares, 4),
                "invested": round(invest_amount, 2),
                "cash_remaining": round(portfolio.cash_balance, 2),
                "message": f"Bought {round(shares, 4)} shares of {ticker} at ₹{round(current_price, 2)}"
            }

        elif signal == "SELL" and existing_position:
            sell_value = existing_position.shares * current_price
            profit_loss = sell_value - existing_position.capital_used

            existing_position.is_open = False
            existing_position.profit_loss = profit_loss

            portfolio.cash_balance += sell_value
            portfolio.total_invested -= existing_position.capital_used
            portfolio.total_pnl += profit_loss
            portfolio.total_trades += 1
            portfolio.updated_at = datetime.utcnow()
            db.commit()

            return {
                "action": "SELL",
                "ticker": ticker,
                "price": round(current_price, 2),
                "shares": round(existing_position.shares, 4),
                "sell_value": round(sell_value, 2),
                "profit_loss": round(profit_loss, 2),
                "cash_balance": round(portfolio.cash_balance, 2),
                "message": f"Sold {round(existing_position.shares, 4)} shares of {ticker} at ₹{round(current_price, 2)}, P&L: ₹{round(profit_loss, 2)}"
            }

        else:
            return {
                "action": "HOLD",
                "ticker": ticker,
                "signal": signal,
                "price": round(current_price, 2),
                "message": f"Holding position for {ticker} — signal is {signal}"
            }

    except Exception as e:
        return {"error": str(e)}

def get_portfolio_status(user_id: int, db: Session) -> dict:
    try:
        init_paper_tables()
        portfolio = get_or_create_portfolio(user_id, db)

        open_positions = db.query(PaperTrade).filter(
            PaperTrade.user_id == user_id,
            PaperTrade.is_open == True
        ).all()

        closed_trades = db.query(PaperTrade).filter(
            PaperTrade.user_id == user_id,
            PaperTrade.is_open == False
        ).order_by(PaperTrade.created_at.desc()).limit(20).all()

        positions_value = 0.0
        positions_list = []
        for pos in open_positions:
            current_price = get_current_price(pos.ticker)
            current_value = pos.shares * current_price
            unrealized_pnl = current_value - pos.capital_used
            positions_value += current_value
            positions_list.append({
                "ticker": pos.ticker,
                "shares": round(pos.shares, 4),
                "buy_price": round(pos.price, 2),
                "current_price": round(current_price, 2),
                "current_value": round(current_value, 2),
                "invested": round(pos.capital_used, 2),
                "unrealized_pnl": round(unrealized_pnl, 2),
                "unrealized_pnl_pct": round((unrealized_pnl / pos.capital_used) * 100, 2) if pos.capital_used > 0 else 0,
                "opened_at": str(pos.created_at)[:10]
            })

        total_value = portfolio.cash_balance + positions_value
        total_return = round(((total_value - 100000) / 100000) * 100, 2)

        trade_history = []
        for trade in closed_trades:
            trade_history.append({
                "ticker": trade.ticker,
                "action": trade.action,
                "price": round(trade.price, 2),
                "shares": round(trade.shares, 4),
                "profit_loss": round(trade.profit_loss, 2),
                "date": str(trade.created_at)[:10]
            })

        return {
            "cash_balance": round(portfolio.cash_balance, 2),
            "positions_value": round(positions_value, 2),
            "total_value": round(total_value, 2),
            "total_return": total_return,
            "total_pnl": round(portfolio.total_pnl, 2),
            "total_trades": portfolio.total_trades,
            "open_positions": positions_list,
            "trade_history": trade_history,
            "initial_capital": 100000.0
        }

    except Exception as e:
        return {"error": str(e)}

def reset_portfolio(user_id: int, db: Session) -> dict:
    try:
        db.query(PaperTrade).filter(PaperTrade.user_id == user_id).delete()
        portfolio = db.query(PaperPortfolio).filter(
            PaperPortfolio.user_id == user_id
        ).first()
        if portfolio:
            portfolio.cash_balance = 100000.0
            portfolio.total_invested = 0.0
            portfolio.total_value = 100000.0
            portfolio.total_pnl = 0.0
            portfolio.total_trades = 0
            portfolio.updated_at = datetime.utcnow()
        db.commit()
        return {"message": "Portfolio reset to ₹100,000"}
    except Exception as e:
        return {"error": str(e)}