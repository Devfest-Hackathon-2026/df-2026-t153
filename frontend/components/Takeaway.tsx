type Props = {
  text: string;
};

export default function Takeaway({ text }: Props) {
  return (
    <aside className="rounded-lg border-2 border-emerald-700 bg-emerald-50 px-3 py-2">
      <h3 className="text-sm font-bold text-emerald-800">持ち帰る視点</h3>
      <p className="mt-1 leading-relaxed">{text}</p>
    </aside>
  );
}
