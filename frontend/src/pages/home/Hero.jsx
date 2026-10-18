import { Link } from "react-router-dom";

// Splits text into letters that hop in a rolling wave
function JumpText({ text, start = 0 }) {
  return [...text].map((ch, i) =>
    ch === " " ? (
      " "
    ) : (
      <span key={i} aria-hidden="true" className="jump" style={{ animationDelay: `${(start + i) * 0.07}s` }}>
        {ch}
      </span>
    )
  );
}

export default function Hero() {
  return (
    <section id="home" className="hero">
      <div className="blob b1" /><div className="blob b2" /><div className="blob b3" />
      <div className="hero-inner">
        <h1 aria-label="Know your career before you apply.">
          <JumpText text="Know your " />
          <em><JumpText text="career" start={10} /></em>
          <span className="nowrap"><JumpText text=" before you apply." start={16} /></span>
        </h1>
        <p>
          Our scanner doesn't just match keywords: it uses semantic alignment between your resume and the job
          description to improve reliability and show you where you really stand.
        </p>
        <div className="hero-cta">
          <Link to="/scan" className="btn btn-primary big">Scan my resume</Link>
          <Link to="/#how" className="btn btn-ghost big">How it works</Link>
        </div>
      </div>
    </section>
  );
}
