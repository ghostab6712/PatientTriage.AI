def calculate_confidence(patient, problems):
    confidence = 1.0
    reasons = []

    # Data-quality problems reduce confidence
    if problems:
        confidence -= 0.40
        reasons.append("Data quality problems detected")

    # Important vital signs should be available
    important_fields = [
        patient.heart_rate,
        patient.systolic_bp,
        patient.diastolic_bp,
        patient.spo2,
        patient.respiratory_rate
    ]

    if any(value is None for value in important_fields):
        confidence -= 0.30
        reasons.append("Important vital sign is missing")

    # Keep confidence between 0 and 1
    confidence = max(0.0, min(confidence, 1.0))

    if confidence >= 0.80:
        level = "HIGH"

    elif confidence >= 0.60:
        level = "MEDIUM"

    else:
        level = "LOW"

    return {
        "confidence": round(confidence, 2),
        "confidence_level": level,
        "reasons": reasons
    }