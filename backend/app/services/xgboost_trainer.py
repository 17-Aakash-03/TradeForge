import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, accuracy_score
from sklearn.utils.class_weight import compute_class_weight
from xgboost import XGBClassifier
import joblib
import os

MODELS_DIR = "app/models_saved"
os.makedirs(MODELS_DIR, exist_ok=True)

FEATURES = ["open","high","low","close","volume",
            "rsi","ema_20","ema_50","macd","macd_signal",
            "bb_upper","bb_mid","bb_lower","atr","obv",
            "returns","volatility"]

def create_labels(df: pd.DataFrame) -> pd.DataFrame:
    df["future_return"] = df["close"].shift(-1) / df["close"] - 1
    df["signal"] = 2
    df.loc[df["future_return"] > 0.003, "signal"] = 0
    df.loc[df["future_return"] < -0.003, "signal"] = 1
    df.dropna(inplace=True)
    print(f"Labels: BUY={sum(df['signal']==0)}, SELL={sum(df['signal']==1)}, HOLD={sum(df['signal']==2)}")
    return df

def add_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    for col in ["close", "rsi", "macd", "returns"]:
        for lag in [1, 2, 3, 5]:
            df[f"{col}_lag{lag}"] = df[col].shift(lag)
    df.dropna(inplace=True)
    return df

def train_xgboost(ticker: str, df: pd.DataFrame):
    print(f"\nTraining XGBoost for {ticker}...")

    df = create_labels(df.copy())
    df = add_lag_features(df)

    feature_cols = [c for c in df.columns if c != "signal" and c != "future_return"]

    X = df[feature_cols].values
    y = df["signal"].values

    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)

    classes = np.unique(y_train)
    weights = compute_class_weight("balanced", classes=classes, y=y_train)
    weight_map = dict(zip(classes, weights))
    sample_weights = np.array([weight_map[label] for label in y_train])

    print(f"Training on {len(X_train)} samples with {X_train.shape[1]} features...")

    model = XGBClassifier(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1
    )

    model.fit(
        X_train, y_train,
        sample_weight=sample_weights,
        eval_set=[(X_test, y_test)],
        verbose=100
    )

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"\nTest accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred,
          target_names=["BUY","SELL","HOLD"],
          zero_division=0))

    model_path = f"{MODELS_DIR}/xgboost_{ticker.replace('.','_')}.pkl"
    scaler_path = f"{MODELS_DIR}/xgb_scaler_{ticker.replace('.','_')}.pkl"
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)

    print(f"Model saved to {model_path}")

    return {
        "ticker": ticker,
        "model": "XGBoost",
        "accuracy": round(float(accuracy), 4),
        "samples": int(len(X_train)),
        "features": int(X_train.shape[1]),
        "model_path": model_path
    }