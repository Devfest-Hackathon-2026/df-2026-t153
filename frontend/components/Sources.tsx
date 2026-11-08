type Source = { title: string; uri: string };

// Grounding URIs come from the model's tool output; never turn anything but http(s) into a link
function isHttpUrl(uri: string): boolean {
  try {
    const u = new URL(uri);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

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
            {isHttpUrl(s.uri) ? (
              <a
                href={s.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline"
              >
                {s.title || s.uri}
              </a>
            ) : (
              <span>{s.title || s.uri}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
