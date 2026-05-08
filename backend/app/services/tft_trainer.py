import pandas as pd
import numpy as np
import os
import joblib

MODELS_DIR = "app/models_saved"
os.makedirs(MODELS_DIR, exist_ok=True)

def prepare_tft_data(df: pd.DataFrame, ticker: str):
    try:
        data = df.copy()
        data = data.tail(500)
        data = data.reset_index()

        if 'index' in data.columns:
            data = data.rename(columns={'index': 'date'})
        data['date'] = pd.to_datetime(data['date'])
        data = data.sort_values('date').reset_index(drop=True)

        feature_cols = ['close', 'volume', 'rsi', 'ema_20', 'macd', 'atr', 'returns']
        available_cols = [c for c in feature_cols if c in data.columns]

        for col in available_cols:
            data[col] = pd.to_numeric(data[col], errors='coerce')
            data[col] = data[col].replace([np.inf, -np.inf], np.nan)
            median_val = data[col].median()
            if np.isnan(median_val):
                median_val = 0.0
            data[col] = data[col].fillna(median_val)

        # Create target — forward fill then drop remaining NA
        data['target'] = data['close'].pct_change(1).shift(-1) * 100
        data['target'] = data['target'].replace([np.inf, -np.inf], np.nan)
        data['target'] = data['target'].fillna(0.0)
        data['target'] = data['target'].clip(-15, 15)

        data['month'] = data['date'].dt.month.astype(float)
        data['day_of_week'] = data['date'].dt.dayofweek.astype(float)
        data['group'] = ticker
        data['time_idx'] = range(len(data))

        # Final check — fill any remaining NaN
        for col in available_cols + ['target', 'month', 'day_of_week']:
            data[col] = data[col].fillna(0.0)

        na_count = data['target'].isna().sum()
        print(f"Data shape: {data.shape}, NA in target: {na_count}")

        return data, available_cols

    except Exception as e:
        print(f"TFT data prep error: {e}")
        return None, []

def train_tft(ticker: str, df: pd.DataFrame) -> dict:
    try:
        print(f"Training TFT model for {ticker}...")

        data, feature_cols = prepare_tft_data(df, ticker)
        if data is None or len(data) < 100:
            return {"error": "Not enough data for TFT training"}

        from pytorch_forecasting import TemporalFusionTransformer, TimeSeriesDataSet
        from pytorch_forecasting.data import GroupNormalizer
        from pytorch_forecasting.metrics import MAE
        import pytorch_lightning as pl

        max_prediction_length = 1
        max_encoder_length = 20
        training_cutoff = data['time_idx'].max() - max_prediction_length

        train_data = data[data['time_idx'] <= training_cutoff].copy()

        training = TimeSeriesDataSet(
            train_data,
            time_idx='time_idx',
            target='target',
            group_ids=['group'],
            min_encoder_length=10,
            max_encoder_length=max_encoder_length,
            min_prediction_length=1,
            max_prediction_length=max_prediction_length,
            static_categoricals=['group'],
            time_varying_known_reals=['time_idx', 'month', 'day_of_week'],
            time_varying_unknown_reals=feature_cols + ['target'],
            target_normalizer=GroupNormalizer(groups=['group']),
            add_relative_time_idx=True,
            add_target_scales=True,
            add_encoder_length=True,
            allow_missing_timesteps=True,
        )

        validation = TimeSeriesDataSet.from_dataset(
            training, data, predict=True, stop_randomization=True
        )

        train_dataloader = training.to_dataloader(train=True, batch_size=64, num_workers=0)
        val_dataloader = validation.to_dataloader(train=False, batch_size=64, num_workers=0)

        tft = TemporalFusionTransformer.from_dataset(
            training,
            learning_rate=0.03,
            hidden_size=16,
            attention_head_size=1,
            dropout=0.1,
            hidden_continuous_size=8,
            loss=MAE(),
            log_interval=10,
            reduce_on_plateau_patience=3,
        )

        print(f"TFT parameters: {sum(p.numel() for p in tft.parameters()):,}")

        trainer = pl.Trainer(
            max_epochs=8,
            accelerator='cpu',
            enable_progress_bar=True,
            gradient_clip_val=0.1,
            enable_model_summary=False,
            logger=False,
        )

        trainer.fit(tft, train_dataloader, val_dataloader)

        model_path = f"{MODELS_DIR}/tft_{ticker.replace('.', '_')}.pkl"
        joblib.dump({
            'model_state': tft.state_dict(),
            'training_dataset': training,
            'feature_cols': feature_cols,
            'ticker': ticker
        }, model_path)

        return {
            "ticker": ticker,
            "model": "TFT (Temporal Fusion Transformer)",
            "parameters": sum(p.numel() for p in tft.parameters()),
            "epochs_trained": 8,
            "features_used": len(feature_cols),
            "model_path": model_path,
            "status": "success"
        }

    except Exception as e:
        print(f"TFT training error: {e}")
        return {"error": str(e)}

def predict_tft(ticker: str, df: pd.DataFrame) -> dict:
    try:
        model_path = f"{MODELS_DIR}/tft_{ticker.replace('.', '_')}.pkl"

        if not os.path.exists(model_path):
            return {"error": f"TFT model not found for {ticker}. Train it first."}

        saved = joblib.load(model_path)
        feature_cols = saved['feature_cols']
        training = saved['training_dataset']

        from pytorch_forecasting import TemporalFusionTransformer
        import torch

        tft = TemporalFusionTransformer.from_dataset(training)
        tft.load_state_dict(saved['model_state'])
        tft.eval()

        data, _ = prepare_tft_data(df, ticker)
        if data is None:
            return {"error": "Data preparation failed"}

        last_data = data.tail(30).copy()
        last_data = last_data.reset_index(drop=True)
        last_data['time_idx'] = range(len(last_data))

        from pytorch_forecasting import TimeSeriesDataSet
        predict_dataset = TimeSeriesDataSet.from_dataset(
            training, last_data, predict=True, stop_randomization=True
        )
        predict_dataloader = predict_dataset.to_dataloader(
            train=False, batch_size=1, num_workers=0
        )

        with torch.no_grad():
            predictions = tft.predict(predict_dataloader, return_y=False)

        predicted_return = float(predictions[0])

        if predicted_return > 0.3:
            signal = "BUY"
            confidence = min(abs(predicted_return) * 10, 95)
        elif predicted_return < -0.3:
            signal = "SELL"
            confidence = min(abs(predicted_return) * 10, 95)
        else:
            signal = "HOLD"
            confidence = 50.0

        return {
            "ticker": ticker,
            "model": "TFT",
            "signal": signal,
            "predicted_return": round(predicted_return, 4),
            "confidence": round(confidence, 2),
            "interpretation": f"TFT predicts {predicted_return:+.3f}% return tomorrow"
        }

    except Exception as e:
        return {"error": str(e)}