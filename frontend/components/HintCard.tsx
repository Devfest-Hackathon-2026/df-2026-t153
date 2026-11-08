type Props = { text: string };

export default function HintCard({ text }: Props) {
  return (
    <aside
      className="enter rounded-2xl border border-line bg-card p-4 shadow-card"
      data-section="hint"
    >
      <p className="text-xs font-bold tracking-wide text-moss">
        待っている間に、ひとつ雑学を
      </p>
      <p className="mt-1 text-sm leading-relaxed">{text}</p>
    </aside>
  );
}
