def generate_recommendation(risk_level, confidence):

    if confidence < 0.60:
        return {
            "priority": "HUMAN_REVIEW",
            "pathway": "Clinical review required",
            "reassessment_minutes": 5,
            "escalation": True,
            "message": "AI confidence is too low for automated triage."
        }

    if risk_level == "CRITICAL":
        return {
            "priority": "P1",
            "pathway": "High-acuity / immediate clinical review",
            "reassessment_minutes": 5,
            "escalation": True,
            "message": "Immediate clinical attention recommended."
        }

    elif risk_level == "HIGH":
        return {
            "priority": "P2",
            "pathway": "Main emergency department",
            "reassessment_minutes": 10,
            "escalation": True,
            "message": "Prompt clinical assessment recommended."
        }

    elif risk_level == "MODERATE":
        return {
            "priority": "P3",
            "pathway": "Main emergency department",
            "reassessment_minutes": 30,
            "escalation": False,
            "message": "Routine emergency assessment recommended."
        }

    else:
        return {
            "priority": "P4",
            "pathway": "Fast-track / routine assessment",
            "reassessment_minutes": 60,
            "escalation": False,
            "message": "Lower-acuity assessment pathway."
        }