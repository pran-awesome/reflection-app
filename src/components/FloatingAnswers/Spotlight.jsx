import { formatAnswerDisplay } from '../../lib/answers';

export default function Spotlight({ answers, field, page }) {
  const spotlighted = answers.filter((a) => a[field]);
  if (spotlighted.length === 0) return null;

  return (
    <div className="spotlight-layer spotlight-layer--inline">
      {spotlighted.map((a) => (
        <div key={a.id} className="spotlight-card">
          <p className="answer-text">{formatAnswerDisplay(a)}</p>
          <p className="answer-name">— {a.name}</p>
        </div>
      ))}
    </div>
  );
}
