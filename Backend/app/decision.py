from datetime import datetime


def record_decision(
    decision,
    ai_recommendation,
    final_priority=None,
    final_pathway=None,
    reason=None
):
    return {
        "decision": decision,
        "ai_recommendation": ai_recommendation,
        "final_priority": final_priority,
        "final_pathway": final_pathway,
        "reason": reason,
        "recorded_at": datetime.now().isoformat()
    }