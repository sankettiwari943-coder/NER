import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
from xgboost import XGBClassifier

# 1. Determine script directory and locate dataset
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
POSSIBLE_DATA_PATHS = [
    os.path.join(BASE_DIR, "NER_ML_Dataset.xlsx"),
    os.path.join(BASE_DIR, "../NER_ML_Dataset.xlsx"),
    os.path.join(BASE_DIR, "../NER/ml/NER_ML_Dataset.xlsx"),
    "NER_ML_Dataset.xlsx",
    "ml/NER_ML_Dataset.xlsx",
    "NER/ml/NER_ML_Dataset.xlsx"
]

data_path = None
for p in POSSIBLE_DATA_PATHS:
    if os.path.exists(p):
        data_path = p
        break

if not data_path:
    raise FileNotFoundError("NER_ML_Dataset.xlsx not found in any standard path.")

print(f"Loading dataset from: {data_path}")
df = pd.read_excel(data_path)

# 2. Select predictive features & target
features = ["latitude", "longitude", "rainfall_24h", "rainfall_7d", "elevation"]
X = df[features]
y = df["landslide"]

# 3. Stratified split (80-20)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# 4. Train Random Forest
print("Training Random Forest Classifier...")
rf = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    class_weight="balanced"
)
rf.fit(X_train, y_train)

# 5. Train XGBoost
print("Training XGBoost Classifier...")
xgb = XGBClassifier(
    n_estimators=200,
    max_depth=5,
    learning_rate=0.05,
    random_state=42,
    eval_metric="logloss"
)
xgb.fit(X_train, y_train)

# 6. Evaluation metrics
models = [("Random Forest", rf), ("XGBoost", xgb)]
models_dir = os.path.join(BASE_DIR, "models")
os.makedirs(models_dir, exist_ok=True)
os.makedirs("models", exist_ok=True)

for name, model in models:
    pred = model.predict(X_test)
    prob = model.predict_proba(X_test)[:, 1]
    print(f"\n==============================")
    print(f"Model: {name}")
    print(f"==============================")
    print("Accuracy :", round(accuracy_score(y_test, pred), 4))
    print("ROC-AUC  :", round(roc_auc_score(y_test, prob), 4))
    print(classification_report(y_test, pred))

# 7. Save serialized model weights
joblib.dump(rf, os.path.join(models_dir, "random_forest_model.pkl"))
joblib.dump(xgb, os.path.join(models_dir, "xgboost_model.pkl"))
try:
    joblib.dump(rf, "models/random_forest_model.pkl")
    joblib.dump(xgb, "models/xgboost_model.pkl")
except Exception:
    pass

print("\n[SUCCESS] Models exported to 'models/' directory.")
