import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [timeline, setTimeline] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("ALL");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Surge simulation
  const [surgeMode, setSurgeMode] = useState(false);

  // Reassessment
  const [showReassessment, setShowReassessment] = useState(false);
  const [reassessingPatient, setReassessingPatient] = useState(null);
  const [reassessmentLoading, setReassessmentLoading] =
    useState(false);
  const [reassessmentResult, setReassessmentResult] =
    useState(null);

  // Nurse decision workflow
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [showDecisionPanel, setShowDecisionPanel] = useState(false);
  const [decisionType, setDecisionType] = useState("ACCEPT");
  const [finalPriority, setFinalPriority] = useState("");
  const [finalPathway, setFinalPathway] = useState("");
  const [decisionReason, setDecisionReason] = useState("");

  const [reassessmentForm, setReassessmentForm] = useState({
    age: "",
    heart_rate: "",
    systolic_bp: "",
    diastolic_bp: "",
    spo2: "",
    temperature: "",
    respiratory_rate: "",
    pain_score: "",
    consciousness: "Alert",
    chief_complaint: ""
  });

  // =========================================================
  // LOAD PATIENTS
  // =========================================================

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/patients`
      );

      setPatients(response.data.patients || []);
    } catch (error) {
      console.error(error);
      setError("Unable to load patients.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD PATIENT DETAILS + COMPLETE TIMELINE
  // =========================================================

  const fetchPatientDetails = async (patientId) => {
    try {
      setDetailsLoading(true);
      setHistoryLoading(true);
      setError("");

      const [patientResponse, timelineResponse] =
        await Promise.all([
          axios.get(
            `${API_URL}/patients/${patientId}`
          ),

          axios.get(
            `${API_URL}/patients/${patientId}/assessment-history`
          )
        ]);

      setSelectedPatient({
        ...patientResponse.data.patient,
        decisions:
          patientResponse.data.decisions || []
      });

      setTimeline(
        timelineResponse.data.history || []
      );

    } catch (error) {
      console.error(error);
      setError("Unable to load patient details.");
    } finally {
      setDetailsLoading(false);
      setHistoryLoading(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    fetchPatients();
  }, []);

  // =========================================================
  // LIVE CLOCK
  // =========================================================

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // =========================================================
  // REASSESSMENT TIMER
  // Uses latest assessment timestamp
  // =========================================================

  const getReassessmentStatus = (patient) => {
    if (
      !patient.assessment_created_at ||
      !patient.reassessment_minutes
    ) {
      return {
        text: "—",
        className: ""
      };
    }

    const createdTime = new Date(
      patient.assessment_created_at.replace(
        " ",
        "T"
      ) + "Z"
    );

    const dueTime =
      createdTime.getTime() +
      patient.reassessment_minutes * 60 * 1000;

    const remaining =
      dueTime - currentTime.getTime();

    if (remaining <= 0) {
      return {
        text: "DUE",
        className: "reassessment-due"
      };
    }

    const minutes = Math.floor(
      remaining / 60000
    );

    const seconds = Math.floor(
      (remaining % 60000) / 1000
    );

    return {
      text: `${minutes}:${String(seconds).padStart(
        2,
        "0"
      )}`,
      className: "reassessment-active"
    };
  };

  // =========================================================
  // OPEN REASSESSMENT
  // =========================================================

  const openReassessment = (patient) => {
    setReassessmentResult(null);
    setError("");

    setReassessingPatient(patient);

    setReassessmentForm({
      age: patient.age ?? "",
      heart_rate: patient.heart_rate ?? "",
      systolic_bp: patient.systolic_bp ?? "",
      diastolic_bp: patient.diastolic_bp ?? "",
      spo2: patient.spo2 ?? "",
      temperature: patient.temperature ?? "",
      respiratory_rate:
        patient.respiratory_rate ?? "",
      pain_score: patient.pain_score ?? "",
      consciousness:
        patient.consciousness ?? "Alert",
      chief_complaint:
        patient.chief_complaint ?? ""
    });

    setShowReassessment(true);
  };

  // =========================================================
  // CLOSE REASSESSMENT
  // =========================================================

  const closeReassessment = () => {
    if (reassessmentLoading) {
      return;
    }

    setShowReassessment(false);
    setReassessingPatient(null);
    setReassessmentResult(null);
  };

  // =========================================================
  // REASSESSMENT FORM CHANGE
  // =========================================================

  const handleReassessmentChange = (e) => {
    const { name, value } = e.target;

    setReassessmentForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  // =========================================================
  // SUBMIT REASSESSMENT
  // Missing fields are allowed in the UI, but a blank
  // required field blocks automated reassessment and
  // requires human clinical review.
  // =========================================================

  const submitReassessment = async (e) => {
    e.preventDefault();

    if (!reassessingPatient) {
      return;
    }

    // Blank reassessment fields are treated as missing clinical data.
    // We do NOT silently fall back to stale values from the previous assessment.
    const rawPayload = {
      age: reassessmentForm.age,
      heart_rate: reassessmentForm.heart_rate,
      systolic_bp: reassessmentForm.systolic_bp,
      diastolic_bp: reassessmentForm.diastolic_bp,
      spo2: reassessmentForm.spo2,
      temperature: reassessmentForm.temperature,
      respiratory_rate: reassessmentForm.respiratory_rate,
      pain_score: reassessmentForm.pain_score,
      consciousness: reassessmentForm.consciousness,
      chief_complaint: reassessmentForm.chief_complaint
    };

    const requiredFields = [
      ['age', 'Age'],
      ['heart_rate', 'Heart Rate'],
      ['systolic_bp', 'Systolic BP'],
      ['diastolic_bp', 'Diastolic BP'],
      ['spo2', 'SpO₂'],
      ['temperature', 'Temperature'],
      ['respiratory_rate', 'Respiratory Rate'],
      ['pain_score', 'Pain Score'],
      ['consciousness', 'Consciousness'],
      ['chief_complaint', 'Chief Complaint']
    ];

    const missingFields = requiredFields
      .filter(([key]) =>
        rawPayload[key] === '' ||
        rawPayload[key] === null ||
        rawPayload[key] === undefined
      )
      .map(([, label]) => label);

    if (missingFields.length > 0) {
      setReassessmentResult({
        status: 'HUMAN_REVIEW_REQUIRED',
        message:
          'Some required clinical information is unavailable. Automated reassessment cannot be safely completed.',
        problems: missingFields.map(
          (field) => `${field} is unavailable`
        )
      });
      return;
    }

    const payload = {
      age: Number(rawPayload.age),
      heart_rate: Number(rawPayload.heart_rate),
      systolic_bp: Number(rawPayload.systolic_bp),
      diastolic_bp: Number(rawPayload.diastolic_bp),
      spo2: Number(rawPayload.spo2),
      temperature: Number(rawPayload.temperature),
      respiratory_rate: Number(rawPayload.respiratory_rate),
      pain_score: Number(rawPayload.pain_score),
      consciousness: rawPayload.consciousness,
      chief_complaint: rawPayload.chief_complaint
    };

    try {
      setReassessmentLoading(true);
      setError('');
      setReassessmentResult(null);

      const response = await axios.post(
        `${API_URL}/patients/${reassessingPatient.patient_id}/reassess`,
        payload
      );

      setReassessmentResult(response.data);
      await fetchPatients();
    } catch (error) {
      console.error(error);

      if (error.response?.data) {
        setError(
          error.response.data.message ||
          'Reassessment failed.'
        );
      } else {
        setError('Unable to connect to the backend.');
      }
    } finally {
      setReassessmentLoading(false);
    }
  };

  // =========================================================
  // NURSE DECISION WORKFLOW
  // =========================================================

  const openDecisionPanel = (type) => {
    if (!selectedPatient?.assessment_id) return;

    setDecisionError("");
    setDecisionType(type);
    setFinalPriority(selectedPatient.priority || "P1");
    setFinalPathway(
      selectedPatient.pathway || "Clinical review required"
    );
    setDecisionReason("");
    setShowDecisionPanel(true);
  };

  const closeDecisionPanel = () => {
    if (decisionLoading) return;

    setShowDecisionPanel(false);
    setDecisionError("");
  };

  const submitDecision = async (e) => {
    e.preventDefault();

    if (!selectedPatient?.assessment_id) {
      setDecisionError("No assessment is available for this patient.");
      return;
    }

    if (!finalPriority || !finalPathway) {
      setDecisionError("Final priority and pathway are required.");
      return;
    }

    if (decisionType === "OVERRIDE" && !decisionReason.trim()) {
      setDecisionError("Override reason is required.");
      return;
    }

    try {
      setDecisionLoading(true);
      setDecisionError("");
      setError("");

      const response = await axios.post(`${API_URL}/decision`, {
        assessment_id: selectedPatient.assessment_id,
        decision: decisionType,
        ai_recommendation: selectedPatient.priority,
        final_priority: finalPriority,
        final_pathway: finalPathway,
        reason:
          decisionType === "ACCEPT"
            ? null
            : decisionReason.trim() || null,
      });

      if (response.data.status !== "DECISION_RECORDED") {
        setDecisionError(
          response.data.message || "Decision could not be recorded."
        );
        return;
      }

      setShowDecisionPanel(false);

      await fetchPatientDetails(selectedPatient.patient_id);
      await fetchPatients();
    } catch (error) {
      console.error(error);
      setDecisionError(
        error.response?.data?.message ||
          "Unable to record the clinical decision."
      );
    } finally {
      setDecisionLoading(false);
    }
  };

  // =========================================================
  // STATISTICS
  // =========================================================

  const activePatients = patients.filter(
    (patient) =>
      patient.assessment_id !== null
  );

  const criticalPatients =
    activePatients.filter(
      (patient) =>
        patient.risk_level === "CRITICAL"
    );

  const highPatients =
    activePatients.filter(
      (patient) =>
        patient.risk_level === "HIGH"
    );

  const moderatePatients =
    activePatients.filter(
      (patient) =>
        patient.risk_level === "MODERATE"
    );

  const lowPatients =
    activePatients.filter(
      (patient) =>
        patient.risk_level === "LOW"
    );

  const reviewPatients =
    activePatients.filter(
      (patient) =>
        patient.confidence !== null &&
        patient.confidence < 0.60
    );

  // =========================================================
  // DATA QUALITY
  // Shows whether the currently selected patient has
  // complete information for automated assessment.
  // =========================================================

  const getDataQuality = (patient) => {
    if (!patient) {
      return { fields: [], available: 0, total: 0, complete: true };
    }

    const fields = [
      { key: "age", label: "Age" },
      { key: "heart_rate", label: "Heart Rate" },
      { key: "systolic_bp", label: "Systolic BP" },
      { key: "diastolic_bp", label: "Diastolic BP" },
      { key: "spo2", label: "SpO₂" },
      { key: "temperature", label: "Temperature" },
      { key: "respiratory_rate", label: "Respiratory Rate" },
      { key: "pain_score", label: "Pain Score" },
      { key: "consciousness", label: "Consciousness" },
      { key: "chief_complaint", label: "Chief Complaint" }
    ].map((field) => ({
      ...field,
      available:
        patient[field.key] !== null &&
        patient[field.key] !== undefined &&
        patient[field.key] !== ""
    }));

    const available = fields.filter((field) => field.available).length;

    const total = fields.length;
    const completeness = total
      ? Math.round((available / total) * 100)
      : 0;

    return {
      fields,
      available,
      total,
      completeness,
      complete: available === total
    };
  };

  const selectedDataQuality = getDataQuality(selectedPatient);

  // =========================================================
  // SURGE SIMULATION
  // Demonstrates a 3x emergency-department volume increase
  // without creating fake patients in the real database.
  // =========================================================

  const surgeVolume = activePatients.length * 3;
  const surgeAdditional = activePatients.length * 2;
  const surgeCritical = criticalPatients.length * 3;
  const surgeHigh = highPatients.length * 3;

  // =========================================================
  // FILTER
  // =========================================================

  const filteredPatients = activePatients
  .filter((patient) => {
    if (filter === "ALL") return true;

    if (filter === "CRITICAL") {
      return patient.risk_level === "CRITICAL";
    }

    if (filter === "HIGH") {
      return patient.risk_level === "HIGH";
    }

    if (filter === "MODERATE") {
      return patient.risk_level === "MODERATE";
    }

    if (filter === "LOW") {
      return patient.risk_level === "LOW";
    }

    if (filter === "REVIEW") {
      return (
        patient.confidence !== null &&
        patient.confidence < 0.60
      );
    }

    return true;
  })
  .sort((a, b) => {
    // Priority order
    const priorityRank = {
      P1: 1,
      P2: 2,
      P3: 3,
      P4: 4
    };

    const priorityA =
      priorityRank[a.priority] || 5;

    const priorityB =
      priorityRank[b.priority] || 5;

    // First: higher clinical priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Second: overdue reassessment
    const getDueTime = (patient) => {
      if (
        !patient.assessment_created_at ||
        !patient.reassessment_minutes
      ) {
        return Infinity;
      }

      const createdTime = new Date(
        patient.assessment_created_at.replace(
          " ",
          "T"
        ) + "Z"
      );

      return (
        createdTime.getTime() +
        patient.reassessment_minutes * 60 * 1000
      );
    };

    const dueA = getDueTime(a);
    const dueB = getDueTime(b);

    const now = currentTime.getTime();

    const overdueA = dueA <= now;
    const overdueB = dueB <= now;

    // DUE patients first
    if (overdueA !== overdueB) {
      return overdueA ? -1 : 1;
    }

    // Finally: earliest reassessment first
    return dueA - dueB;
  });

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="dashboard">
        <h2>Loading Dashboard...</h2>
      </div>
    );
  }

  // =========================================================
  // PATIENT DETAILS
  // =========================================================

  if (selectedPatient) {
    return (
      <div className="dashboard">

        {/* HEADER */}

        <div className="dashboard-header">

          <div>

            <p className="eyebrow">
              PATIENT DETAILS
            </p>

            <h2>
              Patient #{selectedPatient.patient_id}
            </h2>

            <p>
              Complete patient assessment
              information.
            </p>

          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedPatient(null);
              setTimeline([]);
            }}
          >
            ← Back to Queue
          </button>

        </div>


        {/* ERROR */}

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}


        {detailsLoading ? (

          <div className="queue-card">
            Loading patient details...
          </div>

        ) : (

          <>

            {/* =========================================
                PATIENT INFORMATION
            ========================================= */}

            <section className="card">

              <h3>
                Patient Information
              </h3>

              <div className="assessment-grid">

                <div className="info-box">
                  <span>AGE</span>

                  <strong>
                    {selectedPatient.age}
                  </strong>
                </div>


                <div className="info-box">
                  <span>HEART RATE</span>

                  <strong>
                    {selectedPatient.heart_rate}
                    {" "}BPM
                  </strong>
                </div>


                <div className="info-box">
                  <span>BLOOD PRESSURE</span>

                  <strong>
                    {selectedPatient.systolic_bp}
                    {" / "}
                    {selectedPatient.diastolic_bp}
                  </strong>
                </div>


                <div className="info-box">
                  <span>SpO₂</span>

                  <strong>
                    {selectedPatient.spo2}%
                  </strong>
                </div>


                <div className="info-box">
                  <span>TEMPERATURE</span>

                  <strong>
                    {selectedPatient.temperature}°C
                  </strong>
                </div>


                <div className="info-box">
                  <span>RESPIRATORY RATE</span>

                  <strong>
                    {selectedPatient.respiratory_rate}
                    /min
                  </strong>
                </div>


                <div className="info-box">
                  <span>PAIN SCORE</span>

                  <strong>
                    {selectedPatient.pain_score}/10
                  </strong>
                </div>


                <div className="info-box">
                  <span>CONSCIOUSNESS</span>

                  <strong>
                    {selectedPatient.consciousness}
                  </strong>
                </div>

              </div>

            </section>


            {/* =========================================
                DATA QUALITY
            ========================================= */}

            <section
              className={`card data-quality-card ${
                selectedDataQuality.complete
                  ? "data-quality-complete"
                  : "data-quality-incomplete"
              }`}
            >
              <div className="data-quality-header">
                <div className="data-quality-title-block">
                  <p className="eyebrow">DATA QUALITY</p>
                  <h3>Clinical Information</h3>
                  <p className="data-quality-description">
                    Review the availability of information used by the triage
                    assessment before relying on an automated recommendation.
                  </p>
                </div>

                <div className="data-quality-score">
                  <strong>{selectedDataQuality.completeness}%</strong>
                  <span>COMPLETE</span>
                  <small>
                    {selectedDataQuality.available} of {selectedDataQuality.total} fields
                  </small>
                </div>
              </div>

              <div className="data-quality-progress" aria-label="Data completeness">
                <div
                  className="data-quality-progress-fill"
                  style={{
                    width: `${selectedDataQuality.completeness}%`
                  }}
                />
              </div>

              <div className="data-quality-fields">
                {selectedDataQuality.fields.map((field) => (
                  <div
                    className={`data-quality-field ${
                      field.available ? "available" : "missing"
                    }`}
                    key={field.key}
                  >
                    <span className="data-quality-field-icon" aria-hidden="true">
                      {field.available ? "✓" : "!"}
                    </span>

                    <span className="data-quality-field-name">
                      {field.label}
                    </span>

                    <span className="data-quality-field-status">
                      {field.available ? "Available" : "Missing"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="data-quality-summary">
                <div className="data-quality-summary-icon" aria-hidden="true">
                  {selectedDataQuality.complete ? "✓" : "!"}
                </div>
                <div>
                  <strong>
                    {selectedDataQuality.complete
                      ? "Sufficient information for automated assessment"
                      : "Incomplete information — clinical review recommended"}
                  </strong>
                  <span>
                    {selectedDataQuality.complete
                      ? "All tracked patient fields are available."
                      : "Missing information should be confirmed or updated before relying on the assessment."}
                  </span>
                </div>
              </div>
            </section>


            {/* =========================================
                CHIEF COMPLAINT
            ========================================= */}

            <section className="card">

              <p className="eyebrow">
                CHIEF COMPLAINT
              </p>

              <h3>
                {selectedPatient.chief_complaint}
              </h3>

            </section>


            {/* =========================================
                CURRENT AI ASSESSMENT
            ========================================= */}

            {selectedPatient.assessment_id !==
              null && (

              <section className="assessment-card">

                <div className="assessment-header">

                  <div>

                    <p className="eyebrow">
                      CURRENT AI TRIAGE ASSESSMENT
                    </p>

                    <h2>
                      Assessment #
                      {
                        selectedPatient.assessment_id
                      }
                    </h2>

                  </div>


                  <div
                    className={`status-badge ${
                      selectedPatient.confidence <
                      0.60
                        ? "warning"
                        : "success"
                    }`}
                  >
                    {selectedPatient.confidence <
                    0.60
                      ? "REVIEW REQUIRED"
                      : "COMPLETE"}
                  </div>

                </div>


                <div className="risk-section">

                  <div className="risk-main">

                    <span>
                      RISK LEVEL
                    </span>

                    <strong>
                      {selectedPatient.risk_level}
                    </strong>

                  </div>


                  <div className="confidence-main">

                    <span>
                      AI CONFIDENCE
                    </span>

                    <strong>
                      {Math.round(
                        selectedPatient.confidence *
                          100
                      )}
                      %
                    </strong>

                  </div>

                </div>


                {/* =========================================
                    AI CONFIDENCE & SAFETY
                    Uses the model's existing confidence score.
                    Prototype thresholds only; not clinically validated.
                ========================================= */}

                <div
                  className={`confidence-safety ${
                    selectedPatient.confidence < 0.60
                      ? "confidence-safety-review"
                      : selectedPatient.confidence < 0.70
                        ? "confidence-safety-caution"
                        : "confidence-safety-ok"
                  }`}
                >
                  <div className="confidence-safety-main">
                    <span className="confidence-safety-label">
                      {selectedPatient.confidence < 0.60
                        ? "⚠ HUMAN CLINICAL REVIEW REQUIRED"
                        : selectedPatient.confidence < 0.70
                          ? "CAUTION — CLINICAL REVIEW RECOMMENDED"
                          : "✓ HIGHER AI CONFIDENCE"}
                    </span>

                    <span className="confidence-safety-text">
                      {selectedPatient.confidence < 0.60
                        ? "AI confidence is below the prototype safety threshold. Do not rely on the automated recommendation without clinical assessment."
                        : selectedPatient.confidence < 0.70
                          ? "AI confidence is in the caution range. Review the recommendation clinically before acting."
                          : "AI confidence is above the prototype threshold. Clinical oversight remains required."}
                    </span>
                  </div>

                  <span className="confidence-safety-level">
                    {selectedPatient.confidence < 0.60
                      ? "LOW"
                      : selectedPatient.confidence < 0.70
                        ? "CAUTION"
                        : "HIGHER"}
                  </span>
                </div>


                <div className="assessment-grid">

                  <div className="info-box">
                    <span>PRIORITY</span>

                    <strong>
                      {selectedPatient.priority}
                    </strong>
                  </div>


                  <div className="info-box">
                    <span>PATHWAY</span>

                    <strong>
                      {selectedPatient.pathway}
                    </strong>
                  </div>


                  <div className="info-box">
                    <span>REASSESSMENT</span>

                    <strong>
                      {
                        selectedPatient
                          .reassessment_minutes
                      }{" "}
                      min
                    </strong>
                  </div>


                  <div className="info-box">
                    <span>ASSESSMENT ID</span>

                    <strong>
                      #
                      {
                        selectedPatient.assessment_id
                      }
                    </strong>
                  </div>

                </div>

                {/* =========================================
                    WHY THIS ASSESSMENT?
                    Uses reasons returned by the backend risk engine.
                ========================================= */}

                {selectedPatient.reasons &&
                  selectedPatient.reasons.length > 0 && (
                    <div className="assessment-reasons">
                      <div className="assessment-reasons-header">
                        <div>
                          <p className="eyebrow">EXPLAINABILITY</p>
                          <h3>Why This Assessment?</h3>
                        </div>

                        {selectedPatient.risk_score !== null &&
                          selectedPatient.risk_score !== undefined && (
                            <div className="assessment-risk-score">
                              <span>RISK SCORE</span>
                              <strong>
                                {selectedPatient.risk_score}
                                <small>/100</small>
                              </strong>
                            </div>
                          )}
                      </div>

                      <div className="assessment-reasons-list">
                        {selectedPatient.reasons.map((reason, index) => (
                          <div
                            className="assessment-reason-item"
                            key={`${reason}-${index}`}
                          >
                            <span
                              className="assessment-reason-icon"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>

                      <p className="assessment-reasons-note">
                        These factors are generated from the existing clinical
                        risk rules used by the assessment engine.
                      </p>
                    </div>
                  )}

              </section>
            )}


            {/* =========================================
                COMPLETE ASSESSMENT + DECISION HISTORY
            ========================================= */}


            {/* =========================================
                NURSE DECISION WORKFLOW
            ========================================= */}

            {selectedPatient.assessment_id !== null && (
              <section className="card decision-workflow-card">

                <p className="eyebrow">CLINICAL REVIEW</p>
                <h3>Nurse Decision</h3>

                <p>
                  Review the AI recommendation and record the
                  final clinical decision.
                </p>

                {decisionError && (
                  <div className="error-box">{decisionError}</div>
                )}

                <div className="decision-summary-grid">
                  <div className="info-box">
                    <span>AI RECOMMENDATION</span>
                    <strong>{selectedPatient.priority || "—"}</strong>
                  </div>

                  <div className="info-box">
                    <span>RISK LEVEL</span>
                    <strong>{selectedPatient.risk_level || "—"}</strong>
                  </div>

                  <div className="info-box">
                    <span>CONFIDENCE</span>
                    <strong>
                      {selectedPatient.confidence !== null &&
                      selectedPatient.confidence !== undefined
                        ? `${Math.round(selectedPatient.confidence * 100)}%`
                        : "—"}
                    </strong>
                  </div>

                  <div className="info-box">
                    <span>PATHWAY</span>
                    <strong>{selectedPatient.pathway || "—"}</strong>
                  </div>
                </div>

                <div className="decision-actions">
                  <button
                    type="button"
                    onClick={() => openDecisionPanel("ACCEPT")}
                    disabled={decisionLoading}
                  >
                    ✓ Accept AI Recommendation
                  </button>

                  <button
                    type="button"
                    onClick={() => openDecisionPanel("MODIFY")}
                    disabled={decisionLoading}
                  >
                    ✎ Modify
                  </button>

                  <button
                    type="button"
                    onClick={() => openDecisionPanel("OVERRIDE")}
                    disabled={decisionLoading}
                  >
                    ⚠ Override
                  </button>
                </div>
              </section>
            )}

            {showDecisionPanel &&
              selectedPatient.assessment_id !== null && (
                <section className="card decision-form-card">

                  <p className="eyebrow">{decisionType} DECISION</p>
                  <h3>Record Clinical Decision</h3>

                  <form onSubmit={submitDecision}>
                    <div className="assessment-grid">

                      <div className="form-group">
                        <label>Final Priority</label>
                        <select
                          value={finalPriority}
                          onChange={(e) => setFinalPriority(e.target.value)}
                          required
                        >
                          <option value="P1">P1</option>
                          <option value="P2">P2</option>
                          <option value="P3">P3</option>
                          <option value="P4">P4</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Final Pathway</label>
                        <select
                          value={finalPathway}
                          onChange={(e) => setFinalPathway(e.target.value)}
                          required
                        >
                          <option value="Clinical review required">
                            Clinical review required
                          </option>
                          <option value="High-acuity / immediate clinical review">
                            High-acuity / immediate clinical review
                          </option>
                          <option value="Main emergency department">
                            Main emergency department
                          </option>
                          <option value="Fast-track / routine assessment">
                            Fast-track / routine assessment
                          </option>
                        </select>
                      </div>

                      {decisionType !== "ACCEPT" && (
                        <div className="form-group full-width">
                          <label>
                            {decisionType === "OVERRIDE"
                              ? "Override Reason"
                              : "Clinical Reason"}
                          </label>

                          <textarea
                            value={decisionReason}
                            onChange={(e) => setDecisionReason(e.target.value)}
                            placeholder={
                              decisionType === "OVERRIDE"
                                ? "Explain why the AI recommendation is being overridden."
                                : "Explain the clinical modification."
                            }
                            rows="4"
                            required={decisionType === "OVERRIDE"}
                          />
                        </div>
                      )}
                    </div>

                    {decisionError && (
                      <div className="error-box">{decisionError}</div>
                    )}

                    <div className="modal-actions">
                      <button
                        type="button"
                        onClick={closeDecisionPanel}
                        disabled={decisionLoading}
                      >
                        Cancel
                      </button>

                      <button type="submit" disabled={decisionLoading}>
                        {decisionLoading
                          ? "Recording Decision..."
                          : `Record ${decisionType}`}
                      </button>
                    </div>
                  </form>
                </section>
              )}
            <section className="card">

              <p className="eyebrow">
                ASSESSMENT HISTORY
              </p>

              <h3>
                Triage Timeline
              </h3>


              {historyLoading ? (

                <div className="empty-state">
                  Loading assessment history...
                </div>

              ) : timeline.length === 0 ? (

                <div className="empty-state">
                  No assessments found.
                </div>

              ) : (

                <div className="assessment-history">

                  {timeline.map(
                    (assessment, index) => (

                      <div
                        key={
                          assessment.assessment_id
                        }
                        className={`assessment-history-item ${
                          index === 0
                            ? "latest-assessment"
                            : ""
                        }`}
                      >

                        {/* TIMELINE DOT */}

                        <div className="history-marker">
                          {index === 0
                            ? "●"
                            : "○"}
                        </div>


                        {/* ASSESSMENT CONTENT */}

                        <div className="history-content">

                          <div className="history-top">

                            <div>

                              <span className="eyebrow">
                                ASSESSMENT #
                                {
                                  assessment.assessment_id
                                }
                              </span>


                              {index === 0 && (

                                <span className="latest-label">
                                  LATEST
                                </span>

                              )}

                            </div>


                            <span className="history-date">
                              {
                                assessment.assessment_created_at
                              }
                            </span>

                          </div>


                          {/* ASSESSMENT DETAILS */}

                          <div className="history-details">

                            <div>
                              <span>
                                RISK
                              </span>

                              <strong>
                                {
                                  assessment.risk_level
                                }
                              </strong>
                            </div>


                            <div>
                              <span>
                                PRIORITY
                              </span>

                              <strong>
                                {
                                  assessment.priority
                                }
                              </strong>
                            </div>


                            <div>
                              <span>
                                CONFIDENCE
                              </span>

                              <strong>
                                {Math.round(
                                  assessment.confidence *
                                    100
                                )}
                                %
                              </strong>
                            </div>


                            <div>
                              <span>
                                REASSESSMENT
                              </span>

                              <strong>
                                {
                                  assessment.reassessment_minutes
                                }{" "}
                                min
                              </strong>
                            </div>

                          </div>


                          {/* PATHWAY */}

                          <div className="history-pathway">

                            <span>
                              PATHWAY
                            </span>

                            <strong>
                              {assessment.pathway}
                            </strong>

                          </div>


                          {/* =================================
                              NURSE DECISIONS FOR THIS ASSESSMENT
                          ================================= */}

                          {assessment.decisions &&
                            assessment.decisions.length >
                              0 && (

                            <div className="timeline-decisions">

                              <p className="eyebrow">
                                NURSE DECISIONS
                              </p>


                              {assessment.decisions.map(
                                (decision) => (

                                  <div
                                    key={
                                      decision.decision_id
                                    }
                                    className="timeline-decision-card"
                                  >

                                    <div className="decision-row">

                                      <strong>
                                        {
                                          decision.decision
                                        }
                                      </strong>

                                      <span>
                                        {
                                          decision.recorded_at
                                        }
                                      </span>

                                    </div>


                                    <div className="decision-row">

                                      <span>
                                        AI:
                                        {" "}
                                        {
                                          decision.ai_recommendation
                                        }

                                        {" → "}

                                        Final:
                                        {" "}
                                        {
                                          decision.final_priority
                                        }
                                      </span>

                                    </div>


                                    <div className="decision-row">

                                      <span>
                                        Pathway:
                                        {" "}
                                        {
                                          decision.final_pathway
                                        }
                                      </span>

                                    </div>


                                    {decision.reason && (

                                      <div className="decision-reason">

                                        <span>
                                          REASON
                                        </span>

                                        <p>
                                          {
                                            decision.reason
                                          }
                                        </p>

                                      </div>

                                    )}

                                  </div>

                                )
                              )}

                            </div>

                          )}

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </section>


            {/* =========================================
                CURRENT DECISION
            ========================================= */}

            <section className="card">

              <p className="eyebrow">
                CURRENT DECISION
              </p>

              <h3>
                Latest Clinical Decision
              </h3>


              {selectedPatient.decisions &&
              selectedPatient.decisions.length >
                0 ? (

                <div className="decision-history-item">

                  <div>
                    <span>
                      DECISION
                    </span>

                    <strong>
                      {
                        selectedPatient
                          .decisions[0]
                          .decision
                      }
                    </strong>
                  </div>


                  <div>
                    <span>
                      FINAL PRIORITY
                    </span>

                    <strong>
                      {
                        selectedPatient
                          .decisions[0]
                          .final_priority
                      }
                    </strong>
                  </div>


                  <div>
                    <span>
                      PATHWAY
                    </span>

                    <strong>
                      {
                        selectedPatient
                          .decisions[0]
                          .final_pathway
                      }
                    </strong>
                  </div>


                  <div>
                    <span>
                      RECORDED
                    </span>

                    <strong>
                      {
                        selectedPatient
                          .decisions[0]
                          .recorded_at
                      }
                    </strong>
                  </div>


                  {
                    selectedPatient.decisions[0]
                      .reason && (

                    <div className="decision-reason">

                      <span>
                        REASON
                      </span>

                      <p>
                        {
                          selectedPatient
                            .decisions[0]
                            .reason
                        }
                      </p>

                    </div>

                  )}

                </div>

              ) : (

                <div className="empty-state">
                  No clinical decision
                  recorded yet.
                </div>

              )}

            </section>


            {/* =========================================
                ALL NURSE DECISION HISTORY
            ========================================= */}

            <section className="card">

              <p className="eyebrow">
                NURSE DECISION HISTORY
              </p>

              <h3>
                Clinical Review Actions
              </h3>


              {selectedPatient.decisions &&
              selectedPatient.decisions.length >
                0 ? (

                <div className="decision-history">

                  {selectedPatient.decisions.map(
                    (decision) => (

                      <div
                        className="decision-history-item"
                        key={decision.decision_id}
                      >

                        <div>

                          <span>
                            DECISION
                          </span>

                          <strong>
                            {decision.decision}
                          </strong>

                          <p>
                            {decision.recorded_at}
                          </p>

                        </div>


                        <div>

                          <span>
                            FINAL PRIORITY
                          </span>

                          <strong>
                            {
                              decision.final_priority
                            }
                          </strong>

                        </div>


                        <div>

                          <span>
                            PATHWAY
                          </span>

                          <strong>
                            {
                              decision.final_pathway
                            }
                          </strong>

                        </div>


                        <div>

                          <span>
                            AI RECOMMENDATION
                          </span>

                          <strong>
                            {
                              decision.ai_recommendation
                            }
                          </strong>

                        </div>


                        {decision.reason && (

                          <div className="decision-reason">

                            <span>
                              REASON
                            </span>

                            <p>
                              {decision.reason}
                            </p>

                          </div>

                        )}

                      </div>

                    )
                  )}

                </div>

              ) : (

                <div className="empty-state">
                  No nurse decisions
                  recorded yet.
                </div>

              )}

            </section>

          </>

        )}

      </div>
    );
  }

  // =========================================================
  // MAIN DASHBOARD
  // =========================================================

  return (
    <div className="dashboard">

      {/* HEADER */}

      <div className="dashboard-header">

        <div>

          <p className="eyebrow">
            PATIENTTRIAGE.AI
          </p>

          <h2>
            Triage Dashboard
          </h2>

          <p>
            Monitor active patients and AI
            assessments.
          </p>

        </div>


        <button
          type="button"
          onClick={fetchPatients}
        >
          ↻ Refresh
        </button>

      </div>


      {/* SURGE SIMULATION */}

      <section className={`surge-card ${surgeMode ? "surge-active" : ""}`}>

        <div className="surge-header">
          <div>
            <p className="eyebrow">
              SAFETY &amp; SCALABILITY
            </p>
            <h3>
              Emergency Department Surge Simulation
            </h3>
            <p className="surge-description">
              Simulate a 3× patient-volume surge to demonstrate how the triage queue
              scales while preserving priority for the most urgent cases.
            </p>
          </div>

          <button
            type="button"
            className={`surge-toggle ${surgeMode ? "surge-toggle-active" : ""}`}
            onClick={() => setSurgeMode((previous) => !previous)}
          >
            {surgeMode ? "Exit Surge Mode" : "Simulate 3× Surge"}
          </button>
        </div>

        {surgeMode && (
          <>
            <div className="surge-alert">
              <span className="surge-alert-dot" />
              <div>
                <strong>Surge mode active</strong>
                <span>
                  The following workload is simulated and does not modify the real patient database.
                </span>
              </div>
            </div>

            <div className="surge-metrics">
              <div className="surge-metric">
                <span>BASELINE</span>
                <strong>{activePatients.length}</strong>
                <small>active patients</small>
              </div>

              <div className="surge-arrow" aria-hidden="true">→</div>

              <div className="surge-metric surge-metric-emphasis">
                <span>3× SURGE</span>
                <strong>{surgeVolume}</strong>
                <small>simulated workload</small>
              </div>

              <div className="surge-metric">
                <span>ADDITIONAL</span>
                <strong>+{surgeAdditional}</strong>
                <small>simulated arrivals</small>
              </div>

              <div className="surge-metric">
                <span>CRITICAL</span>
                <strong>{surgeCritical}</strong>
                <small>priority cases</small>
              </div>

              <div className="surge-metric">
                <span>HIGH</span>
                <strong>{surgeHigh}</strong>
                <small>priority cases</small>
              </div>
            </div>

            <div className="surge-safety-row">
              <div>
                <strong>Priority protection</strong>
                <span>Critical and high-risk cases remain visible as the workload scales.</span>
              </div>
              <span className="surge-safe-badge">✓ PRIORITY PRESERVED</span>
            </div>
          </>
        )}

      </section>


      {/* ERROR */}

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}


      {/* =========================================
          STATISTICS
      ========================================= */}

      <div
        className="dashboard-stats"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "16px",
          margin: "24px 0"
        }}
      >

        <div
          className="dashboard-stat"
          style={{
            background: "#ffffff",
            border: "1px solid #dbe4f0",
            borderRadius: "12px",
            padding: "20px",
            minHeight: "100px",
            boxSizing: "border-box",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)"
          }}
        >
          <span
            style={{
              display: "block",
              marginBottom: "10px",
              color: "#64748b",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.06em"
            }}
          >
            ACTIVE PATIENTS
          </span>
          <strong style={{ display: "block", fontSize: "30px", lineHeight: 1 }}>
            {activePatients.length}
          </strong>
        </div>

        <div
          className="dashboard-stat"
          style={{
            background: "#ffffff",
            border: "1px solid #dbe4f0",
            borderRadius: "12px",
            padding: "20px",
            minHeight: "100px",
            boxSizing: "border-box",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)"
          }}
        >
          <span
            style={{
              display: "block",
              marginBottom: "10px",
              color: "#64748b",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.06em"
            }}
          >
            CRITICAL
          </span>
          <strong style={{ display: "block", fontSize: "30px", lineHeight: 1 }}>
            {criticalPatients.length}
          </strong>
        </div>

        <div
          className="dashboard-stat"
          style={{
            background: "#ffffff",
            border: "1px solid #dbe4f0",
            borderRadius: "12px",
            padding: "20px",
            minHeight: "100px",
            boxSizing: "border-box",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)"
          }}
        >
          <span
            style={{
              display: "block",
              marginBottom: "10px",
              color: "#64748b",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.06em"
            }}
          >
            HIGH
          </span>
          <strong style={{ display: "block", fontSize: "30px", lineHeight: 1 }}>
            {highPatients.length}
          </strong>
        </div>

        <div
          className="dashboard-stat"
          style={{
            background: "#ffffff",
            border: "1px solid #dbe4f0",
            borderRadius: "12px",
            padding: "20px",
            minHeight: "100px",
            boxSizing: "border-box",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)"
          }}
        >
          <span
            style={{
              display: "block",
              marginBottom: "10px",
              color: "#64748b",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.06em"
            }}
          >
            HUMAN REVIEW
          </span>
          <strong style={{ display: "block", fontSize: "30px", lineHeight: 1 }}>
            {reviewPatients.length}
          </strong>
        </div>

      </div>

      {/* =========================================
          FILTERS
      ========================================= */}

      <section className="queue-card">

        <div className="queue-header">

          <div>

            <p className="eyebrow">
              TRIAGE FILTER
            </p>

            <h3>
              Filter Patients
            </h3>

          </div>

        </div>


        <div className="filter-buttons">

          <button
            type="button"
            className={
              filter === "ALL"
                ? "active-filter"
                : ""
            }
            onClick={() =>
              setFilter("ALL")
            }
          >
            All ({activePatients.length})
          </button>


          <button
            type="button"
            className={
              filter === "CRITICAL"
                ? "active-filter"
                : ""
            }
            onClick={() =>
              setFilter("CRITICAL")
            }
          >
            Critical (
            {criticalPatients.length}
            )
          </button>


          <button
            type="button"
            className={
              filter === "HIGH"
                ? "active-filter"
                : ""
            }
            onClick={() =>
              setFilter("HIGH")
            }
          >
            High ({highPatients.length})
          </button>


          <button
            type="button"
            className={
              filter === "MODERATE"
                ? "active-filter"
                : ""
            }
            onClick={() =>
              setFilter("MODERATE")
            }
          >
            Moderate (
            {moderatePatients.length}
            )
          </button>


          <button
            type="button"
            className={
              filter === "LOW"
                ? "active-filter"
                : ""
            }
            onClick={() =>
              setFilter("LOW")
            }
          >
            Low ({lowPatients.length})
          </button>


          <button
            type="button"
            className={
              filter === "REVIEW"
                ? "active-filter"
                : ""
            }
            onClick={() =>
              setFilter("REVIEW")
            }
          >
            Review Required (
            {reviewPatients.length}
            )
          </button>

        </div>

      </section>


      {/* =========================================
          PATIENT QUEUE
      ========================================= */}

      <section className="queue-card">

        <div className="queue-header">

          <div>

            <p className="eyebrow">
              ACTIVE TRIAGE QUEUE
            </p>

            <h3>
              Patients
            </h3>

          </div>


          <span>
            {filteredPatients.length}
            {" "}patients
          </span>

        </div>


        {filteredPatients.length === 0 ? (

          <div className="empty-state">
            No patients match this filter.
          </div>

        ) : (

          <div className="table-wrapper">

            <table>

              <thead>

                <tr>

                  <th>
                    Patient
                  </th>

                  <th>
                    Complaint
                  </th>

                  <th>
                    Risk
                  </th>

                  <th>
                    Priority
                  </th>

                  <th>
                    Confidence
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Reassess
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredPatients.map(
                  (patient) => {

                    const reassessment =
                      getReassessmentStatus(
                        patient
                      );

                    return (

                      <tr
  key={patient.patient_id}
  className={
    reassessment.text === "DUE"
      ? "patient-row-due"
      : reassessment.text !== "—" &&
        !reassessment.text.includes(":")
        ? "patient-row-warning"
        : ""
  }
>

                        <td
                          onClick={() =>
                            fetchPatientDetails(
                              patient.patient_id
                            )
                          }
                          style={{
                            cursor: "pointer"
                          }}
                        >
                          <strong>
                            #
                            {
                              patient.patient_id
                            }
                          </strong>
                        </td>


                        <td
                          onClick={() =>
                            fetchPatientDetails(
                              patient.patient_id
                            )
                          }
                          style={{
                            cursor: "pointer"
                          }}
                        >
                          {
                            patient.chief_complaint
                          }
                        </td>


                        <td>

                          <span
                            className={`risk-badge ${
                              patient.risk_level
                                ?.toLowerCase()
                            }`}
                          >
                            {
                              patient.risk_level
                            }
                          </span>

                        </td>


                        <td>
                          <span
                            className={`priority-badge priority-${patient.priority?.toLowerCase()}`}
                          >
                            {patient.priority || "—"}
                          </span>
                        </td>


                        <td>

                          {
                            patient.confidence !==
                            null
                              ? `${Math.round(
                                  patient.confidence *
                                    100
                                )}%`
                              : "—"
                          }

                        </td>


                        <td>

                          {
                            patient.confidence !==
                              null &&
                            patient.confidence <
                              0.60 ? (

                            <span className="review-status">
                              REVIEW
                            </span>

                          ) : (

                            <span className="active-status">
                              ACTIVE
                            </span>

                          )}

                        </td>


                        <td>
  <span
    className={`reassessment-badge ${
      reassessment.text === "DUE"
        ? "due-badge"
        : reassessment.className
    }`}
  >
    {reassessment.text === "DUE"
      ? "🔴 DUE NOW"
      : reassessment.text}
  </span>
</td>


                        <td>

                          <button
                            type="button"
                            onClick={() =>
                              openReassessment(
                                patient
                              )
                            }
                          >
                            Reassess
                          </button>

                        </td>

                      </tr>

                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>


      {/* =========================================
          REASSESSMENT MODAL
      ========================================= */}

      {showReassessment &&
        reassessingPatient && (

          <div className="modal-overlay">

            <div className="reassessment-modal">

              <div className="modal-header">

                <div>

                  <p className="eyebrow">
                    PATIENT REASSESSMENT
                  </p>

                  <h2>
                    Patient #
                    {
                      reassessingPatient
                        .patient_id
                    }
                  </h2>

                </div>


                <button
                  type="button"
                  onClick={
                    closeReassessment
                  }
                  disabled={
                    reassessmentLoading
                  }
                >
                  ✕
                </button>

              </div>


              {/* =====================================
                  REASSESSMENT RESULT
              ===================================== */}

              {reassessmentResult ? (

                <div className="reassessment-result">

                  <div className="result-status">

                    {reassessmentResult.status ===
                    "REASSESSMENT_COMPLETE" ? (

                      <strong>
                        Reassessment Complete
                      </strong>

                    ) : (

                      <strong>
                        Human Review Required
                      </strong>

                    )}

                  </div>


                  <p>
                    {
                      reassessmentResult.message
                    }
                  </p>


                  {
                    reassessmentResult
                      .assessment_id && (

                    <div className="result-grid">

                      <div>

                        <span>
                          NEW ASSESSMENT
                        </span>

                        <strong>
                          #
                          {
                            reassessmentResult
                              .assessment_id
                          }
                        </strong>

                      </div>


                      <div>

                        <span>
                          RISK
                        </span>

                        <strong>
                          {
                            reassessmentResult
                              .assessment
                              ?.risk_level
                          }
                        </strong>

                      </div>


                      <div>

                        <span>
                          PRIORITY
                        </span>

                        <strong>
                          {
                            reassessmentResult
                              .assessment
                              ?.priority
                          }
                        </strong>

                      </div>


                      <div>

                        <span>
                          CONFIDENCE
                        </span>

                        <strong>

                          {
                            reassessmentResult
                              .fusion
                              ?.confidence !==
                            undefined
                              ? `${Math.round(
                                  reassessmentResult
                                    .fusion
                                    .confidence *
                                    100
                                )}%`
                              : "—"
                          }

                        </strong>

                      </div>

                    </div>

                  )}


                  <div className="modal-actions">

                    <button
                      type="button"
                      onClick={async () => {

                        setShowReassessment(
                          false
                        );

                        setReassessmentResult(
                          null
                        );

                        await fetchPatientDetails(
                          reassessingPatient
                            .patient_id
                        );

                        setReassessingPatient(
                          null
                        );

                      }}
                    >
                      View Updated Patient
                    </button>

                  </div>

                </div>

              ) : (
                <>
                  {/* =================================
                     REASSESSMENT FORM
                  ================================= */}

                  <p className="form-help" style={{ marginBottom: "16px" }}>
                    Update only the measurements that are available now.
                    Leave an unavailable field unchanged to keep the patient's
                    previously recorded value.
                  </p>

                  <form
                  onSubmit={
                    submitReassessment
                  }
                >

                  <div className="reassessment-grid">

                    <div className="form-group">

                      <label>
                        Age
                      </label>

                      <input
                        type="number"
                        name="age"
                        value={
                          reassessmentForm.age
                        }
                        onChange={
                          handleReassessmentChange
                        }
                      />

                    </div>


                    <div className="form-group">

                      <label>
                        Heart Rate
                      </label>

                      <input
                        type="number"
                        name="heart_rate"
                        value={
                          reassessmentForm
                            .heart_rate
                        }
                        onChange={
                          handleReassessmentChange
                        }
                      />

                    </div>


                    <div className="form-group">

                      <label>
                        Systolic BP
                      </label>

                      <input
                        type="number"
                        name="systolic_bp"
                        value={
                          reassessmentForm
                            .systolic_bp
                        }
                        onChange={
                          handleReassessmentChange
                        }
                      />

                    </div>


                    <div className="form-group">

                      <label>
                        Diastolic BP
                      </label>

                      <input
                        type="number"
                        name="diastolic_bp"
                        value={
                          reassessmentForm
                            .diastolic_bp
                        }
                        onChange={
                          handleReassessmentChange
                        }
                      />

                    </div>


                    <div className="form-group">

                      <label>
                        SpO₂
                      </label>

                      <input
                        type="number"
                        step="0.1"
                        name="spo2"
                        value={
                          reassessmentForm.spo2
                        }
                        onChange={
                          handleReassessmentChange
                        }
                      />

                    </div>


                    <div className="form-group">

                      <label>
                        Temperature
                      </label>

                      <input
                        type="number"
                        step="0.1"
                        name="temperature"
                        value={
                          reassessmentForm
                            .temperature
                        }
                        onChange={
                          handleReassessmentChange
                        }
                      />

                    </div>


                    <div className="form-group">

                      <label>
                        Respiratory Rate
                      </label>

                      <input
                        type="number"
                        name="respiratory_rate"
                        value={
                          reassessmentForm
                            .respiratory_rate
                        }
                        onChange={
                          handleReassessmentChange
                        }
                      />

                    </div>


                    <div className="form-group">

                      <label>
                        Pain Score
                      </label>

                      <input
                        type="number"
                        min="0"
                        max="10"
                        name="pain_score"
                        value={
                          reassessmentForm
                            .pain_score
                        }
                        onChange={
                          handleReassessmentChange
                        }
                      />

                    </div>


                    <div className="form-group">

                      <label>
                        Consciousness
                      </label>

                      <select
                        name="consciousness"
                        value={
                          reassessmentForm
                            .consciousness
                        }
                        onChange={
                          handleReassessmentChange
                        }
                      >

                        <option value="Alert">
                          Alert
                        </option>

                        <option value="Confused">
                          Confused
                        </option>

                        <option value="Drowsy">
                          Drowsy
                        </option>

                        <option value="Unresponsive">
                          Unresponsive
                        </option>

                      </select>

                    </div>


                    <div className="form-group full-width">

                      <label>
                        Chief Complaint
                      </label>

                      <input
                        type="text"
                        name="chief_complaint"
                        value={
                          reassessmentForm
                            .chief_complaint
                        }
                        onChange={
                          handleReassessmentChange
                        }
                      />

                    </div>

                  </div>


                  <div className="modal-actions">

                    <button
                      type="button"
                      onClick={
                        closeReassessment
                      }
                      disabled={
                        reassessmentLoading
                      }
                    >
                      Cancel
                    </button>


                    <button
                      type="submit"
                      disabled={
                        reassessmentLoading
                      }
                    >
                      {
                        reassessmentLoading
                          ? "Running AI Assessment..."
                          : "Run Reassessment"
                      }
                    </button>

                  </div>

                  </form>
                </>
              )}

            </div>

          </div>

        )}

    </div>
  );
}

export default Dashboard;