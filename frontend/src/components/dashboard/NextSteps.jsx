export default function NextSteps({ scan }) {
  return (
    <section className="card panel">
      <h3>What to do next</h3>
      <p className="panel-help">Advice from your latest scan: {scan.jobName}.</p>
      <ol className="steps">
        {(scan.steps?.length ? scan.steps : scan.tips).slice(0, 3).map((tip) => <li key={tip}>{tip}</li>)}
      </ol>
    </section>
  );
}
