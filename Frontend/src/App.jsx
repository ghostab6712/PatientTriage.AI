import { useState } from "react";
import axios from "axios";
import Dashboard from "./Dashboard";

function App() {
  const [patient, setPatient] = useState({
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

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Navigation
  const [showDashboard, setShowDashboard] = useState(false);

  // Modify states
  const [showModify, setShowModify] = useState(false);
  const [modifiedPriority, setModifiedPriority] = useState("");
  const [modifiedPathway, setModifiedPathway] = useState("");

  // Override states
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  // =========================
  // INPUT CHANGE
  // =========================

  const handleChange = (e) => {
    setPatient({
      ...patient,
      [e.target.name]: e.target.value
    });
  };

  // =========================
  // PATIENT ASSESSMENT
  // =========================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);
    setShowModify(false);
    setShowOverride(false);

    try {
      const response = await axios.post(
        "https://patienttriage-ai.onrender.com/triage",
        {
          age: Number(patient.age),
          heart_rate: Number(patient.heart_rate),
          systolic_bp: Number(patient.systolic_bp),
          diastolic_bp: Number(patient.diastolic_bp),
          spo2: Number(patient.spo2),
          temperature: Number(patient.temperature),
          respiratory_rate: Number(patient.respiratory_rate),
          pain_score: Number(patient.pain_score),
          consciousness: patient.consciousness,
          chief_complaint: patient.chief_complaint
        }
      );

      setResult(response.data);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to connect to the backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ACCEPT
  // =========================

  const handleAccept = async () => {
    if (!result || !result.assessment_id) {
      alert("Assessment ID is missing.");
      return;
    }

    try {
      const response = await axios.post(
        "https://patienttriage-ai.onrender.com/decision",
        {
          assessment_id: result.assessment_id,
          decision: "ACCEPT",
          ai_recommendation: result.assessment?.priority,
          final_priority: result.assessment?.priority,
          final_pathway: result.recommendation?.pathway,
          reason: null
        }
      );

      alert(`Decision recorded: ${response.data.decision}`);
    } catch (error) {
      console.error(error);
      alert("Unable to record the nurse decision.");
    }
  };

  // =========================
  // OPEN MODIFY
  // =========================

  const openModify = () => {
    if (!result) return;

    setModifiedPriority(
      result.assessment?.priority || "P1"
    );

    setModifiedPathway(
      result.recommendation?.pathway ||
        "Main emergency department"
    );

    setShowModify(true);
    setShowOverride(false);
  };

  // =========================
  // SAVE MODIFICATION
  // =========================

  const handleModify = async () => {
    if (!result || !result.assessment_id) {
      alert("Assessment ID is missing.");
      return;
    }

    try {
      const response = await axios.post(
        "https://patienttriage-ai.onrender.com/decision",
        {
          assessment_id: result.assessment_id,
          decision: "MODIFY",
          ai_recommendation: result.assessment?.priority,
          final_priority: modifiedPriority,
          final_pathway: modifiedPathway,
          reason: "Nurse modified the AI recommendation."
        }
      );

      alert(`Decision recorded: ${response.data.decision}`);

      setShowModify(false);
    } catch (error) {
      console.error(error);
      alert("Unable to record the modification.");
    }
  };

  // =========================
  // OPEN OVERRIDE
  // =========================

  const openOverride = () => {
    setOverrideReason("");
    setShowOverride(true);
    setShowModify(false);
  };

  // =========================
  // CONFIRM OVERRIDE
  // =========================

  const handleOverride = async () => {
    if (!result || !result.assessment_id) {
      alert("Assessment ID is missing.");
      return;
    }

    if (!overrideReason.trim()) {
      alert("Override reason is required.");
      return;
    }

    try {
      const response = await axios.post(
        "https://patienttriage-ai.onrender.com/decision",
        {
          assessment_id: result.assessment_id,
          decision: "OVERRIDE",
          ai_recommendation: result.assessment?.priority,
          final_priority:
            modifiedPriority ||
            result.assessment?.priority,
          final_pathway:
            modifiedPathway ||
            result.recommendation?.pathway,
          reason: overrideReason
        }
      );

      alert(`Decision recorded: ${response.data.decision}`);

      setShowOverride(false);
      setOverrideReason("");
    } catch (error) {
      console.error(error);
      alert("Unable to record the override.");
    }
  };

  return (
    <div className="app">

      {/* ================= HEADER ================= */}

      <header className="header">

        <div>
          <h1>
            PatientTriage<span>.ai</span>
          </h1>

          <p>
            AI-assisted emergency triage
          </p>
        </div>


        {/* NAVIGATION */}

        <div className="navigation">

          <button
            type="button"
            onClick={() => setShowDashboard(false)}
          >
            Patient Intake
          </button>

          <button
            type="button"
            onClick={() => setShowDashboard(true)}
          >
            Dashboard
          </button>

        </div>


        {/* SYSTEM STATUS */}

        <div className="status">
          <span></span>
          System Online
        </div>

      </header>


      {/* ================= MAIN ================= */}

      <main className="container">

        {showDashboard ? (

          /* ================= DASHBOARD ================= */

          <Dashboard />

        ) : (

          /* ================= PATIENT INTAKE ================= */

          <>

            <div className="page-title">

              <h2>
                Patient Intake
              </h2>

              <p>
                Enter the patient's initial clinical information
                for AI-assisted assessment.
              </p>

            </div>


            {/* ================= FORM ================= */}

            <form onSubmit={handleSubmit}>

              <section className="card">

                <h3>
                  Patient Information
                </h3>

                <div className="form-grid">

                  {/* AGE */}

                  <div className="field">

                    <label>
                      Age
                    </label>

                    <input
                      type="number"
                      name="age"
                      value={patient.age}
                      onChange={handleChange}
                      placeholder="e.g. 67"
                      required
                    />

                  </div>


                  {/* HEART RATE */}

                  <div className="field">

                    <label>
                      Heart Rate <span>BPM</span>
                    </label>

                    <input
                      type="number"
                      name="heart_rate"
                      value={patient.heart_rate}
                      onChange={handleChange}
                      placeholder="e.g. 118"
                      required
                    />

                  </div>


                  {/* SYSTOLIC BP */}

                  <div className="field">

                    <label>
                      Systolic BP <span>mmHg</span>
                    </label>

                    <input
                      type="number"
                      name="systolic_bp"
                      value={patient.systolic_bp}
                      onChange={handleChange}
                      placeholder="e.g. 88"
                      required
                    />

                  </div>


                  {/* DIASTOLIC BP */}

                  <div className="field">

                    <label>
                      Diastolic BP <span>mmHg</span>
                    </label>

                    <input
                      type="number"
                      name="diastolic_bp"
                      value={patient.diastolic_bp}
                      onChange={handleChange}
                      placeholder="e.g. 58"
                      required
                    />

                  </div>


                  {/* SPO2 */}

                  <div className="field">

                    <label>
                      SpO₂ <span>%</span>
                    </label>

                    <input
                      type="number"
                      name="spo2"
                      value={patient.spo2}
                      onChange={handleChange}
                      placeholder="e.g. 91"
                      required
                    />

                  </div>


                  {/* TEMPERATURE */}

                  <div className="field">

                    <label>
                      Temperature <span>°C</span>
                    </label>

                    <input
                      type="number"
                      step="0.1"
                      name="temperature"
                      value={patient.temperature}
                      onChange={handleChange}
                      placeholder="e.g. 37.1"
                      required
                    />

                  </div>


                  {/* RESPIRATORY RATE */}

                  <div className="field">

                    <label>
                      Respiratory Rate <span>/min</span>
                    </label>

                    <input
                      type="number"
                      name="respiratory_rate"
                      value={patient.respiratory_rate}
                      onChange={handleChange}
                      placeholder="e.g. 25"
                      required
                    />

                  </div>


                  {/* PAIN SCORE */}

                  <div className="field">

                    <label>
                      Pain Score <span>0–10</span>
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="10"
                      name="pain_score"
                      value={patient.pain_score}
                      onChange={handleChange}
                      placeholder="e.g. 8"
                      required
                    />

                  </div>


                  {/* CONSCIOUSNESS */}

                  <div className="field">

                    <label>
                      Consciousness
                    </label>

                    <select
                      name="consciousness"
                      value={patient.consciousness}
                      onChange={handleChange}
                    >
                      <option>Alert</option>
                      <option>Confused</option>
                      <option>Drowsy</option>
                      <option>Unresponsive</option>
                    </select>

                  </div>

                </div>

              </section>


              {/* ================= CHIEF COMPLAINT ================= */}

              <section className="card">

                <h3>
                  Chief Complaint
                </h3>

                <textarea
                  name="chief_complaint"
                  value={patient.chief_complaint}
                  onChange={handleChange}
                  placeholder="Describe the patient's primary complaint..."
                  rows="4"
                  required
                />

              </section>


              {/* ================= ASSESS BUTTON ================= */}

              <div className="action-area">

                <button
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Assessing..."
                    : "Assess Patient →"}
                </button>

                <p>
                  AI assessment is decision support.
                  Final clinical decisions remain with
                  qualified healthcare professionals.
                </p>

              </div>

            </form>


            {/* ================= ERROR ================= */}

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}


            {/* ================= ASSESSMENT RESULT ================= */}

            {result && (

              <section className="assessment-card">

                {/* HEADER */}

                <div className="assessment-header">

                  <div>

                    <p className="eyebrow">
                      AI TRIAGE ASSESSMENT
                    </p>

                    <h2>
                      {result.status === "HUMAN_REVIEW_REQUIRED"
                        ? "Human Review Required"
                        : "Assessment Complete"}
                    </h2>

                  </div>


                  <div
                    className={`status-badge ${
                      result.status === "HUMAN_REVIEW_REQUIRED"
                        ? "warning"
                        : "success"
                    }`}
                  >
                    {result.status === "HUMAN_REVIEW_REQUIRED"
                      ? "REVIEW REQUIRED"
                      : "COMPLETE"}
                  </div>

                </div>


                {result.assessment && (

                  <>

                    {/* ================= RISK ================= */}

                    <div className="risk-section">

                      <div className="risk-main">

                        <span>
                          FINAL RISK
                        </span>

                        <strong>
                          {result.fusion?.final_risk ||
                            result.assessment.risk_level}
                        </strong>

                      </div>


                      <div className="confidence-main">

                        <span>
                          AI CONFIDENCE
                        </span>

                        <strong>
                          {Math.round(
                            (result.fusion?.confidence ||
                              result.confidence?.confidence ||
                              0) * 100
                          )}
                          %
                        </strong>

                      </div>

                    </div>


                    {/* ================= MODEL INFO ================= */}

                    <div className="assessment-grid">

                      <div className="info-box">

                        <span>
                          RULE ENGINE
                        </span>

                        <strong>
                          {result.fusion?.rule_prediction}
                        </strong>

                      </div>


                      <div className="info-box">

                        <span>
                          ML MODEL
                        </span>

                        <strong>
                          {result.fusion?.ml_prediction}
                        </strong>

                      </div>


                      <div className="info-box">

                        <span>
                          PRIORITY
                        </span>

                        <strong>
                          {result.assessment.priority}
                        </strong>

                      </div>


                      <div className="info-box">

                        <span>
                          REASSESSMENT
                        </span>

                        <strong>
                          {result.assessment.reassessment_minutes}
                          {" "}min
                        </strong>

                      </div>

                    </div>


                    {/* ================= RECOMMENDATION ================= */}

                    <div className="recommendation-box">

                      <p className="eyebrow">
                        RECOMMENDATION
                      </p>

                      <h3>
                        {result.recommendation?.pathway}
                      </h3>

                      <p>
                        {result.recommendation?.message}
                      </p>

                      {result.recommendation?.escalation && (

                        <div className="escalation">
                          ⚠ Escalation required
                        </div>

                      )}

                    </div>


                    {/* ================= REASONS ================= */}

                    {result.assessment.reasons &&
                      result.assessment.reasons.length > 0 && (

                        <div className="reasons-box">

                          <p className="eyebrow">
                            WHY THIS RESULT?
                          </p>

                          <ul>

                            {result.assessment.reasons.map(
                              (reason, index) => (

                                <li key={index}>
                                  {reason}
                                </li>

                              )
                            )}

                          </ul>

                        </div>

                      )}


                    {/* ================= DISAGREEMENT ================= */}

                    {result.fusion &&
                      !result.fusion.models_agree && (

                        <div className="disagreement-box">

                          <strong>
                            AI systems disagree
                          </strong>

                          <p>
                            The rule engine classified
                            this patient as{" "}

                            <b>
                              {result.fusion.rule_prediction}
                            </b>

                            , while the ML model predicted{" "}

                            <b>
                              {result.fusion.ml_prediction}
                            </b>

                            . Human review is therefore
                            required.
                          </p>

                        </div>

                      )}


                    {/* ================= NURSE DECISION ================= */}

                    <div className="nurse-decision">

                      <p className="eyebrow">
                        NURSE DECISION
                      </p>

                      <p className="decision-text">
                        Review the AI recommendation and
                        record your decision.
                      </p>


                      <div className="decision-buttons">

                        {/* ACCEPT */}

                        <button
                          type="button"
                          className="accept-button"
                          onClick={handleAccept}
                        >
                          ✓ Accept Recommendation
                        </button>


                        {/* MODIFY */}

                        <button
                          type="button"
                          className="modify-button"
                          onClick={openModify}
                        >
                          ✎ Modify Recommendation
                        </button>


                        {/* OVERRIDE */}

                        <button
                          type="button"
                          className="override-button"
                          onClick={openOverride}
                        >
                          ↺ Override AI
                        </button>

                      </div>


                      {/* ================= MODIFY PANEL ================= */}

                      {showModify && (

                        <div className="modify-panel">

                          <p className="eyebrow">
                            MODIFY RECOMMENDATION
                          </p>


                          <div className="modify-fields">

                            <div className="field">

                              <label>
                                Priority
                              </label>

                              <select
                                value={modifiedPriority}
                                onChange={(e) =>
                                  setModifiedPriority(
                                    e.target.value
                                  )
                                }
                              >

                                <option value="P1">
                                  P1 — Immediate
                                </option>

                                <option value="P2">
                                  P2 — Urgent
                                </option>

                                <option value="P3">
                                  P3 — Moderate
                                </option>

                                <option value="P4">
                                  P4 — Lower acuity
                                </option>

                              </select>

                            </div>


                            <div className="field">

                              <label>
                                Pathway
                              </label>

                              <select
                                value={modifiedPathway}
                                onChange={(e) =>
                                  setModifiedPathway(
                                    e.target.value
                                  )
                                }
                              >

                                <option>
                                  High-acuity / immediate clinical review
                                </option>

                                <option>
                                  Main emergency department
                                </option>

                                <option>
                                  Fast-track / routine assessment
                                </option>

                                <option>
                                  Clinical review required
                                </option>

                              </select>

                            </div>

                          </div>


                          <div className="modify-actions">

                            <button
                              type="button"
                              className="save-modify-button"
                              onClick={handleModify}
                            >
                              Save Modification
                            </button>


                            <button
                              type="button"
                              className="cancel-button"
                              onClick={() =>
                                setShowModify(false)
                              }
                            >
                              Cancel
                            </button>

                          </div>

                        </div>

                      )}


                      {/* ================= OVERRIDE PANEL ================= */}

                      {showOverride && (

                        <div className="override-panel">

                          <p className="eyebrow">
                            OVERRIDE AI RECOMMENDATION
                          </p>

                          <label>
                            Reason for override
                          </label>

                          <textarea
                            value={overrideReason}
                            onChange={(e) =>
                              setOverrideReason(
                                e.target.value
                              )
                            }
                            placeholder="Enter the clinical reason for overriding the AI recommendation..."
                            rows="4"
                          />


                          <div className="override-actions">

                            <button
                              type="button"
                              className="confirm-override-button"
                              onClick={handleOverride}
                            >
                              Confirm Override
                            </button>


                            <button
                              type="button"
                              className="cancel-button"
                              onClick={() =>
                                setShowOverride(false)
                              }
                            >
                              Cancel
                            </button>

                          </div>

                        </div>

                      )}

                    </div>

                  </>

                )}

              </section>

            )}

          </>

        )}

      </main>

    </div>
  );
}

export default App;