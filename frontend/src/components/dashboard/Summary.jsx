import { Link } from "react-router-dom";
import { AREAS } from "../../lib/weights.js";
import { bandOf } from "../../lib/bands.js";

export default function Summary({ stats }) {
  const band = bandOf(stats.average);
  const strongest = AREAS.find((a) => a.key === stats.strongest);
  const weakest = AREAS.find((a) => a.key === stats.weakest);

  return (
    <section className={`card summary band-${band.key}`}>
      <div className="summary-score">
        <b>{stats.average}%</b>
        <small>average match</small>
      </div>
      <div className="summary-text">
        <h3>{band.label} — {band.meaning}</h3>
        <p>
          Across {stats.count} {stats.count === 1 ? "scan" : "scans"}, your resumes match the jobs you picked
          about {stats.average}% on average.
          {` You are strongest in ${strongest.label.toLowerCase()}`}
          {weakest && weakest !== strongest && ` and have the most room to grow in ${weakest.label.toLowerCase()}`}.
        </p>
        <Link to="/scan" className="btn btn-primary">Scan another resume</Link>
      </div>
    </section>
  );
}
