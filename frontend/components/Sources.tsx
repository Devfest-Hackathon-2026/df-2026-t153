type Source = { title: string; uri: string };

type Props = {
  sources: Source[];
};

export default function Sources({ sources }: Props) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        出典なし（検索で裏取りできなかった話です）
      </p>
    );
  }
  return (
    <section>
      <h3 className="mb-1 text-sm font-bold text-gray-700">出典</h3>
      <ul className="space-y-1 text-sm">
        {sources.map((s) => (
          <li key={s.uri} className="truncate">
            <a
              href={s.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline"
            >
              {s.title || s.uri}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
