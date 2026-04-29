import numpy as np
import pandas as pd
import joblib
import os

MODELS_DIR = "app/models_saved"
LOOKBACK = 30

FEATURES = ["open","high","low","close","volume",
            "rsi","ema_20","ema_50","macd","macd_signal",
            "bb_upper","bb_mid","bb_lower","atr","obv",
            "returns","volatility"]

SIGNAL_MAP = {0: "BUY", 1: "SELL", 2: "HOLD"}

def predict_lstm(ticker: str, df: pd.DataFrame) -> dict:
    try:
        import tensorflow as tf
        model_path = f"{MODELS_DIR}/lstm_{ticker.replace('.','_')}.keras"
        scaler_path = f"{MODELS_DIR}/scaler_{ticker.replace('.','_')}.pkl"

        if not os.path.exists(model_path):
            return {"error": f"LSTM model not found for {ticker}. Train it first."}

        model = tf.keras.models.load_model(model_path)
        scaler = joblib.load(scaler_path)

        df_scaled = df[FEATURES].copy()
        df_scaled[FEATURES] = scaler.transform(df_scaled[FEATURES])

        if len(df_scaled) < LOOKBACK:
            return {"error": f"Need at least {LOOKBACK} rows of data"}

        sequence = df_scaled[FEATURES].values[-LOOKBACK:]
        sequence = sequence.reshape(1, LOOKBACK, len(FEATURES))

        predictions = model.predict(sequence, verbose=0)
        signal_idx = int(np.argmax(predictions[0]))
        confidence = float(predictions[0][signal_idx])

        return {
            "ticker": ticker,
            "model": "LSTM",
            "signal": SIGNAL_MAP[signal_idx],
            "confidence": round(confidence * 100, 2),
            "probabilities": {
                "BUY": round(float(predictions[0][0]) * 100, 2),
                "SELL": round(float(predictions[0][1]) * 100, 2),
                "HOLD": round(float(predictions[0][2]) * 100, 2)
            },
            "based_on_days": LOOKBACK
        }
    except Exception as e:
        return {"error": str(e)}

def predict_xgboost(ticker: str, df: pd.DataFrame) -> dict:
    try:
        model_path = f"{MODELS_DIR}/xgboost_{ticker.replace('.','_')}.pkl"
        scaler_path = f"{MODELS_DIR}/xgb_scaler_{ticker.replace('.','_')}.pkl"

        if not os.path.exists(model_path):
            return {"error": f"XGBoost model not found for {ticker}. Train it first."}

        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)

        df_feat = df.copy()
        for col in ["close", "rsi", "macd", "returns"]:
            for lag in [1, 2, 3, 5]:
                df_feat[f"{col}_lag{lag}"] = df_feat[col].shift(lag)
        df_feat.dropna(inplace=True)

        feature_cols = [c for c in df_feat.columns
                       if c not in ["signal", "future_return"]]

        last_row = df_feat[feature_cols].values[-1:]
        last_row_scaled = scaler.transform(last_row)

        signal_idx = int(model.predict(last_row_scaled)[0])
        probabilities = model.predict_proba(last_row_scaled)[0]
        confidence = float(probabilities[signal_idx])

        return {
            "ticker": ticker,
            "model": "XGBoost",
            "signal": SIGNAL_MAP[signal_idx],
            "confidence": round(confidence * 100, 2),
            "probabilities": {
                "BUY": round(float(probabilities[0]) * 100, 2),
                "SELL": round(float(probabilities[1]) * 100, 2),
                "HOLD": round(float(probabilities[2]) * 100, 2)
            },
            "based_on_days": len(df_feat)
        }
    except Exception as e:
        return {"error": str(e)}

def predict_ensemble(ticker: str, df: pd.DataFrame) -> dict:
    lstm_result = predict_lstm(ticker, df)
    xgb_result = predict_xgboost(ticker, df)

    if "error" in lstm_result or "error" in xgb_result:
        return {
            "ticker": ticker,
            "model": "Ensemble",
            "lstm": lstm_result,
            "xgboost": xgb_result,
            "error": "One or more models failed"
        }

    votes = [lstm_result["signal"], xgb_result["signal"]]
    from collections import Counter
    vote_count = Counter(votes)
    final_signal = vote_count.most_common(1)[0][0]

    return {
        "ticker": ticker,
        "model": "Ensemble (LSTM + XGBoost)",
        "signal": final_signal,
        "votes": {
            "LSTM": lstm_result["signal"],
            "XGBoost": xgb_result["signal"],
            "agreement": lstm_result["signal"] == xgb_result["signal"]
        },
        "lstm_confidence": lstm_result["confidence"],
        "xgb_confidence": xgb_result["confidence"],
        "probabilities": {
            "BUY": round((lstm_result["probabilities"]["BUY"] +
                         xgb_result["probabilities"]["BUY"]) / 2, 2),
            "SELL": round((lstm_result["probabilities"]["SELL"] +
                          xgb_result["probabilities"]["SELL"]) / 2, 2),
            "HOLD": round((lstm_result["probabilities"]["HOLD"] +
                          xgb_result["probabilities"]["HOLD"]) / 2, 2)
        }
    }
