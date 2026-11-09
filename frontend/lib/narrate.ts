import { apiBase } from "./env";

// The SSE route has no response_model, so these shapes are not in api.gen.ts.
// They mirror docs/api.md "/api/narrate の中身"; keep them in sync by hand.
export type NarrateMeta = {
  pick_id: string;
  name: string;
  box: number[];
  /** Place name resolved from the photo's location; absent until the server sends it */
  place?: string | null;
};
export type NarrateSource = { title: string; uri: string };
export type NarrateDone = {
  sources: NarrateSource[];
  search_entry_html: string | null;
};
export type NarrateError = { status: number; detail: string };

export type NarrateHandlers = {
  onMeta: (meta: NarrateMeta) => void;
  onDelta: (text: string) => void;
  onDone: (done: NarrateDone) => void;
  onError: (err: NarrateError) => void;
};

/** Returns a function that closes the subscription. */
export type NarrateSubscription = () => void;

export type NarrateFn = (
  sessionId: string,
  pickId: string,
  handlers: NarrateHandlers,
) => NarrateSubscription;

const subscribeReal: NarrateFn = (sessionId, pickId, h) => {
  const url = new URL(`${apiBase()}/api/narrate`);
  url.searchParams.set("session_id", sessionId);
  url.searchParams.set("pick_id", pickId);
  const es = new EventSource(url);
  let finished = false;
  const finish = () => {
    finished = true;
    es.close();
  };

  es.addEventListener("meta", (e) =>
    h.onMeta(JSON.parse(e.data) as NarrateMeta),
  );
  es.addEventListener("delta", (e) => h.onDelta(JSON.parse(e.data) as string));
  es.addEventListener("done", (e) => {
    finish();
    h.onDone(JSON.parse(e.data) as NarrateDone);
  });
  es.addEventListener("error", (e) => {
    // The server sends failures as a named `error` event with JSON data; a bare
    // connection drop fires the same event name with no data
    finish();
    const data = (e as MessageEvent).data as string | undefined;
    h.onError(
      data
        ? (JSON.parse(data) as NarrateError)
        : { status: 0, detail: "接続が切れました" },
    );
  });
  // EventSource auto-reconnects after the stream ends; we want exactly one story per pick
  es.onerror = () => {
    if (!finished) {
      finish();
      h.onError({ status: 0, detail: "接続が切れました" });
    }
  };
  return finish;
};

export const narrate: NarrateFn = (sessionId, pickId, h) => {
  // Literal env check lets Next inline it and drop the mock module from production builds
  if (process.env.NEXT_PUBLIC_MOCK_NARRATE === "1") {
    let cancel: NarrateSubscription = () => {};
    let cancelled = false;
    void import("./mockNarrate").then((m) => {
      if (!cancelled) cancel = m.mockNarrate(sessionId, pickId, h);
    });
    return () => {
      cancelled = true;
      cancel();
    };
  }
  return subscribeReal(sessionId, pickId, h);
};
