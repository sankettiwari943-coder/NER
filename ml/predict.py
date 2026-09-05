import os
import joblib
import pandas as pd

# Load best performing model
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
POSSIBLE_MODEL_PATHS = [
    os.path.join(BASE_DIR, "models/xgboost_model.pkl"),
    os.path.join(BASE_DIR, "../models/xgboost_model.pkl"),
    os.path.join(BASE_DIR, "../NER/ml/models/xgboost_model.pkl"),
    "models/xgboost_model.pkl",
    "ml/models/xgboost_model.pkl",
    "NER/ml/models/xgboost_model.pkl"
]

model = None
for p in POSSIBLE_MODEL_PATHS:
    if os.path.exists(p):
        try:
            model = joblib.load(p)
            break
        except Exception:
            pass

def predict_landslide_risk(lat: float, lon: float, rain_24h: float, rain_7d: float, elevation: float):
    global model
    if model is None:
        for p in POSSIBLE_MODEL_PATHS:
            if os.path.exists(p):
                try:
                    model = joblib.load(p)
                    break
                except Exception:
                    pass
    if model is None:
        raise FileNotFoundError("Trained XGBoost model not found. Please run ml/train.py first.")

    input_data = pd.DataFrame([{
        "latitude": lat,
        "longitude": lon,
        "rainfall_24h": rain_24h,
        "rainfall_7d": rain_7d,
        "elevation": elevation
    }])
    
    prob = float(model.predict_proba(input_data)[0][1])
    risk_level = "CRITICAL" if prob >= 0.75 else "HIGH" if prob >= 0.50 else "MODERATE" if prob >= 0.25 else "LOW"
    
    return {
        "landslide_probability": round(prob * 100, 2),
        "risk_level": risk_level
    }

if __name__ == "__main__":
    # Test on Kohima NH-29 Ghat sector
    result = predict_landslide_risk(25.6747, 94.1105, 45.2, 180.5, 1440.0)
    print("Inference Result:", result)
