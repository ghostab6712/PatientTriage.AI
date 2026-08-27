import random
import pandas as pd

random.seed(42)

patients = []

# ---------------------------------------------------------
# Helper: calculate triage risk
# ---------------------------------------------------------
def calculate_risk(age, heart_rate, systolic_bp, spo2,
                   temperature, respiratory_rate, pain_score):

    score = 0

    if spo2 < 94:
        score += 20

    if systolic_bp < 90:
        score += 30

    if heart_rate > 120:
        score += 20

    if respiratory_rate > 25:
        score += 15

    if pain_score >= 8:
        score += 10

    # Age-related risk
    if age >= 65:
        score += 5

    # Pediatric vulnerability
    if age < 5:
        score += 5

    if score >= 70:
        return "CRITICAL"

    elif score >= 45:
        return "HIGH"

    elif score >= 20:
        return "MODERATE"

    else:
        return "LOW"


# ---------------------------------------------------------
# Generate 10,000 patients
# ---------------------------------------------------------
for i in range(10000):

    # -----------------------------------------------------
    # Age distribution
    # -----------------------------------------------------
    category = random.choices(
        ["pediatric", "adult", "geriatric"],
        weights=[10, 75, 15],
        k=1
    )[0]

    if category == "pediatric":
        age = random.randint(1, 17)

        # Pediatric ranges
        heart_rate = random.randint(70, 150)
        systolic_bp = random.randint(80, 130)
        diastolic_bp = random.randint(45, 85)
        spo2 = random.randint(88, 100)
        temperature = round(random.uniform(36.0, 40.0), 1)
        respiratory_rate = random.randint(14, 35)
        pain_score = random.randint(0, 10)

    elif category == "geriatric":
        age = random.randint(65, 95)

        heart_rate = random.randint(50, 150)
        systolic_bp = random.randint(70, 160)
        diastolic_bp = random.randint(40, 100)
        spo2 = random.randint(85, 100)
        temperature = round(random.uniform(36.0, 40.0), 1)
        respiratory_rate = random.randint(10, 35)
        pain_score = random.randint(0, 10)

    else:
        age = random.randint(18, 64)

        heart_rate = random.randint(50, 150)
        systolic_bp = random.randint(70, 160)
        diastolic_bp = random.randint(40, 100)
        spo2 = random.randint(85, 100)
        temperature = round(random.uniform(36.0, 40.0), 1)
        respiratory_rate = random.randint(10, 35)
        pain_score = random.randint(0, 10)

    # -----------------------------------------------------
    # Calculate risk
    # -----------------------------------------------------
    risk = calculate_risk(
        age,
        heart_rate,
        systolic_bp,
        spo2,
        temperature,
        respiratory_rate,
        pain_score
    )

    patients.append({
        "age": age,
        "heart_rate": heart_rate,
        "systolic_bp": systolic_bp,
        "diastolic_bp": diastolic_bp,
        "spo2": spo2,
        "temperature": temperature,
        "respiratory_rate": respiratory_rate,
        "pain_score": pain_score,
        "risk": risk
    })


# ---------------------------------------------------------
# Create DataFrame
# ---------------------------------------------------------
df = pd.DataFrame(patients)

# ---------------------------------------------------------
# Save dataset
# ---------------------------------------------------------
df.to_csv("data/synthetic_patients.csv", index=False)

print("Dataset created successfully!")
print()

print("First 10 patients:")
print(df.head(10))

print()
print("Total patients:", len(df))

print()
print("Age distribution:")
print(
    pd.cut(
        df["age"],
        bins=[0, 17, 64, 200],
        labels=["Pediatric", "Adult", "Geriatric"]
    ).value_counts()
)

print()
print("Risk distribution:")
print(df["risk"].value_counts())

print()
print("Dataset saved to:")
print("data/synthetic_patients.csv")