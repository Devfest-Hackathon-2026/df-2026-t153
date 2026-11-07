"use client";

import { useEffect, useRef, useState } from "react";
import BoxOverlay from "@/components/BoxOverlay";
import HeroCrop from "@/components/HeroCrop";
import Lineup from "@/components/Lineup";
import Narration from "@/components/Narration";
import PhotoInput from "@/components/PhotoInput";
import Sources from "@/components/Sources";
import Takeaway from "@/components/Takeaway";
import { analyze, ApiError, type AnalyzeResponse } from "@/lib/api";
import {
  narrate,
  type NarrateDone,
  type NarrateMeta,
  type NarrateSubscription,
} from "@/lib/narrate";

type AnalyzeState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; result: AnalyzeResponse }
  | { phase: "error"; message: string };

type NarrateState =
  | { phase: "idle" }
  | { phase: "streaming"; meta: NarrateMeta | null; text: string }
  | { phase: "done"; meta: NarrateMeta | null; text: string; done: NarrateDone }
  | {
      phase: "error";
      meta: NarrateMeta | null;
      text: string;
      status: number;
      detail: string;
    };

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return `${e.status}: ${e.message}`;
  return e instanceof Error ? e.message : String(e);
}

export default function Home() {
  const [analysis, setAnalysis] = useState<AnalyzeState>({ phase: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [story, setStory] = useState<NarrateState>({ phase: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const subRef = useRef<NarrateSubscription | null>(null);

  useEffect(() => {
    if (analysis.phase !== "loading") return;
    const started = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      250,
    );
    return () => clearInterval(timer);
  }, [analysis.phase]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  // Close the stream when the page unmounts
  useEffect(() => () => subRef.current?.(), []);

  const stopStory = () => {
    subRef.current?.();
    subRef.current = null;
  };

  const startStory = (sessionId: string, pickId: string) => {
    stopStory();
    setStory({ phase: "streaming", meta: null, text: "" });
    subRef.current = narrate(sessionId, pickId, {
      onMeta: (meta) => setStory({ phase: "streaming", meta, text: "" }),
      onDelta: (chunk) =>
        setStory((s) =>
          s.phase === "streaming" ? { ...s, text: s.text + chunk } : s,
        ),
      onDone: (done) =>
        setStory((s) =>
          s.phase === "streaming"
            ? { phase: "done", meta: s.meta, text: s.text, done }
            : s,
        ),
      onError: (err) =>
        setStory((s) =>
          s.phase === "streaming"
            ? {
                phase: "error",
                meta: s.meta,
                text: s.text,
                status: err.status,
                detail: err.detail,
              }
            : s,
        ),
    });
  };

  const handleSelectPhoto = async (file: File) => {
    abortRef.current?.abort();
    stopStory();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPreview(URL.createObjectURL(file));
    setSelectedId(null);
    setStory({ phase: "idle" });
    setElapsed(0);
    setAnalysis({ phase: "loading" });
    try {
      setAnalysis({ phase: "done", result: await analyze(file, ctrl.signal) });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setAnalysis({ phase: "error", message: errorMessage(e) });
    }
  };

  const result = analysis.phase === "done" ? analysis.result : null;

  // Tapping another candidate closes the current stream and starts a new one
  const handlePick = (id: string) => {
    if (!result) return;
    setSelectedId(id);
    startStory(result.session_id, id);
  };

  const lineupItems = result
    ? result.lineup.flatMap((id) => result.objects.filter((o) => o.id === id))
    : [];
  const hero = story.phase !== "idle" ? story.meta : null;

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-6">
      <h1 className="text-xl font-bold">SanpoLab</h1>
      <PhotoInput
        disabled={analysis.phase === "loading"}
        onSelect={handleSelectPhoto}
      />

      {analysis.phase === "loading" && (
        <p className="text-center text-gray-700" aria-live="polite">
          検出中… {elapsed}秒
        </p>
      )}
      {analysis.phase === "error" && (
        <p
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          うまく読み取れませんでした（{analysis.message}）
        </p>
      )}

      {preview && hero && (
        <HeroCrop src={preview} box={hero.box} name={hero.name} />
      )}

      {preview &&
        (result ? (
          <BoxOverlay
            src={preview}
            objects={result.objects}
            lineup={result.lineup}
            selectedId={selectedId}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- blob: URL preview before results arrive
          <img
            src={preview}
            alt="送った写真"
            className="block h-auto w-full rounded-lg opacity-60"
          />
        ))}

      {result && (
        <section className="space-y-2">
          <p className="text-sm text-gray-600">{result.scene}</p>
          <h2 className="font-bold">今日の主役の候補</h2>
          <Lineup
            items={lineupItems}
            selectedId={selectedId}
            onSelect={handlePick}
          />
        </section>
      )}

      {story.phase !== "idle" && (
        <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
          <h2 className="font-bold">
            {hero ? `この${hero.name}、実は…` : "語りを準備中…"}
          </h2>
          <Narration
            text={story.text}
            streaming={story.phase === "streaming"}
          />
          {story.phase === "done" && (
            <>
              <Takeaway text={story.done.takeaway} />
              <Sources sources={story.done.sources} />
            </>
          )}
          {story.phase === "error" && (
            <div className="space-y-2" role="alert">
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                語りを取得できませんでした（{story.status || "通信"}:{" "}
                {story.detail}）
              </p>
              {result && selectedId && (
                <button
                  type="button"
                  onClick={() => startStory(result.session_id, selectedId)}
                  className="rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white active:bg-emerald-800"
                >
                  もう一度
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
