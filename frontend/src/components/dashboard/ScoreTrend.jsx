import { BAND_LIST, bandOf } from "../../lib/bands.js";

const GRID_LINES = [100, 75, 50, 25, 0];

function trendText(scans) {
  if (scans.length < 2) return "Scan more resumes to see how your score changes.";
  const change = scans.at(-1).total - scans[0].total;
  if (change === 0) return "Your latest score is the same as your first.";
  return `${change > 0 ? "Up" : "Down"} ${Math.abs(change)} points since your first scan.`;
}

export default function ScoreTrend({ scans }) {
  return (
    <section className="card panel">
      <h3>Your scores over time</h3>
      <p className="panel-help">Each bar is one scan, oldest on the left. Hover over a bar to see the job.</p>

      <div className="chart">
        <div className="chart-axis">
          {GRID_LINES.map((v) => <span key={v} style={{ bottom: `${v}%` }}>{v}</span>)}
        </div>
        <div className="chart-body">
          {GRID_LINES.map((v) => <div key={v} className="grid-line" style={{ bottom: `${v}%` }} />)}
          {scans.map((scan) => (
            <div className="col" key={scan.id} title={`${scan.jobName}: ${scan.total}%`}>
              <span className="col-value">{scan.total}</span>
              <i className={`band-${bandOf(scan.total).key}`} style={{ height: `${Math.max(scan.total, 2)}%` }} />
            </div>
          ))}
        </div>
      </div>

      <p className="trend"><b>{trendText(scans)}</b></p>
      <ul className="legend">
        {BAND_LIST.map((b) => (
          <li key={b.key} className={`band-${b.key}`}>
            <i />{b.label} {b.min === 0 ? "below 35" : `${b.min}+`}
          </li>
        ))}
      </ul>
    </section>
  );
}
