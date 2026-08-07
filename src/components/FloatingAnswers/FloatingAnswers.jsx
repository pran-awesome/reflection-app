export default function FloatingAnswers({ items, variant = 'tv' }) {
  if (variant === 'grid') {
    return (
      <div className="answer-live-grid" aria-live="polite">
        {items.map((item) => (
          <article
            key={item.id}
            className="answer-live-card floating-answer--stay"
            style={{ animationDuration: `${item.duration || 0.4}s` }}
          >
            <p className="answer-text">{item.text}</p>
            <p className="answer-name">{item.name}</p>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className={`floating-layer floating-layer--${variant}`} aria-hidden="true">
      {items.map((item) => (
        <div
          key={item.id}
          className="floating-answer floating-answer--stay"
          style={{
            left: `${item.left}%`,
            bottom: `${item.bottom}%`,
            width: item.width ? `${item.width}%` : undefined,
            maxWidth: item.width ? `${item.width}%` : undefined,
            animationDuration: `${item.duration || 0.5}s`,
          }}
        >
          <p className="answer-text">{item.text}</p>
          <p className="answer-name">{item.name}</p>
        </div>
      ))}
    </div>
  );
}
