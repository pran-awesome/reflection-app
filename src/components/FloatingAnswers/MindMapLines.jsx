/**
 * SVG connectors from the center question hub to each floating answer.
 * Item positions use left/bottom/% like FloatingAnswers.
 */
export default function MindMapLines({ items, hub = { x: 50, y: 48 } }) {
  if (!items?.length) return null;

  return (
    <svg
      className="mindmap-lines"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {items.map((item) => {
        const w = item.width ?? 16;
        const h = item.height ?? 12;
        const targetX = item.left + w / 2;
        // convert bottom-based % to top-based for SVG y
        const targetY = 100 - (item.bottom + h / 2);

        const dx = targetX - hub.x;
        const dy = targetY - hub.y;
        // Control point bends outward for a mind-map branch look
        const cx = hub.x + dx * 0.45;
        const cy = hub.y + dy * 0.15;

        return (
          <path
            key={item.id}
            className="mindmap-line"
            d={`M ${hub.x} ${hub.y} Q ${cx} ${cy} ${targetX} ${targetY}`}
            fill="none"
          />
        );
      })}
      <circle className="mindmap-hub-dot" cx={hub.x} cy={hub.y} r="0.7" />
    </svg>
  );
}
