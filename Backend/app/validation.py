def validate_patient(patient):
    problems = []

    # Check for missing data
    required_fields = {
        "age": patient.age,
        "heart_rate": patient.heart_rate,
        "systolic_bp": patient.systolic_bp,
        "diastolic_bp": patient.diastolic_bp,
        "spo2": patient.spo2,
        "temperature": patient.temperature,
        "respiratory_rate": patient.respiratory_rate,
        "pain_score": patient.pain_score,
        "consciousness": patient.consciousness,
        "chief_complaint": patient.chief_complaint
    }

    for field, value in required_fields.items():
        if value is None:
            problems.append(f"{field} is missing")

    # Stop here if important values are missing
    # so we don't compare None with numbers.
    if problems:
        return problems

    # Age
    if patient.age < 0 or patient.age > 120:
        problems.append("Age is invalid")

    # Heart rate
    if patient.heart_rate < 30 or patient.heart_rate > 220:
        problems.append("Heart rate is outside the expected range")

    # Blood pressure
    if patient.systolic_bp < 50 or patient.systolic_bp > 250:
        problems.append("Systolic blood pressure is outside the expected range")

    if patient.diastolic_bp < 30 or patient.diastolic_bp > 150:
        problems.append("Diastolic blood pressure is outside the expected range")

    # SpO2
    if patient.spo2 < 50 or patient.spo2 > 100:
        problems.append("SpO2 is invalid")

    # Temperature
    if patient.temperature < 25 or patient.temperature > 45:
        problems.append("Temperature is outside the expected range")

    # Respiratory rate
    if patient.respiratory_rate < 5 or patient.respiratory_rate > 60:
        problems.append("Respiratory rate is outside the expected range")

    # Pain score
    if patient.pain_score < 0 or patient.pain_score > 10:
        problems.append("Pain score must be between 0 and 10")

    # Consciousness
    valid_consciousness = [
        "Alert",
        "Confused",
        "Drowsy",
        "Unresponsive"
    ]

    if patient.consciousness not in valid_consciousness:
        problems.append("Consciousness value is invalid")

    return problems