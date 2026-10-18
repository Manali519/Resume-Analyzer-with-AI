const tiles = (s) => [
  { icon: "📄", value: s.count, label: "Scans done", hint: "Resumes you have checked" },
  { icon: "🎯", value: `${s.average}%`, label: "Average match", hint: "Mean of all your scores" },
  { icon: "🏆", value: `${s.best}%`, label: "Best match", hint: "Your highest single score" },
];

export default function StatTiles({ stats }) {
  return (
    <div className="stats">
      {tiles(stats).map((t) => (
        <div className="card stat" key={t.label}>
          <span className="stat-icon">{t.icon}</span>
          <b>{t.value}</b>
          <span>{t.label}</span>
          <small>{t.hint}</small>
        </div>
      ))}
    </div>
  );
}
