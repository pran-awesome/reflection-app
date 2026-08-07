export default function FloatingAnswers({ items, remove, variant = 'tv' }) {
  return (
    <div className={`floating-layer floating-layer--${variant}`} aria-hidden="true">
      {items.map((item) => (
        <div
          key={item.id}
          className="floating-answer"
          style={{
            left: `${item.left}%`,
            '--drift-x': `${item.driftX}px`,
            animationDuration: `${item.duration}s`,
            animationDelay: `${item.delay}s`,
            willChange: 'transform, opacity',
          }}
          onAnimationEnd={() => remove(item.id)}
        >
          <p className="answer-text">{item.text}</p>
          <p className="answer-name">{item.name}</p>
        </div>
      ))}
    </div>
  );
}
