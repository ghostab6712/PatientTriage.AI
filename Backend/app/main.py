from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import PatientData
from app.validation import validate_patient
from app.risk_engine import calculate_risk
from app.confidence import calculate_confidence
from app.ml_model import predict_with_ml
from app.fusion import fuse_results
from app.recommendation import generate_recommendation
from database.database import (
    initialize_database,
    save_patient,
    save_assessment,
    save_nurse_decision,
    get_connection
)


app = FastAPI()

initialize_database()


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "message": "PatientTriage.ai Backend is running!"
    }


# =========================================================
# TRIAGE
# =========================================================

@app.post("/triage")
def triage_patient(patient: PatientData):

    # 1. Validate patient data

    problems = validate_patient(patient)

    # 2. Calculate confidence

    confidence_result = calculate_confidence(
        patient,
        problems
    )

    # 3. Stop automated assessment if data is invalid

    if problems:

        recommendation = generate_recommendation(
            "UNKNOWN",
            confidence_result["confidence"]
        )

        return {
            "status": "HUMAN_REVIEW_REQUIRED",
            "message": "Insufficient or unreliable data for automated assessment.",
            "problems": problems,
            "confidence": confidence_result,
            "recommendation": recommendation
        }

    # 4. Save patient

    patient_id = save_patient(patient)

    # 5. Rule-based assessment

    rule_result = calculate_risk(patient)

    # 6. ML prediction

    ml_result = predict_with_ml(patient)

    # 7. Combine Rule + ML

    fusion_result = fuse_results(
        rule_result,
        ml_result
    )

    # 8. Generate recommendation

    recommendation = generate_recommendation(
        fusion_result["final_risk"],
        fusion_result["confidence"]
    )

    # 9. Save assessment

    assessment_id = save_assessment(
        patient_id=patient_id,
        risk_level=fusion_result["final_risk"],
        priority=rule_result["priority"],
        confidence=fusion_result["confidence"],
        pathway=recommendation["pathway"],
        reassessment_minutes=recommendation["reassessment_minutes"],
        patient=patient
    )

    # 10. Human review if confidence is low

    if fusion_result["confidence"] < 0.60:

        return {
            "status": "HUMAN_REVIEW_REQUIRED",
            "message": "AI systems have insufficient confidence.",
            "patient_id": patient_id,
            "assessment_id": assessment_id,
            "assessment": rule_result,
            "ml_prediction": ml_result,
            "fusion": fusion_result,
            "recommendation": recommendation
        }

    # 11. Final assessment

    return {
        "status": "ASSESSMENT_COMPLETE",
        "patient_id": patient_id,
        "assessment_id": assessment_id,
        "patient": patient,
        "assessment": rule_result,
        "ml_prediction": ml_result,
        "fusion": fusion_result,
        "confidence": confidence_result,
        "recommendation": recommendation
    }


# =========================================================
# NURSE DECISION
# =========================================================

@app.post("/decision")
def make_decision(data: dict):

    assessment_id = data.get("assessment_id")
    decision = data.get("decision")
    ai_recommendation = data.get("ai_recommendation")
    final_priority = data.get("final_priority")
    final_pathway = data.get("final_pathway")
    reason = data.get("reason")

    # Validate decision

    if decision not in [
        "ACCEPT",
        "MODIFY",
        "OVERRIDE"
    ]:

        return {
            "status": "ERROR",
            "message": "Invalid decision"
        }

    # Assessment ID required

    if not assessment_id:

        return {
            "status": "ERROR",
            "message": "Assessment ID is required"
        }

    # Override requires reason

    if decision == "OVERRIDE" and not reason:

        return {
            "status": "ERROR",
            "message": "Override reason is required"
        }

    # Save nurse decision

    decision_id = save_nurse_decision(
        assessment_id=assessment_id,
        decision=decision,
        ai_recommendation=ai_recommendation,
        final_priority=final_priority,
        final_pathway=final_pathway,
        reason=reason
    )

    return {
        "status": "DECISION_RECORDED",
        "decision_id": decision_id,
        "assessment_id": assessment_id,
        "decision": decision
    }


# =========================================================
# GET ALL PATIENTS
# =========================================================

