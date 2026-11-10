import { VOICE_CLASS } from "./Narration";

type Props = { text: string; onNext: () => void };

// A piece of trivia set like a margin note: no box, no heading, just a dash.
// Tapping it swaps in another one, so the wait is never one fixed sentence.
export default function HintCard({ text, onNext }: Props) {
  return (
    <aside data-section="hint">
      <button
        type="button"
        onClick={onNext}
        className="block w-full text-left active:opacity-60"
        aria-label="別の雑学を見る"
      >
        {/* key restarts the enter animation on every swap */}
        <p key={text} className={`enter ${VOICE_CLASS} text-ink-muted`}>
          <span aria-hidden>— </span>
          {text}
        </p>
        <span
          className="font-display mt-3 block text-xs tracking-[0.12em] text-ink-muted/70"
          aria-hidden
        >
          タップでほかの雑学
        </span>
      </button>
    </aside>
  );
}
