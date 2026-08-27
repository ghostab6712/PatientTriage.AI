def fuse_results(rule_result, ml_result):
    """
    Combine the rule-based assessment with
    the machine-learning prediction.
    """

    rule_risk = rule_result["risk_level"]
    ml_risk = ml_result["prediction"]

    ml_confidence = ml_result["confidence"]

    # If both systems agree, increase confidence
    if rule_risk == ml_risk:
        final_risk = rule_risk
        final_confidence = min(1.0, ml_confidence + 0.05)

        agreement = True

    else:
        # If they disagree, prefer human review
        final_risk = rule_risk
        final_confidence = min(ml_confidence, 0.59)

        agreement = False

    if final_confidence >= 0.80:
        confidence_level = "HIGH"

    elif final_confidence >= 0.60:
        confidence_level = "MEDIUM"

    else:
        confidence_level = "LOW"

    return {
        "final_risk": final_risk,
        "confidence": round(final_confidence, 2),
        "confidence_level": confidence_level,
        "rule_prediction": rule_risk,
        "ml_prediction": ml_risk,
        "models_agree": agreement
    }