@app.get("/patients")
def get_patients():

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            patients.id AS patient_id,
            patients.age,
            patients.heart_rate,
            patients.systolic_bp,
            patients.diastolic_bp,
            patients.spo2,
            patients.temperature,
            patients.respiratory_rate,
            patients.pain_score,
            patients.consciousness,
            patients.chief_complaint,
            patients.created_at,

            assessments.id AS assessment_id,
            assessments.risk_level,
            assessments.priority,
            assessments.confidence,
            assessments.pathway,
            assessments.reassessment_minutes,
            assessments.created_at AS assessment_created_at

        FROM patients

        LEFT JOIN assessments
            ON patients.id = assessments.patient_id
            AND assessments.id = (
                SELECT MAX(a.id)
                FROM assessments a
                WHERE a.patient_id = patients.id
            )

        ORDER BY
            CASE assessments.priority
                WHEN 'P1' THEN 1
                WHEN 'P2' THEN 2
                WHEN 'P3' THEN 3
                WHEN 'P4' THEN 4
                ELSE 5
            END,

            patients.created_at ASC
    """)

    patients = cursor.fetchall()

    connection.close()

    return {
        "status": "SUCCESS",
        "patients": [
            dict(patient)
            for patient in patients
        ]
    }


# =========================================================
# GET PATIENT DETAILS
# =========================================================

@app.get("/patients/{patient_id}")
def get_patient(patient_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    # Get patient + latest assessment

    cursor.execute("""
        SELECT

            patients.id AS patient_id,

            patients.age,
            patients.heart_rate,
            patients.systolic_bp,
            patients.diastolic_bp,
            patients.spo2,
            patients.temperature,
            patients.respiratory_rate,
            patients.pain_score,
            patients.consciousness,
            patients.chief_complaint,
            patients.created_at,

            assessments.id AS assessment_id,
            assessments.risk_level,
            assessments.priority,
            assessments.confidence,
            assessments.pathway,
            assessments.reassessment_minutes,
            assessments.created_at AS assessment_created_at

        FROM patients

        LEFT JOIN assessments
        ON patients.id = assessments.patient_id

        WHERE patients.id = ?

        ORDER BY assessments.id DESC

        LIMIT 1

    """, (patient_id,))

    patient = cursor.fetchone()

    if patient is None:

        connection.close()

        return {
            "status": "ERROR",
            "message": "Patient not found"
        }

    # Get decisions for the latest assessment

    decisions = []

    if patient["assessment_id"] is not None:

        cursor.execute("""
            SELECT

                id AS decision_id,
                assessment_id,
                decision,
                ai_recommendation,
                final_priority,
                final_pathway,
                reason,
                recorded_at

            FROM nurse_decisions

            WHERE assessment_id = ?

            ORDER BY recorded_at DESC

        """, (patient["assessment_id"],))

        decisions = [
            dict(decision)
            for decision in cursor.fetchall()
        ]

    # Build explainability information from the same
    # patient values used by the existing risk engine.
    patient_dict = dict(patient)

    if patient_dict["assessment_id"] is not None:
        patient_for_risk = PatientData(
            age=patient_dict["age"],
            heart_rate=patient_dict["heart_rate"],
            systolic_bp=patient_dict["systolic_bp"],
            diastolic_bp=patient_dict["diastolic_bp"],
            spo2=patient_dict["spo2"],
            temperature=patient_dict["temperature"],
            respiratory_rate=patient_dict["respiratory_rate"],
            pain_score=patient_dict["pain_score"],
            consciousness=patient_dict["consciousness"],
            chief_complaint=patient_dict["chief_complaint"]
        )

        explanation = calculate_risk(patient_for_risk)

        patient_dict["risk_score"] = explanation["risk_score"]
        patient_dict["reasons"] = explanation["reasons"]
    else:
        patient_dict["risk_score"] = None
        patient_dict["reasons"] = []

    connection.close()

    return {
        "status": "SUCCESS",
        "patient": patient_dict,
        "decisions": decisions
    }


# =========================================================
# CURRENT DECISION
# =========================================================

@app.get("/assessments/{assessment_id}/decision")
def get_current_decision(assessment_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT

            id AS decision_id,
            assessment_id,
            decision,
            ai_recommendation,
            final_priority,
            final_pathway,
            reason,
            recorded_at

        FROM nurse_decisions

        WHERE assessment_id = ?

        ORDER BY recorded_at DESC

        LIMIT 1

    """, (assessment_id,))

    decision = cursor.fetchone()

    connection.close()

    if decision is None:

        return {
            "status": "NO_DECISION",
            "decision": None
        }

    return {
        "status": "SUCCESS",
        "decision": dict(decision)
    }

