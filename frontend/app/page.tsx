"use client";

import { useEffect, useRef, useState } from "react";
import BoxOverlay, {
  PHOTO_CLASS,
  revealDuration,
} from "@/components/BoxOverlay";
import HeroCrop from "@/components/HeroCrop";
import HintCard from "@/components/HintCard";
import Lineup from "@/components/Lineup";
import Narration from "@/components/Narration";
import PhotoInput from "@/components/PhotoInput";
import ScanOverlay from "@/components/ScanOverlay";
import Sources from "@/components/Sources";
import Takeaway from "@/components/Takeaway";
import { analyze, ApiError, type AnalyzeResponse } from "@/lib/api";
import { pickHint } from "@/lib/hints";
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

const card = "rounded-2xl border border-line bg-card p-4 shadow-card";

// Stage 1 -> 2 switch while waiting for analyze (seconds). Matches the real order
// of work on the server: read the image, then list what is in it, then pick.
const COUNTING_AFTER_S = 3;
// Honest wait messages once the usual 10-20s has clearly passed
const SLOW_AFTER_S = 25;
const STUCK_AFTER_S = 60;
const STAGE_MESSAGES = {
  1: "写真を読んでいます",
  2: "写っている物を数えています",
  3: "主役を選んでいます",
} as const;

function stageMessage(stage: 1 | 2 | 3, elapsed: number): string {
  if (stage !== 2) return STAGE_MESSAGES[stage];
  if (elapsed >= STUCK_AFTER_S)
    return "時間がかかっています。電波の良い所でもう一度お試しください";
  if (elapsed >= SLOW_AFTER_S) return "もう少しかかっています";
  return STAGE_MESSAGES[2];
}

