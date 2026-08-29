# PatientTriage.AI

> AI-assisted emergency triage decision-support prototype combining Machine Learning, rule-based risk assessment, confidence scoring, explainability, and human clinical review.

<p align="center">

**[Live Demo](https://patient-triage-ai-vert.vercel.app)** ·
**[API Docs](https://patienttriage-ai.onrender.com/docs)** ·
**[GitHub](https://github.com/ghostab6712/PatientTriage.AI)**

</p>

---

## Overview

PatientTriage.AI demonstrates how AI can support an emergency-department triage workflow while keeping the **human clinician in control of the final decision**.

The system combines:

- Machine-learning risk classification
- Deterministic clinical risk scoring
- AI confidence evaluation
- Explainable risk factors
- Human-in-the-loop clinical review
- Reassessment and assessment history
- Emergency-department surge simulation

> **Prototype / Educational Project:** This system uses synthetic patient data and is not clinically validated. It must not be used for real-world medical decision-making.

---

## Key Features

### AI-Assisted Triage

Patients are classified into four risk categories:

`LOW` · `MODERATE` · `HIGH` · `CRITICAL`

Each assessment also generates:

- Priority level (`P1`–`P4`)
- Risk score (`0–100`)
- Recommended pathway
- Reassessment interval

### Machine Learning

The prototype uses a Scikit-learn classification model trained on:

**10,000 synthetic patient records**

with clinical variables including:

- Age
- Heart rate
- Blood pressure
- SpO₂
- Temperature
- Respiratory rate
- Pain score
- Risk label

The current synthetic-data evaluation reports approximately:

**99.6% validation accuracy**

This result reflects learning the synthetic labeling pattern and **does not represent clinical performance**.

### Rule-Based Risk Engine

A deterministic risk engine evaluates clinical factors and produces:

- A capped risk score from `0–100`
- Human-readable reasons explaining contributing risk factors

This provides an interpretable layer alongside the ML prediction.

### Confidence & Safety

The system evaluates model confidence using class probabilities.

Prototype thresholds:

| Confidence | System Response |
|---|---|
| `< 60%` | Human clinical review required |
| `60–69%` | Clinical review recommended |
| `≥ 70%` | Higher AI confidence |

These thresholds are demonstration safeguards and are **not clinically validated**.

### Human-in-the-Loop Decisions

The final decision remains with the clinician.

Supported actions:

`ACCEPT` · `MODIFY` · `OVERRIDE`

Override decisions require a reason and decisions are stored in assessment history.

### Explainability

Each assessment provides a **"Why This Assessment?"** section showing the clinical factors contributing to the risk score.

### Reassessment

Patients can be reassessed using updated clinical measurements.

Valid reassessments create a new assessment while preserving previous assessments in the history.

### Emergency Department Surge Simulation

The dashboard includes a **3× surge simulation** demonstrating increased workload while keeping simulated arrivals separate from real patient records.

---

## Architecture

```text
                    PATIENT DATA
                         │
                         ▼
                  Input Validation
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        ML Prediction         Risk Engine
              │                     │
              ▼                     ▼
         Confidence             Risk Score
              │                     │
              └──────────┬──────────┘
                         ▼
                   Fusion / Logic
                         │
                         ▼
                   Recommendation
                         │
                         ▼
                HUMAN CLINICAL REVIEW
                         │
                         ▼
             Accept / Modify / Override
                         │
                         ▼
                 Assessment History