import { useState } from "react";
import { Link } from "react-router-dom";
import Reveal from "../components/Reveal.jsx";
import Uploader from "../components/Uploader.jsx";
import ScoreResult from "../components/ScoreResult.jsx";
import SimilarJobs from "../components/SimilarJobs.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

const MIN_LENGTH = 30;

export default function ScanPage() {
  const { user } = useAuth();
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [jobName, setJobName] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (resume.trim().length < MIN_LENGTH || jd.trim().length < MIN_LENGTH) {
      setError("Please provide both a resume and a job description (at least a few lines each).");
      return;
    }
    setError("");
    setBusy(true);
    setResult(null);
    try {
      const body = { resumeText: resume, jobText: jd, resumeName, jobName };
      const { analysis } = await (user ? api.saveAnalysis(body) : api.previewAnalysis(body));
      setResult(analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section alt">
      <Reveal as="h2">Know Your Chances</Reveal>
      <Reveal as="p" className="sub">Upload both documents and analyze with one click.</Reveal>
      <div className="grid2">
        <Uploader label="Resume" icon="📄" value={resume} onChange={setResume} onFileName={setResumeName} />
        <Uploader label="Job Description" icon="💼" value={jd} onChange={setJd} onFileName={setJobName} />
      </div>
      {error && <p className="error">{error}</p>}
      {!user && (
        <p className="auth-sub center">
          <Link className="link" to="/login">Log in</Link> to save your results and track progress.
        </p>
      )}
      <div className="center">
        <button className={`btn btn-primary big ${busy ? "busy" : ""}`} onClick={run} disabled={busy}>
          {busy ? "Analyzing…" : "Analyze match"}
        </button>
      </div>
      {result && <ScoreResult result={result} />}
      {result && <SimilarJobs jobs={result.similarJobs} skills={result.datasetSkills} />}
    </section>
  );
}
