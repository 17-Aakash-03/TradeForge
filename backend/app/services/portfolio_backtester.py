import pandas as pd
import numpy as np
from app.services.backtester import run_backtest
from app.services.feature_engineer import get_features_for_ticker

def run_portfolio_backtest(
    tickers: list,
    db,
    initial_capital: float = 100000.0
) -> dict:
    try:
        capital_per_stock = initial_capital / len(tickers)
        results = []
        all_portfolio_values = {}

        for ticker in tickers:
            try:
                df = get_features_for_ticker(ticker, db)
                if df.empty:
                    continue
                result = run_backtest(ticker, df, initial_capital=capital_per_stock)
                results.append({
                    "ticker": ticker,
                    "initial_capital": capital_per_stock,
                    "final_value": result["final_value"],
                    "total_return": result["total_return"],
                    "cagr": result["cagr"],
                    "max_drawdown": result["max_drawdown"],
                    "win_rate": result["win_rate"],
                    "total_trades": result["total_trades"],
                    "buy_hold_return": result["buy_hold_return"]
                })
                for pv in result["portfolio_values"]:
                    date = pv["date"]
                    if date not in all_portfolio_values:
                        all_portfolio_values[date] = 0
                    all_portfolio_values[date] += pv["value"]
            except Exception as e:
                print(f"Error backtesting {ticker}: {e}")
                continue

        if not results:
            return {"error": "No valid backtest results"}

        total_initial = sum(r["initial_capital"] for r in results)
        total_final = sum(r["final_value"] for r in results)
        total_return = round(((total_final - total_initial) / total_initial) * 100, 2)

        years = 3
        cagr = round(((total_final / total_initial) ** (1 / years) - 1) * 100, 2)

        values = list(all_portfolio_values.values())
        peak = total_initial
        max_drawdown = 0
        for v in values:
            if v > peak:
                peak = v
            if peak > 0:
                dd = (peak - v) / peak * 100
                if dd > max_drawdown:
                    max_drawdown = dd

        best = max(results, key=lambda x: x["total_return"])
        worst = min(results, key=lambda x: x["total_return"])

        portfolio_values = [
            {"date": date, "value": round(value, 2)}
            for date, value in sorted(all_portfolio_values.items())
        ]

        allocation = []
        for r in results:
            pct = round((r["final_value"] / total_final) * 100, 2)
            allocation.append({
                "ticker": r["ticker"],
                "final_value": round(r["final_value"], 2),
                "total_return": r["total_return"],
                "allocation_pct": pct,
                "win_rate": r["win_rate"],
                "max_drawdown": r["max_drawdown"]
            })

        allocation.sort(key=lambda x: x["total_return"], reverse=True)

        return {
            "tickers": tickers,
            "initial_capital": total_initial,
            "final_value": round(total_final, 2),
            "total_return": total_return,
            "cagr": cagr,
            "max_drawdown": round(max_drawdown, 2),
            "best_performer": {
                "ticker": best["ticker"],
                "return": best["total_return"]
            },
            "worst_performer": {
                "ticker": worst["ticker"],
                "return": worst["total_return"]
            },
            "allocation": allocation,
            "portfolio_values": portfolio_values,
            "stocks_count": len(results)
        }

    except Exception as e:
        return {"error": str(e)}