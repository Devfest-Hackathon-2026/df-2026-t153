import { VOICE_CLASS } from "./Narration";

type Props = {
  text: string;
};

// The one place moss survives: a single rule marking what to carry to the next walk
export default function Takeaway({ text }: Props) {
  return (
    <aside className="border-l-2 border-moss pl-4">
      <h3 className="text-xs font-bold tracking-wide text-ink-muted">
        持ち帰る視点
      </h3>
      <p className={`${VOICE_CLASS} mt-1`}>{text}</p>
    </aside>
  );
}
