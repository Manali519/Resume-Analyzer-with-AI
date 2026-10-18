export default function SkillGaps({ gaps }) {
  return (
    <section className="card panel">
      <h3>Skills to work on</h3>
      <p className="panel-help">
        Skills that job descriptions asked for but your resume did not show. The number is how many scans missed it.
      </p>
      {gaps.length === 0 ? (
        <p className="panel-empty">No gaps found — your resumes covered every skill asked for.</p>
      ) : (
        <div className="chips">
          {gaps.map(([name, count]) => (
            <span key={name} className="chip no">{name} <b>{count}</b></span>
          ))}
        </div>
      )}
    </section>
  );
}