@app.get("/patients/{patient_id}/assessments")
def get_patient_assessments(patient_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    # Check that patient exists
    cursor.execute("""
        SELECT id
        FROM patients
        WHERE id = ?
    """, (patient_id,))

    patient = cursor.fetchone()

    if patient is None:
        connection.close()

        return {
            "status": "ERROR",
            "message": "Patient not found"
        }

    # Get all assessments for this patient
    cursor.execute("""
        SELECT
            id AS assessment_id,
            patient_id,
            risk_level,
            priority,
            confidence,
            pathway,
            reassessment_minutes,
            created_at AS assessment_created_at
        FROM assessments
        WHERE patient_id = ?
        ORDER BY id ASC
    """, (patient_id,))

    assessments = cursor.fetchall()

    connection.close()

    return {
        "status": "SUCCESS",
        "patient_id": patient_id,
        "assessments": [
            dict(assessment)
            for assessment in assessments
        ]
    }

# =========================================================
# REASSESS PATIENT
# =========================================================

@app.post("/patients/{patient_id}/reassess")
def reassess_patient(
    patient_id: int,
    patient: PatientData
):

    # =====================================================
    # 1. CHECK PATIENT EXISTS
    # =====================================================

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM patients
        WHERE id = ?
    """, (patient_id,))

    existing_patient = cursor.fetchone()

    connection.close()

    if existing_patient is None:

        return {
            "status": "ERROR",
            "message": "Patient not found"
        }


    # =====================================================
    # 2. VALIDATE NEW DATA
    # =====================================================

    problems = validate_patient(patient)

    confidence_result = calculate_confidence(
        patient,
        problems
    )

    if problems:

        recommendation = generate_recommendation(
            "UNKNOWN",
            confidence_result["confidence"]
        )

        return {
            "status": "HUMAN_REVIEW_REQUIRED",
            "message": "Insufficient or unreliable data for reassessment.",
            "patient_id": patient_id,
            "problems": problems,
            "confidence": confidence_result,
            "recommendation": recommendation
        }


    # =====================================================
    # 3. RULE ENGINE
    # =====================================================

    rule_result = calculate_risk(patient)


    # =====================================================
    # 4. ML MODEL
    # =====================================================

    ml_result = predict_with_ml(patient)


    # =====================================================
    # 5. FUSION
    # =====================================================

    fusion_result = fuse_results(
        rule_result,
        ml_result
    )


    # =====================================================
    # 6. RECOMMENDATION
    # =====================================================

    recommendation = generate_recommendation(
        fusion_result["final_risk"],
        fusion_result["confidence"]
    )


    # =====================================================
    # 7. SAVE NEW ASSESSMENT
    # =====================================================

    assessment_id = save_assessment(
        patient_id=patient_id,
        risk_level=fusion_result["final_risk"],
        priority=rule_result["priority"],
        confidence=fusion_result["confidence"],
        pathway=recommendation["pathway"],
        reassessment_minutes=recommendation[
            "reassessment_minutes"
        ],
        patient=patient
    )


    # =====================================================
    # 8. HUMAN REVIEW
    # =====================================================

    if fusion_result["confidence"] < 0.60:

        return {
            "status": "HUMAN_REVIEW_REQUIRED",

            "message": "AI systems have insufficient confidence.",

            "patient_id": patient_id,

            "assessment_id": assessment_id,

            "assessment": rule_result,

            "ml_prediction": ml_result,

            "fusion": fusion_result,

            "confidence": confidence_result,

            "recommendation": recommendation,

            "reassessment": True
        }


    # =====================================================
    # 9. COMPLETE REASSESSMENT
    # =====================================================

    return {
        "status": "REASSESSMENT_COMPLETE",

        "message": "Patient reassessment completed successfully.",

        "patient_id": patient_id,

        "assessment_id": assessment_id,

        "assessment": rule_result,

        "ml_prediction": ml_result,

        "fusion": fusion_result,

        "confidence": confidence_result,

        "recommendation": recommendation,

        "reassessment": True
    }
@app.get("/patients/{patient_id}/assessment-history")
def get_assessment_history(patient_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    # Check patient
    cursor.execute("""
        SELECT id
        FROM patients
        WHERE id = ?
    """, (patient_id,))

    patient = cursor.fetchone()

    if patient is None:
        connection.close()

        return {
            "status": "ERROR",
            "message": "Patient not found"
        }

    # Get all assessments
    cursor.execute("""
        SELECT
            id AS assessment_id,
            patient_id,
            risk_level,
            priority,
            confidence,
            pathway,
            reassessment_minutes,
            created_at AS assessment_created_at
        FROM assessments
        WHERE patient_id = ?
        ORDER BY id DESC
    """, (patient_id,))

    assessments = cursor.fetchall()

    history = []

    for assessment in assessments:

        assessment_data = dict(assessment)

        # Get all nurse decisions for this assessment
        cursor.execute("""
            SELECT
                id AS decision_id,
                assessment_id,
                decision,
                ai_recommendation,
                final_priority,
                final_pathway,
                reason,
                recorded_at
            FROM nurse_decisions
            WHERE assessment_id = ?
            ORDER BY id DESC
        """, (assessment["assessment_id"],))

        decisions = [
            dict(decision)
            for decision in cursor.fetchall()
        ]

        assessment_data["decisions"] = decisions

        history.append(assessment_data)

    connection.close()

    return {
        "status": "SUCCESS",
        "patient_id": patient_id,
        "history": history
    }