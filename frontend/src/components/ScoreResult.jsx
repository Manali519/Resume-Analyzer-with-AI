import { useState } from "react";
import { WEIGHTS } from "../lib/weights.js";

const MORE = /\s*(\+\d+ more)$/;

// Short tips; a trailing "+N more" opens the full list of resume edits
function Tips({ tips, steps, missing }) {
  const [open, setOpen] = useState(false);
  // older saved scans have no steps; fall back to the missing skills
  const allSteps = steps?.length ? steps : missing.map((s) => `Add "${s}" to your resume.`);
  return (
    <>
      <ul className="tips">
        {tips.map((t) => {
          const [text, more] = t.split(MORE);
          return (
            <li key={t}>
              {text}
              {more && <> <button type="button" className="more-link" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "show less" : more}</button></>}
            </li>
          );
        })}
      </ul>
      {open && (
        <div className="all-steps">
          <h4>How to edit your resume</h4>
          <ol>{allSteps.map((s) => <li key={s}>{s}</li>)}</ol>
        </div>
      )}
    </>
  );
}

const BREAKDOWN = [
  ["skills", "Skills"],
  ["projects", "Projects"],
  ["experience", "Experience"],
  ["additional", "Additional Experience / Traits"],
  ["education", "Education"],
];

function Meter({ value }) {
  const r = 70, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 180 180" className="meter">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7cc4f5" /><stop offset="1" stopColor="#f59ac4" />
        </linearGradient>
      </defs>
      <circle cx="90" cy="90" r={r} className="track" />
      <circle cx="90" cy="90" r={r} className="bar" stroke="url(#g)"
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 90 90)" />
      <text x="90" y="92" textAnchor="middle" className="num">{value}%</text>
      <text x="90" y="116" textAnchor="middle" className="cap">match</text>
    </svg>
  );
}

export default function ScoreResult({ result }) {
  return (
    <div className="results card">
      <div className="res-top">
        <Meter value={result.total} />
        <div>
          <h3>{result.verdict}</h3>
          <Tips tips={result.tips} steps={result.steps} missing={result.missing} />
        </div>
      </div>
      <h4>Real time breakdown</h4>
      {BREAKDOWN.map(([k, label], i) => (
        <div className="row" key={k}>
          <div className="row-h">
            <span>{label} <small>({WEIGHTS[k]}% weight)</small></span>
            <b>{result.parts[k]}%</b>
          </div>
          <div className="track"><div className="fill" style={{ width: `${result.parts[k]}%`, animationDelay: `${i * 100}ms` }} /></div>
        </div>
      ))}
      <div className="chips">
        {result.matched.map((m) => <span key={m} className="chip ok">✓ {m}</span>)}
        {result.missing.map((m) => <span key={m} className="chip no">✗ {m}</span>)}
      </div>
    </div>
  );
}
