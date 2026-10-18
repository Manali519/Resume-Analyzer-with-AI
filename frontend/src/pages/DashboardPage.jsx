import { Link } from "react-router-dom";
import AreaBreakdown from "../components/dashboard/AreaBreakdown.jsx";
import NextSteps from "../components/dashboard/NextSteps.jsx";
import ScoreTrend from "../components/dashboard/ScoreTrend.jsx";
import SkillGaps from "../components/dashboard/SkillGaps.jsx";
import StatTiles from "../components/dashboard/StatTiles.jsx";
import Summary from "../components/dashboard/Summary.jsx";
import { useAnalyses } from "../hooks/useAnalyses.js";
import { AREAS } from "../lib/weights.js";

const mean = (values) => Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);

function summarize(scans) {
  const averages = Object.fromEntries(AREAS.map(({ key }) => [key, mean(scans.map((s) => s.parts[key]))]));
  const ranked = Object.entries(averages).sort((a, b) => b[1] - a[1]);

  const missing = {};
  scans.forEach((s) => s.missing.forEach((m) => (missing[m] = (missing[m] || 0) + 1)));

  return {
    count: scans.length,
    average: mean(scans.map((s) => s.total)),
    best: Math.max(...scans.map((s) => s.total)),
    averages,
    strongest: ranked[0][0],
    weakest: ranked.at(-1)[0],
    gaps: Object.entries(missing).sort((a, b) => b[1] - a[1]).slice(0, 8),
  };
}

export default function DashboardPage() {
  const { analyses, loading } = useAnalyses();

  if (loading) return <p className="auth-sub">Loading…</p>;

  if (!analyses.length) {
    return (
      <div className="card panel empty">
        <h3>Your dashboard is empty</h3>
        <p className="panel-help">Scan a resume against a job description and your progress will show up here.</p>
        <Link to="/scan" className="btn btn-primary">Scan my resume</Link>
      </div>
    );
  }

  const stats = summarize(analyses);
  const oldestFirst = analyses.slice(0, 10).reverse();

  return (
    <div className="analytics">
      <div className="page-head">
        <h2>Your progress</h2>
        <p>A plain summary of every resume you have scanned.</p>
      </div>
      <Summary stats={stats} />
      <StatTiles stats={stats} />
      <AreaBreakdown averages={stats.averages} />
      <ScoreTrend scans={oldestFirst} />
      <SkillGaps gaps={stats.gaps} />
      <NextSteps scan={analyses[0]} />
    </div>
  );
}