export default function Home() {
  const [analysis, setAnalysis] = useState<AnalyzeState>({ phase: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [story, setStory] = useState<NarrateState>({ phase: "idle" });
  const [photoOpen, setPhotoOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const subRef = useRef<NarrateSubscription | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (analysis.phase !== "loading") return;
    const started = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      250,
    );
    return () => clearInterval(timer);
  }, [analysis.phase]);

  // Hold the candidates back until the boxes have finished locking on
  useEffect(() => {
    if (!revealing || analysis.phase !== "done") return;
    // With reduced motion the boxes appear at once, so there is nothing to wait for
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = setTimeout(
      () => setRevealing(false),
      reduced ? 0 : revealDuration(analysis.result.objects.length),
    );
    return () => clearTimeout(timer);
  }, [revealing, analysis]);

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
    setPhotoOpen(false);
    setHint((h) => pickHint(h));
    setElapsed(0);
    setAnalysis({ phase: "loading" });
    try {
      const result = await analyze(file, ctrl.signal);
      setRevealing(true);
      setAnalysis({ phase: "done", result });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setAnalysis({ phase: "error", message: errorMessage(e) });
    }
  };

  // Give up on a stuck analyze: the request is aborted and the page returns to the picker
  const handleCancel = () => {
    abortRef.current?.abort();
    setAnalysis({ phase: "idle" });
    setPreview(null);
  };

  const result = analysis.phase === "done" ? analysis.result : null;

  // Tapping a candidate (card or chip) closes the current stream and starts a new one
  const handlePick = (id: string) => {
    if (!result) return;
    setSelectedId(id);
    startStory(result.session_id, id);
  };

  // Once a story starts, bring the hero crop to the top of the viewport
  const storyView = story.phase !== "idle";
  useEffect(() => {
    if (storyView)
      heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [storyView, selectedId]);

  const lineupItems = result
    ? result.lineup.flatMap((id) => result.objects.filter((o) => o.id === id))
    : [];
  const hero = storyView ? story.meta : null;
  const others = result
    ? result.objects.filter((o) => !result.lineup.includes(o.id))
    : [];

  const waiting = analysis.phase === "loading";
  const stage: 1 | 2 | 3 | null = waiting
    ? elapsed < COUNTING_AFTER_S
      ? 1
      : 2
    : revealing
      ? 3
      : null;

  const header = (
    <header className="flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SanpoLab</h1>
        <p className="text-sm text-ink-muted">
          見慣れた物の「実は…」を、散歩の写真から
        </p>
      </div>
      {preview && (
        <PhotoInput
          compact
          disabled={analysis.phase === "loading"}
          onSelect={handleSelectPhoto}
        />
      )}
    </header>
  );

  const originalPhoto = preview && result && (
    <BoxOverlay
      src={preview}
      objects={result.objects}
      lineup={result.lineup}
      selectedId={selectedId}
    />
  );

  // ---- Story view: hero -> narration -> takeaway -> chips -> collapsed photo ----
  if (storyView && result && preview) {
    return (
      <main className="mx-auto max-w-md space-y-4 px-4 py-6">
        {header}
        <div ref={heroRef} className="scroll-mt-4" data-section="hero">
          {hero ? (
            <HeroCrop src={preview} box={hero.box} name={hero.name} />
          ) : (
            <div
              className="h-48 animate-pulse rounded-2xl bg-line"
              aria-hidden
            />
          )}
        </div>

        <section className={`${card} space-y-4`} data-section="story">
          <h2 className="text-lg font-bold">
            {hero ? `この${hero.name}、実は…` : "語りを準備中…"}
          </h2>
          <Narration
            text={story.text}
            streaming={story.phase === "streaming"}
          />
          {story.phase === "done" && (
            <>
              <div data-section="takeaway">
                <Takeaway text={story.done.takeaway} />
              </div>
              <Sources sources={story.done.sources} />
            </>
          )}
          {story.phase === "error" && (
            <div className="space-y-2" role="alert">
              <p className="rounded-xl bg-mark-soft px-3 py-2 text-sm text-mark">
                語りを取得できませんでした（{story.status || "通信"}:{" "}
                {story.detail}）
              </p>
              {selectedId && (
                <button
                  type="button"
                  onClick={() => startStory(result.session_id, selectedId)}
                  className="rounded-full bg-moss px-5 py-2 font-bold text-white active:bg-moss-deep"
                >
                  もう一度
                </button>
              )}
            </div>
          )}
        </section>

        <section className="space-y-2" data-section="lineup">
          <h2 className="text-xs font-bold tracking-wide text-ink-muted">
            ほかの主役候補（タップで語り直し）
          </h2>
          <Lineup
            variant="chips"
            items={lineupItems}
            selectedId={selectedId}
            onSelect={handlePick}
          />
        </section>

        <section className={`${card} p-0`} data-section="photo">
          <button
            type="button"
            aria-expanded={photoOpen}
            onClick={() => setPhotoOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold"
          >
            元の写真と見つけた物
            <span aria-hidden className="text-ink-muted">
              {photoOpen ? "▲" : "▼"}
            </span>
          </button>
          {photoOpen && (
            <div className="space-y-3 px-4 pb-4">
              {originalPhoto}
              <p className="text-sm text-ink-muted">{result.scene}</p>
              {others.length > 0 && (
                <ul
                  className="flex flex-wrap gap-1.5"
                  aria-label="候補に入らなかった物"
                >
                  {others.map((o) => (
                    <li
                      key={o.id}
                      className="rounded-full bg-paper px-2.5 py-0.5 text-xs text-ink-muted"
                    >
                      {o.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </main>
    );
  }

  // ---- Pick view: input -> photo with boxes -> candidate cards ----
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-6">
      {header}
      {!preview && <PhotoInput onSelect={handleSelectPhoto} />}

      {stage && (
        <p
          className="flex items-center justify-center gap-2 text-sm text-ink-muted"
          aria-live="polite"
          data-stage={stage}
        >
          <span
            className="breathe inline-block h-2 w-2 rounded-full bg-moss"
            aria-hidden
          />
          {stageMessage(stage, elapsed)}
        </p>
      )}
      {waiting && elapsed >= STUCK_AFTER_S && (
        <div className="enter text-center">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-full border border-line bg-card px-5 py-2 text-sm font-bold text-ink active:bg-mark-soft"
          >
            中断する
          </button>
        </div>
      )}
      {analysis.phase === "error" && (
        <p
          className="rounded-xl bg-mark-soft px-3 py-2 text-sm text-mark"
          role="alert"
        >
          うまく読み取れませんでした（{analysis.message}）
        </p>
      )}

      {preview && (
        <div
          className="relative mx-auto w-fit overflow-hidden rounded-2xl shadow-card"
          data-section="photo"
        >
          {result ? (
            <BoxOverlay
              key={result.session_id}
              src={preview}
              objects={result.objects}
              lineup={result.lineup}
              selectedId={selectedId}
              reveal
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- blob: URL preview before results arrive
            <img src={preview} alt="送った写真" className={PHOTO_CLASS} />
          )}
          {(stage === 1 || stage === 2) && <ScanOverlay stage={stage} />}
        </div>
      )}

      {hint && (waiting || revealing) && <HintCard text={hint} />}

      {result && !revealing && (
        <section className="enter space-y-2" data-section="lineup">
          <p className="text-sm text-ink-muted">{result.scene}</p>
          <h2 className="text-lg font-bold">今日の主役の候補</h2>
          <p className="text-xs text-ink-muted">
            タップすると、その物の「実は…」が始まります
          </p>
          <Lineup
            items={lineupItems}
            selectedId={selectedId}
            onSelect={handlePick}
          />
        </section>
      )}
    </main>
  );
}
