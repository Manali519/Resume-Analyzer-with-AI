import Reveal from "../../components/Reveal.jsx";

const STEPS = [
  ["📄", "Upload your resume", "Drop in your resume as a PDF or text file, or paste it directly."],
  ["🎯", "Add the job description", "Upload or paste the role you're targeting."],
  ["🧠", "Semantic analysis", "Skills are mapped to concepts, and not only keyword matching."],
  ["📊", "Get your breakdown", "See a weighted score and concrete tips to improve it."],
];

export default function How() {
  return (
    <section id="how" className="section">
      <Reveal as="h2">How It Works</Reveal>
      <Reveal as="p" className="sub">
        Not only keywords — we combine concept matching with text similarity scoring for a more reliable result.
      </Reveal>
      <div className="grid4">
        {STEPS.map(([icon, t, d], i) => (
          <Reveal key={t} className="card step" delay={i * 120}>
            <div className="icon">{icon}</div>
            <b>{i + 1}. {t}</b>
            <p>{d}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
