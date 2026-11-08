import { VOICE_CLASS } from "./Narration";

type Props = { text: string };

// A piece of trivia set like a margin note: no box, no heading, just a dash
export default function HintCard({ text }: Props) {
  return (
    <aside className="enter" data-section="hint">
      <p className={`${VOICE_CLASS} text-ink-muted`}>
        <span aria-hidden>— </span>
        {text}
      </p>
    </aside>
  );
}
