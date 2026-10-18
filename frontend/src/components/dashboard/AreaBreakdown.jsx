import { AREAS, WEIGHTS } from "../../lib/weights.js";
import { bandOf } from "../../lib/bands.js";

export default function AreaBreakdown({ averages }) {
  return (
    <section className="card panel">
      <h3>How you score in each area</h3>
      <p className="panel-help">Average across all your scans. A longer bar means a stronger area.</p>
      {AREAS.map((area) => {
        const value = averages[area.key];
        return (
          <div className={`area band-${bandOf(value).key}`} key={area.key}>
            <div className="area-head">
              <span>
                <b>{area.label}</b>
                <small>{area.hint} · counts for {WEIGHTS[area.key]}% of the score</small>
              </span>
              <b className="area-value">{value}%</b>
            </div>
            <div className="meter-bar" role="img" aria-label={`${area.label} ${value} percent`}>
              <i style={{ width: `${value}%` }} />
            </div>
          </div>
        );
      })}
    </section>
  );
}
