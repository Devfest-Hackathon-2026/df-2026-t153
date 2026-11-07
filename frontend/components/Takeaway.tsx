type Props = {
  text: string;
};

export default function Takeaway({ text }: Props) {
  return (
    <aside className="rounded-xl border-l-4 border-moss bg-moss-soft px-4 py-3">
      <h3 className="text-xs font-bold tracking-wide text-moss-deep">
        持ち帰る視点
      </h3>
      <p className="mt-1 leading-relaxed text-ink">{text}</p>
    </aside>
  );
}
