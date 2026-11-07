type Source = { title: string; uri: string };

type Props = {
  sources: Source[];
};

export default function Sources({ sources }: Props) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-gray-500" data-testid="sources">
        一般的な知識から語っています。固有の由来や歴史は述べていません。
      </p>
    );
  }
  return (
    <section data-testid="sources">
      <h3 className="mb-1 text-sm font-bold text-gray-700">
        Google 検索で確認した出典
      </h3>
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
