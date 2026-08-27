import joblib
import pandas as pd


# Load the trained model
model = joblib.load("models/triage_model.pkl")


def predict_with_ml(patient):
    data = pd.DataFrame([{
        "age": patient.age,
        "heart_rate": patient.heart_rate,
        "systolic_bp": patient.systolic_bp,
        "diastolic_bp": patient.diastolic_bp,
        "spo2": patient.spo2,
        "temperature": patient.temperature,
        "respiratory_rate": patient.respiratory_rate,
        "pain_score": patient.pain_score
    }])

    # ML prediction
    prediction = model.predict(data)[0]

    # Probability for each class
    probabilities = model.predict_proba(data)[0]

    # Highest probability
    confidence = max(probabilities)

    return {
        "prediction": prediction,
        "confidence": round(float(confidence), 2)
    }