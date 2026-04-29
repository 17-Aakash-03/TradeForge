import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report
from sklearn.utils.class_weight import compute_class_weight
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
import joblib
import os

MODELS_DIR = "app/models_saved"
os.makedirs(MODELS_DIR, exist_ok=True)

LOOKBACK = 30
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
    print(f"Label distribution: BUY={sum(df['signal']==0)}, SELL={sum(df['signal']==1)}, HOLD={sum(df['signal']==2)}")
    return df

def create_sequences(df: pd.DataFrame):
    X, y = [], []
    values = df[FEATURES].values
    labels = df["signal"].values
    for i in range(LOOKBACK, len(df)):
        X.append(values[i-LOOKBACK:i])
        y.append(labels[i])
    return np.array(X), np.array(y)

def build_lstm_model(input_shape):
    model = Sequential([
        LSTM(64, return_sequences=True, input_shape=input_shape),
        BatchNormalization(),
        Dropout(0.3),
        LSTM(32, return_sequences=False),
        BatchNormalization(),
        Dropout(0.3),
        Dense(16, activation="relu"),
        Dense(3, activation="softmax")
    ])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model

def train_lstm(ticker: str, df: pd.DataFrame):
    print(f"\nTraining LSTM for {ticker}...")

    df = create_labels(df.copy())

    scaler = StandardScaler()
    df[FEATURES] = scaler.fit_transform(df[FEATURES])

    X, y = create_sequences(df)
    print(f"Dataset: {X.shape[0]} samples, {X.shape[2]} features, {LOOKBACK} days lookback")

    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    classes = np.unique(y_train)
    weights = compute_class_weight("balanced", classes=classes, y=y_train)
    class_weight = dict(zip(classes, weights))
    print(f"Class weights: {class_weight}")

    model = build_lstm_model((LOOKBACK, len(FEATURES)))

    callbacks = [
        EarlyStopping(monitor="val_accuracy", patience=15,
                      restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5,
                          patience=5, verbose=1)
    ]

    print("Training started...")
    model.fit(
        X_train, y_train,
        epochs=100,
        batch_size=64,
        validation_split=0.1,
        callbacks=callbacks,
        class_weight=class_weight,
        verbose=1
    )

    loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
    print(f"\nTest accuracy: {accuracy:.4f}")

    y_pred = np.argmax(model.predict(X_test), axis=1)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred,
          target_names=["BUY","SELL","HOLD"],
          zero_division=0))

    model_path = f"{MODELS_DIR}/lstm_{ticker.replace('.','_')}.keras"
    scaler_path = f"{MODELS_DIR}/scaler_{ticker.replace('.','_')}.pkl"
    model.save(model_path)
    joblib.dump(scaler, scaler_path)
    print(f"Model saved to {model_path}")

    return {
        "ticker": ticker,
        "accuracy": round(float(accuracy), 4),
        "samples": int(X.shape[0]),
        "model_path": model_path
    }