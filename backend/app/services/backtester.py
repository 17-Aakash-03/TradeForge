import pandas as pd
import numpy as np

def run_backtest(ticker: str, df: pd.DataFrame,
                 initial_capital: float = 100000.0,
                 commission: float = 0.001) -> dict:

    print(f"Running backtest for {ticker}...")

    df = df.copy()

    # Use only last 3 years to avoid extreme price ranges
    df = df.tail(756)

    df["future_return"] = df["close"].shift(-1) / df["close"] - 1
    df["signal"] = 2
    df.loc[df["future_return"] > 0.003, "signal"] = 0
    df.loc[df["future_return"] < -0.003, "signal"] = 1
    df.dropna(inplace=True)

    capital = initial_capital
    position = 0
    shares = 0
    entry_price = 0
    portfolio_values = []
    trades = []

    for i, (date, row) in enumerate(df.iterrows()):
        price = float(row["close"])
        signal = int(row["signal"])

        # BUY signal and not in position
        if signal == 0 and position == 0:
            max_shares = int((capital * 0.95) / price)
            if max_shares > 0:
                cost = max_shares * price * (1 + commission)
                if cost <= capital:
                    shares = max_shares
                    capital -= cost
                    position = 1
                    entry_price = price
                    trades.append({
                        "date": str(date)[:10],
                        "action": "BUY",
                        "price": round(price, 2),
                        "shares": shares
                    })

        # SELL signal and in position
        elif signal == 1 and position == 1:
            revenue = shares * price * (1 - commission)
            profit = round(revenue - (shares * entry_price), 2)
            capital += revenue
            trades.append({
                "date": str(date)[:10],
                "action": "SELL",
                "price": round(price, 2),
                "shares": shares,
                "profit": profit
            })
            shares = 0
            position = 0
            entry_price = 0

        portfolio_value = capital + (shares * price if position == 1 else 0)
        portfolio_values.append({
            "date": str(date)[:10],
            "value": round(min(portfolio_value, 1e15), 2)
        })

    # Close any open position at end
    if position == 1:
        final_price = float(df["close"].iloc[-1])
        revenue = shares * final_price * (1 - commission)
        capital += revenue

    final_value = min(capital, 1e15)
    total_return = round(((final_value - initial_capital) / initial_capital) * 100, 2)

    # Buy and hold comparison
    first_price = float(df["close"].iloc[0])
    last_price = float(df["close"].iloc[-1])
    bh_shares = int(initial_capital / first_price)
    bh_final = bh_shares * last_price
    bh_return = round(((bh_final - initial_capital) / initial_capital) * 100, 2)

    # Max drawdown
    values = [p["value"] for p in portfolio_values]
    peak = initial_capital
    max_drawdown = 0
    for v in values:
        if v > peak:
            peak = v
        if peak > 0:
            dd = (peak - v) / peak * 100
            if dd > max_drawdown:
                max_drawdown = dd

    # Win rate
    sell_trades = [t for t in trades if t["action"] == "SELL"]
    buy_trades = [t for t in trades if t["action"] == "BUY"]
    winning = [t for t in sell_trades if t.get("profit", 0) > 0]
    win_rate = round(len(winning) / len(sell_trades) * 100, 2) if sell_trades else 0

    # CAGR
    years = len(df) / 252
    cagr = round(((final_value / initial_capital) ** (1 / max(years, 0.1)) - 1) * 100, 2)

    return {
        "ticker": ticker,
        "initial_capital": initial_capital,
        "final_value": round(final_value, 2),
        "total_return": total_return,
        "cagr": cagr,
        "max_drawdown": round(max_drawdown, 2),
        "total_trades": len(buy_trades),
        "win_rate": win_rate,
        "buy_hold_return": bh_return,
        "portfolio_values": portfolio_values,
        "trades": trades[-20:]
    }