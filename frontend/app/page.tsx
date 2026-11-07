"use client";

import { useEffect, useRef, useState } from "react";
import BoxOverlay from "@/components/BoxOverlay";
import Lineup from "@/components/Lineup";
import PhotoInput from "@/components/PhotoInput";
import { analyze, ApiError, type AnalyzeResponse } from "@/lib/api";

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; result: AnalyzeResponse }
  | { phase: "error"; message: string };

export default function Home() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (state.phase !== "loading") return;
    const started = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      250,
    );
    return () => clearInterval(timer);
  }, [state.phase]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const handleSelect = async (file: File) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPreview(URL.createObjectURL(file));
    setSelectedId(null);
    setElapsed(0);
    setState({ phase: "loading" });
    try {
      setState({ phase: "done", result: await analyze(file, ctrl.signal) });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const message =
        e instanceof ApiError
          ? `${e.status}: ${e.message}`
          : e instanceof Error
            ? e.message
            : String(e);
      setState({ phase: "error", message });
    }
  };

  const result = state.phase === "done" ? state.result : null;
  const lineupItems = result
    ? result.lineup.flatMap((id) => result.objects.filter((o) => o.id === id))
    : [];

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-6">
      <h1 className="text-xl font-bold">SanpoLab</h1>
      <PhotoInput
        disabled={state.phase === "loading"}
        onSelect={handleSelect}
      />

      {state.phase === "loading" && (
        <p className="text-center text-gray-700" aria-live="polite">
          検出中… {elapsed}秒
        </p>
      )}
      {state.phase === "error" && (
        <p
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          うまく読み取れませんでした（{state.message}）
        </p>
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
            onSelect={setSelectedId}
          />
        </section>
      )}
    </main>
  );
}
