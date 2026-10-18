import { useAnalyses } from "../hooks/useAnalyses.js";

const typeLabel = (mime) => (mime === "application/pdf" ? "PDF" : "Text");

function Document({ label, name, type }) {
  return (
    <span>
      <small>{label}</small> {name} <span className="tag">{typeLabel(type)}</span>
    </span>
  );
}

export default function HistoryPage() {
  const { analyses, loading, remove } = useAnalyses();

  return (
    <div className="card history">
      <h3>History</h3>
      {loading && <p className="auth-sub">Loading…</p>}
      {!loading && analyses.length === 0 && <p className="auth-sub">Your saved scans will appear here.</p>}
      {analyses.map((a) => (
        <div className="history-item" key={a.id}>
          <div className="history-docs">
            <Document label="Resume" name={a.resumeName} type={a.resumeType} />
            <Document label="Job description" name={a.jobName} type={a.jobType} />
            <small>{new Date(a.createdAt).toLocaleString()}</small>
          </div>
          <div className="history-score">
            <b>{a.total}%</b>
            <small>{a.verdict}</small>
            <button type="button" className="link" onClick={() => remove(a.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
