// The top job titles from the dataset that also fit the uploaded resume

function Part({ label, value }) {
  return (
    <div className="job-part">
      <div className="row-h"><small>{label}</small><small><b>{value}%</b></small></div>
      <div className="track"><div className="fill" style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function JobCard({ job, rank }) {
  return (
    <article className={`card job-card role-${job.band} ${rank === 1 ? "top" : ""}`}>
      <div className="job-head">
        <div>
          <small className="job-rank">{rank === 1 ? "🥇 Top pick" : `#${rank}`}</small>
          <h4>{job.title}</h4>
          <span className="job-band">{job.bandLabel}</span>
        </div>
        <b className="job-score">{job.score}%</b>
      </div>
      <Part label="Skill similarity" value={job.similarity} />
      <Part label="Skill coverage" value={job.coverage} />
      <div className="chips">
        {job.matched.map((s) => <span key={s} className="chip ok">✓ {s}</span>)}
        {job.missing.map((s) => <span key={s} className="chip no">✗ {s}</span>)}
      </div>
    </article>
  );
}

export default function SimilarJobs({ jobs, skills }) {
  return (
    <section className="similar">
      <h3>Similar jobs found for your resume</h3>
      {jobs.length === 0 ? (
        <p className="card panel panel-empty">
          No similar jobs found. List your technical skills clearly in your resume, for example in a Skills section.
        </p>
      ) : (
        <>
          <p className="panel-help">
            Top {jobs.length} job titles for the skills in your resume:{" "}
            {skills.map((s) => <span key={s} className="chip ok">{s}</span>)}
          </p>
          <div className="job-grid">
            {jobs.map((job, i) => <JobCard key={job.title} job={job} rank={i + 1} />)}
          </div>
          <p className="panel-help">
            Similarity compares your skills with each title's skill profile; coverage is how much of a typical
            posting you already meet. The score is the average of both.
          </p>
        </>
      )}
    </section>
  );
}
