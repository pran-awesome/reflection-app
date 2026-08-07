export default function Spotlight({ answers, field }) {
  const spotlighted = answers.filter((a) => a[field]);
  if (spotlighted.length === 0) return null;

  return (
    <div className="spotlight-layer">
      {spotlighted.map((a) => (
        <div key={a.id} className="spotlight-card">
          <p className="answer-text">{a.text}</p>
          <p className="answer-name">— {a.name}</p>
        </div>
      ))}
    </div>
  );
}
