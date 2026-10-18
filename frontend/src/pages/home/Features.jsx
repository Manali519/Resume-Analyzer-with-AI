import Reveal from "../../components/Reveal.jsx";
import { WEIGHTS } from "../../lib/weights.js";

const SCORE_PARTS = [
  {
    key: "skills", icon: "🧩", color: "blue", title: "Skills",
    what: "How many of the job's required skills your resume covers.",
    how: "Skills are grouped into concepts (REST ≈ API). Concept coverage counts 75%, text similarity of your skills section 25%.",
  },
  {
    key: "projects", icon: "🚀", color: "pink", title: "Projects",
    what: "Whether your hands-on work matches what the role needs.",
    how: "Projects are compared with the job by similarity (50%) and by skill concepts shown (50%). No projects section scores 0.",
  },
  {
    key: "experience", icon: "💼", color: "purple", title: "Experience",
    what: "Relevance and length of your work history.",
    how: "Similarity of your experience to the job (60%) plus your years versus the years required (40%).",
  },
  {
    key: "additional", icon: "🌟", color: "mint", title: "Additional Experience / Traits",
    what: "Soft skills such as leadership, communication and initiative.",
    how: "Traits the job asks for that your resume shows (60%), plus showing at least three traits overall (40%).",
  },
  {
    key: "education", icon: "🎓", color: "peach", title: "Education",
    what: "Whether your degree level meets the job's expectation.",
    how: "Your degree level is compared with the one required. Meeting or exceeding it earns full marks.",
  },
];

const SIMILAR_JOBS = [["Frontend Developer", 92], ["React Engineer", 86], ["UI Engineer", 78]];
const DASHBOARD_BARS = [55, 70, 48, 82, 66, 90];

export default function Features() {
  return (
    <section id="features" className="section">
      <Reveal as="h2">How Your Score Is Calculated</Reveal>
      <Reveal as="p" className="sub">
        Each area is scored 0–100%, multiplied by its weight, then added into one overall score.
      </Reveal>
      <div className="score-grid">
        {SCORE_PARTS.map((p, i) => (
          <Reveal key={p.key} className={`score-card tone-${p.color}`} delay={i * 100}>
            <div className="score-head">
              <span className="score-icon">{p.icon}</span>
              <span className="score-weight">{WEIGHTS[p.key]}%</span>
            </div>
            <h3>{p.title}</h3>
            <p className="what">{p.what}</p>
            <p className="how">{p.how}</p>
          </Reveal>
        ))}
      </div>
      <Reveal className="formula">
        <b>Final score</b> = 0.40 × Skills + 0.20 × Projects + 0.20 × Experience + 0.15 × Traits + 0.05 × Education
        <small>Example: 80, 60, 70, 50, 100 → <b>70.5%</b> (Good match). 75+ Excellent · 55–74 Good · 35–54 Partial · below 35 Low.</small>
      </Reveal>

      <Reveal as="h2" className="more-h">More Than a Score</Reveal>
      <Reveal as="p" className="sub">Explore the roles, numbers and trends around your career. Previews below use sample data.</Reveal>
      <div className="grid3">
        <Reveal className="feat tone-blue">
          <div className="feat-top"><span className="score-icon">🎯</span><span className="tag">Preview</span></div>
          <h3>Similar Job Recommendations</h3>
          <p>Get roles close to the one you scanned, ranked by how well your skills fit.</p>
          <ul className="mini-list">
            {SIMILAR_JOBS.map(([n, v]) => (
              <li key={n}><span>{n}</span><div className="mini-track"><i style={{ width: `${v}%` }} /></div><b>{v}%</b></li>
            ))}
          </ul>
        </Reveal>
        <Reveal className="feat tone-pink" delay={120}>
          <div className="feat-top"><span className="score-icon">📊</span><span className="tag">Preview</span></div>
          <h3>Analytical Dashboard</h3>
          <p>Track your scores across resumes and see which sections need work.</p>
          <div className="mini-bars">
            {DASHBOARD_BARS.map((h, i) => <i key={i} style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }} />)}
          </div>
        </Reveal>
        <Reveal className="feat tone-purple" delay={240}>
          <div className="feat-top"><span className="score-icon">📈</span><span className="tag">Preview</span></div>
          <h3>Market Trends</h3>
          <p>See which skills are rising in demand so you can learn what employers want next.</p>
          <svg viewBox="0 0 200 70" className="spark">
            <polyline points="0,60 30,52 60,55 90,35 120,38 150,20 200,8" />
            <circle cx="200" cy="8" r="4" />
          </svg>
          <div className="trend-tags"><span>▲ Cloud</span><span>▲ AI / ML</span><span>▲ DevOps</span></div>
        </Reveal>
      </div>
    </section>
  );
}
