type Props = { stage: 1 | 2 };

// Fixed "search points" in percent of the photo; lit one after another by animation-delay
const DOTS: ReadonlyArray<readonly [number, number]> = [
  [18, 22],
  [64, 15],
  [41, 48],
  [78, 61],
  [24, 74],
  [57, 86],
];

export default function ScanOverlay({ stage }: Props) {
  return (
    <div
      className="decor pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
      data-stage={stage}
    >
      <div className="absolute inset-0 bg-ink/35" />
      {stage === 1 ? (
        <div className="scanline absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-white/40 to-transparent" />
      ) : (
        <>
          <div className="scan-grid absolute inset-0" />
          {DOTS.map(([x, y], i) => (
            <span
              key={i}
              className="scan-dot absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-mark"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
