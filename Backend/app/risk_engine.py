def calculate_risk(patient):
    score = 0
    reasons = []

    # Oxygen saturation
    if patient.spo2 < 90:
        score += 30
        reasons.append("Very low oxygen saturation")
    elif patient.spo2 < 94:
        score += 20
        reasons.append("Reduced oxygen saturation")

    # Systolic blood pressure
    if patient.systolic_bp < 90:
        score += 30
        reasons.append("Low systolic blood pressure")
    elif patient.systolic_bp < 100:
        score += 15
        reasons.append("Borderline low blood pressure")

    # Heart rate
    if patient.heart_rate > 120:
        score += 20
        reasons.append("Very high heart rate")
    elif patient.heart_rate > 100:
        score += 10
        reasons.append("Elevated heart rate")

    # Respiratory rate
    if patient.respiratory_rate > 30:
        score += 20
        reasons.append("Very high respiratory rate")
    elif patient.respiratory_rate > 20:
        score += 10
        reasons.append("Elevated respiratory rate")

    # Pain
    if patient.pain_score >= 8:
        score += 10
        reasons.append("Severe pain")

    # Age
    if patient.age >= 65:
        score += 5
        reasons.append("Older age increases risk")

    # Consciousness
    if patient.consciousness != "Alert":
        score += 25
        reasons.append("Altered consciousness")

    # Chief complaint
    if "chest" in patient.chief_complaint.lower():
        score += 15
        reasons.append("Chest-related complaint")

    # Keep score within 100
    score = min(score, 100)

    # Risk category
    if score >= 70:
        risk_level = "CRITICAL"
        priority = "P1"
        pathway = "High-acuity / immediate clinical review"
        reassessment_minutes = 5

    elif score >= 45:
        risk_level = "HIGH"
        priority = "P2"
        pathway = "Main emergency department"
        reassessment_minutes = 10

    elif score >= 20:
        risk_level = "MODERATE"
        priority = "P3"
        pathway = "Main emergency department"
        reassessment_minutes = 30

    else:
        risk_level = "LOW"
        priority = "P4"
        pathway = "Fast-track / routine assessment"
        reassessment_minutes = 60

    return {
        "risk_score": score,
        "risk_level": risk_level,
        "priority": priority,
        "pathway": pathway,
        "reassessment_minutes": reassessment_minutes,
        "reasons": reasons
    }