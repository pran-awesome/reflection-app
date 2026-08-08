import { formatAnswerDisplay, isSplitAnswer } from '../../lib/answers';
import AnswerText from './AnswerText';

export default function Spotlight({ answers, field, expandable = false }) {
  const spotlighted = answers.filter((a) => a[field]);
  if (spotlighted.length === 0) return null;

  return (
    <div className="spotlight-layer spotlight-layer--inline">
      {spotlighted.map((a) => (
        <div key={a.id} className="spotlight-card">
          {isSplitAnswer(a) ? (
            <AnswerText
              textA={a.textA}
              textB={a.textB}
              expandable={expandable}
              limit={expandable ? 120 : 100}
            />
          ) : (
            <AnswerText
              text={formatAnswerDisplay(a)}
              expandable={expandable}
              limit={expandable ? 120 : 100}
            />
          )}
          <p className="answer-name">— {a.name}</p>
        </div>
      ))}
    </div>
  );
}
