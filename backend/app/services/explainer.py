import numpy as np
import pandas as pd
import joblib
import shap
import os

MODELS_DIR = "app/models_saved"

FEATURE_LABELS = {
    "open": "Open Price", "high": "Day High", "low": "Day Low",
    "close": "Close Price", "volume": "Volume", "rsi": "RSI (14)",
    "ema_20": "EMA 20", "ema_50": "EMA 50", "macd": "MACD",
    "macd_signal": "MACD Signal", "bb_upper": "Bollinger Upper",
    "bb_mid": "Bollinger Mid", "bb_lower": "Bollinger Lower",
    "atr": "ATR (Volatility)", "obv": "OBV (Volume Flow)",
    "returns": "Daily Returns", "volatility": "20-day Volatility"
}

def explain_xgboost(ticker: str, df: pd.DataFrame) -> dict:
    try:
        model_path = f"{MODELS_DIR}/xgboost_{ticker.replace('.','_')}.pkl"
        scaler_path = f"{MODELS_DIR}/xgb_scaler_{ticker.replace('.','_')}.pkl"

        if not os.path.exists(model_path):
            return {"error": f"XGBoost model not found for {ticker}."}

        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)

        df_feat = df.copy()
        for col in ["close", "rsi", "macd", "returns"]:
            for lag in [1, 2, 3, 5]:
                df_feat[f"{col}_lag{lag}"] = df_feat[col].shift(lag)
        df_feat.dropna(inplace=True)

        feature_cols = [c for c in df_feat.columns
                       if c not in ["signal", "future_return"]]

        last_30 = df_feat[feature_cols].values[-30:]
        last_30_scaled = scaler.transform(last_30)

        # Get prediction for last row
        last_row = last_30_scaled[-1:].copy()
        signal_idx = int(model.predict(last_row)[0])
        signal_map = {0: "BUY", 1: "SELL", 2: "HOLD"}
        current_signal = signal_map[signal_idx]

        # SHAP explanation
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(last_row)

        # Handle different shap_values formats
        if isinstance(shap_values, list):
            # Multi-class: list of arrays
            sv = np.array(shap_values[signal_idx]).flatten()
        elif hasattr(shap_values, 'values'):
            # New SHAP format
            sv_arr = shap_values.values
            if sv_arr.ndim == 3:
                sv = sv_arr[0, :, signal_idx]
            elif sv_arr.ndim == 2:
                sv = sv_arr[0]
            else:
                sv = sv_arr.flatten()
        else:
            sv = np.array(shap_values).flatten()

        # Build feature importance list
        feature_importance = []
        for i, feat in enumerate(feature_cols):
            if i >= len(sv):
                break
            importance = float(sv[i])
            label = FEATURE_LABELS.get(feat, feat)
            feature_importance.append({
                "feature": feat,
                "label": label,
                "shap_value": round(importance, 4),
                "impact": "positive" if importance > 0 else "negative",
                "abs_importance": round(abs(importance), 4)
            })

        feature_importance.sort(key=lambda x: x["abs_importance"], reverse=True)
        top_features = feature_importance[:10]

        positive = [f for f in top_features if f["impact"] == "positive"]
        negative = [f for f in top_features if f["impact"] == "negative"]

        explanation = f"The model signals {current_signal} primarily because "
        if positive:
            pos_names = [f["label"] for f in positive[:3]]
            explanation += f"{', '.join(pos_names)} are pushing toward this signal"
        if negative:
            neg_names = [f["label"] for f in negative[:2]]
            explanation += f", while {', '.join(neg_names)} are pulling against it"
        explanation += "."

        return {
            "ticker": ticker,
            "signal": current_signal,
            "explanation": explanation,
            "top_features": top_features,
            "total_features_analysed": len(feature_cols)
        }

    except Exception as e:
        return {"error": str(e)}