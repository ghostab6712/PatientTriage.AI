import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib


# 1. Load dataset
df = pd.read_csv("data/synthetic_patients.csv")

print("Dataset loaded successfully!")
print("Shape:", df.shape)


# 2. Separate features and target
X = df.drop("risk", axis=1)
y = df["risk"]


# 3. Split data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)


# 4. Create Random Forest model
model = RandomForestClassifier(
    n_estimators=200,
    random_state=42
)


# 5. Train the model
model.fit(X_train, y_train)

print("Model training completed!")


# 6. Make predictions
y_pred = model.predict(X_test)


# 7. Evaluate the model
accuracy = accuracy_score(y_test, y_pred)

print("\nModel Accuracy:", round(accuracy * 100, 2), "%")

print("\nClassification Report:")
print(classification_report(y_test, y_pred))


# 8. Save the trained model
joblib.dump(model, "models/triage_model.pkl")

print("\nModel saved successfully!")
print("Location: models/triage_model.pkl")