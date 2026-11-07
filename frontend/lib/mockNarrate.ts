import type { NarrateFn } from "./narrate";

// Only loaded when NEXT_PUBLIC_MOCK_NARRATE=1; mirrors the event order in docs/api.md
const INTERVAL_MS = 80;

const BODY =
  "この主役、実はただの飾りではありません。" +
  "よく見ると、同じ形が一定の間隔で繰り返されています。" +
  "これは見た目を整えるためというより、雨や風を受け流すための仕組みだと考えられます。" +
  "似た物を街で見かけたら、端の処理がどうなっているかを確かめてみてください。" +
  "そこに作った人の工夫が隠れていることがあります。" +
  "（モックの語りです。本番では Gemini が写真を見て話します。）";

function splitInto(text: string, n: number): string[] {
  const size = Math.ceil(text.length / n);
  return Array.from({ length: n }, (_, i) =>
    text.slice(i * size, (i + 1) * size),
  ).filter(Boolean);
}

export const mockNarrate: NarrateFn = (_sessionId, pickId, h) => {
  const deltas = splitInto(BODY, 20);
  let i = -1;
  const timer = setInterval(() => {
    i += 1;
    if (i === 0) {
      h.onMeta({
        pick_id: pickId,
        name: "モックの主役",
        box: [300, 300, 700, 700],
      });
    } else if (i <= deltas.length) {
      h.onDelta(deltas[i - 1]);
    } else {
      clearInterval(timer);
      h.onDone({
        takeaway:
          "同じ形の繰り返しを見つけたら、端がどう処理されているかを見る。",
        sources: [
          { title: "モック出典 1", uri: "https://example.com/1" },
          { title: "モック出典 2", uri: "https://example.com/2" },
        ],
        search_entry_html: null,
      });
    }
  }, INTERVAL_MS);
  return () => clearInterval(timer);
};
