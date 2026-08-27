import sqlite3
from pathlib import Path


DATABASE_PATH = Path(__file__).parent / "patient_triage.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():

    connection = get_connection()
    cursor = connection.cursor()

    # =========================
    # PATIENTS TABLE
    # =========================

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            age INTEGER NOT NULL,
            heart_rate INTEGER NOT NULL,
            systolic_bp INTEGER NOT NULL,
            diastolic_bp INTEGER NOT NULL,
            spo2 REAL NOT NULL,
            temperature REAL NOT NULL,
            respiratory_rate INTEGER NOT NULL,
            pain_score INTEGER NOT NULL,
            consciousness TEXT NOT NULL,
            chief_complaint TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # =========================
    # ASSESSMENTS TABLE
    # =========================

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS assessments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,

            risk_level TEXT,
            priority TEXT,
            confidence REAL,
            pathway TEXT,
            reassessment_minutes INTEGER,

            -- Vital-sign snapshot for this assessment
            age INTEGER,
            heart_rate INTEGER,
            systolic_bp INTEGER,
            diastolic_bp INTEGER,
            spo2 REAL,
            temperature REAL,
            respiratory_rate INTEGER,
            pain_score INTEGER,
            consciousness TEXT,
            chief_complaint TEXT,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (patient_id)
            REFERENCES patients(id)
        )
    """)

    # =========================
    # MIGRATE EXISTING DATABASE
    # =========================
    #
    # Your database already exists, so CREATE TABLE
    # will NOT add the new columns to the existing
    # assessments table.
    #
    # Therefore we add them if they don't exist.
    # =========================

    cursor.execute("PRAGMA table_info(assessments)")

    existing_columns = {
        row["name"]
        for row in cursor.fetchall()
    }

    new_columns = {
        "age": "INTEGER",
        "heart_rate": "INTEGER",
        "systolic_bp": "INTEGER",
        "diastolic_bp": "INTEGER",
        "spo2": "REAL",
        "temperature": "REAL",
        "respiratory_rate": "INTEGER",
        "pain_score": "INTEGER",
        "consciousness": "TEXT",
        "chief_complaint": "TEXT",
    }

    for column_name, column_type in new_columns.items():

        if column_name not in existing_columns:

            cursor.execute(
                f"""
                ALTER TABLE assessments
                ADD COLUMN {column_name} {column_type}
                """
            )

    # =========================
    # NURSE DECISIONS TABLE
    # =========================

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS nurse_decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            assessment_id INTEGER,
            decision TEXT NOT NULL,
            ai_recommendation TEXT,
            final_priority TEXT,
            final_pathway TEXT,
            reason TEXT,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (assessment_id)
            REFERENCES assessments(id)
        )
    """)

    connection.commit()
    connection.close()


# =========================================================
# SAVE PATIENT
# =========================================================

def save_patient(patient):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO patients (
            age,
            heart_rate,
            systolic_bp,
            diastolic_bp,
            spo2,
            temperature,
            respiratory_rate,
            pain_score,
            consciousness,
            chief_complaint
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        patient.age,
        patient.heart_rate,
        patient.systolic_bp,
        patient.diastolic_bp,
        patient.spo2,
        patient.temperature,
        patient.respiratory_rate,
        patient.pain_score,
        patient.consciousness,
        patient.chief_complaint
    ))

    patient_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return patient_id


# =========================================================
# SAVE ASSESSMENT
# =========================================================

def save_assessment(
    patient_id,
    risk_level,
    priority,
    confidence,
    pathway,
    reassessment_minutes,
    patient=None
):

    connection = get_connection()
    cursor = connection.cursor()

    # If patient data is supplied, store a complete
    # vital-sign snapshot with this assessment.
    if patient is not None:

        cursor.execute("""
            INSERT INTO assessments (
                patient_id,
                risk_level,
                priority,
                confidence,
                pathway,
                reassessment_minutes,

                age,
                heart_rate,
                systolic_bp,
                diastolic_bp,
                spo2,
                temperature,
                respiratory_rate,
                pain_score,
                consciousness,
                chief_complaint
            )
            VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        """, (
            patient_id,
            risk_level,
            priority,
            confidence,
            pathway,
            reassessment_minutes,

            patient.age,
            patient.heart_rate,
            patient.systolic_bp,
            patient.diastolic_bp,
            patient.spo2,
            patient.temperature,
            patient.respiratory_rate,
            patient.pain_score,
            patient.consciousness,
            patient.chief_complaint
        ))

    else:

        # Backward-compatible version for existing code
        cursor.execute("""
            INSERT INTO assessments (
                patient_id,
                risk_level,
                priority,
                confidence,
                pathway,
                reassessment_minutes
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            patient_id,
            risk_level,
            priority,
            confidence,
            pathway,
            reassessment_minutes
        ))

    assessment_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return assessment_id


# =========================================================
# SAVE NURSE DECISION
# =========================================================

def save_nurse_decision(
    assessment_id,
    decision,
    ai_recommendation,
    final_priority,
    final_pathway,
    reason
):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO nurse_decisions (
            assessment_id,
            decision,
            ai_recommendation,
            final_priority,
            final_pathway,
            reason
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        assessment_id,
        decision,
        ai_recommendation,
        final_priority,
        final_pathway,
        reason
    ))

    decision_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return decision_id