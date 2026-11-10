"use client";

import { useEffect, useRef, useState } from "react";
import BoxOverlay, {
  PHOTO_CLASS,
  revealDuration,
} from "@/components/BoxOverlay";
import ErrorNotice from "@/components/ErrorNotice";
import HeroCrop from "@/components/HeroCrop";
import HintCard from "@/components/HintCard";
import Lineup from "@/components/Lineup";
import Narration from "@/components/Narration";
import PhotoInput from "@/components/PhotoInput";
import ScanOverlay from "@/components/ScanOverlay";
import SearchSuggestions from "@/components/SearchSuggestions";
import Sources from "@/components/Sources";
import { analyze, type AnalyzeResponse } from "@/lib/api";
import { kanjiDate } from "@/lib/date";
import {
  describeError,
  describeStatus,
  type FriendlyError,
} from "@/lib/errors";
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
  | { phase: "error"; error: FriendlyError };

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

// Stage 1 -> 2 switch while waiting for analyze (seconds). Matches the real order
// of work on the server: read the image, then list what is in it, then pick.
const COUNTING_AFTER_S = 3;
// Honest wait messages once the usual 10-20s has clearly passed
const SLOW_AFTER_S = 25;
const STUCK_AFTER_S = 60;
// No narration text for this long -> offer a retry while the stream stays open
const STALL_AFTER_MS = 30_000;
// The first sentence points at the object (D-30) and is set vertically beside the
// name; past this length it is not that sentence, so everything stays in the body
const LEAD_MAX_CHARS = 40;
// Characters that fit one vertical column of the 160px box (a little under the real 9, to be safe)
const LEAD_CHARS_PER_COLUMN = 8;
const STAGE_MESSAGES = {
  1: "写真を読んでいます",
  2: "写っている物を数えています",
  3: "主役を選んでいます",
} as const;

function stageMessage(stage: 1 | 2 | 3, elapsed: number): string {
  if (stage !== 2) return STAGE_MESSAGES[stage];
  if (elapsed >= STUCK_AFTER_S)
    return "かなり時間がかかっています。電波の良い所でもう一度お試しください";
  if (elapsed >= SLOW_AFTER_S) return "時間がかかっています";
  return STAGE_MESSAGES[2];
}

// Split the narration into the pointing first sentence and the rest
function splitLead(text: string): { lead: string; body: string } {
  const end = text.indexOf("。");
  if (end >= 0 && end < LEAD_MAX_CHARS) {
    return {
      lead: text.slice(0, end + 1),
      body: text.slice(end + 1).replace(/^\n+/, ""),
    };
  }
  // Still streaming the first sentence
  if (end < 0 && text.length < LEAD_MAX_CHARS) return { lead: text, body: "" };
  return { lead: "", body: text };
}

const rule = "border-t border-line";
const BUTTON =
  "font-display border border-indigo px-4 py-1.5 text-sm text-indigo active:bg-indigo/10";

export default function Home() {
  const [analysis, setAnalysis] = useState<AnalyzeState>({ phase: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [story, setStory] = useState<NarrateState>({ phase: "idle" });
  const [stalled, setStalled] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const subRef = useRef<NarrateSubscription | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  // Kept for "もう一度" after a failed analyze
  const lastFileRef = useRef<File | null>(null);

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
    setSelectedId(pickId);
    setStalled(false);
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
  // Latest startStory for timers that outlive a render (the autopick below)
  const startStoryRef = useRef(startStory);
  useEffect(() => {
    startStoryRef.current = startStory;
  });

  // The app picks today's hero (D-28): once the boxes have locked on, narrate lineup[0]
  useEffect(() => {
    if (!revealing || analysis.phase !== "done") return;
    const { result } = analysis;
    // With reduced motion the boxes appear at once, so there is nothing to wait for
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = setTimeout(
      () => {
        setRevealing(false);
        if (result.lineup[0])
          startStoryRef.current(result.session_id, result.lineup[0]);
      },
      reduced ? 0 : revealDuration(result.objects.length),
    );
    return () => clearTimeout(timer);
  }, [revealing, analysis]);

  // Stall watchdog: the stream is kept open, the reader just gets a way out
  const streaming = story.phase === "streaming";
  const textLength = story.phase === "idle" ? 0 : story.text.length;
  useEffect(() => {
    if (!streaming) return;
    const timer = setTimeout(() => setStalled(true), STALL_AFTER_MS);
    return () => clearTimeout(timer);
  }, [streaming, textLength]);

  const handleSelectPhoto = async (file: File) => {
    lastFileRef.current = file;
    abortRef.current?.abort();
    stopStory();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPreview(URL.createObjectURL(file));
    setSelectedId(null);
    setStory({ phase: "idle" });
    setStalled(false);
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
      setAnalysis({ phase: "error", error: describeError(e) });
    }
  };

  const handleRetryAnalyze = () => {
    if (lastFileRef.current) void handleSelectPhoto(lastFileRef.current);
  };

  // Give up on a stuck analyze: the request is aborted and the page returns to the picker
  const handleCancel = () => {
    abortRef.current?.abort();
    setAnalysis({ phase: "idle" });
    setPreview(null);
  };

  const result = analysis.phase === "done" ? analysis.result : null;

  // Once a story starts, bring the name and the hero crop to the top of the viewport
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
    <header className="flex items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-xl tracking-[0.12em]">SanpoLab</h1>
        {/* The tagline only introduces; once a photo is in, the photo speaks */}
        {!preview && (
          <p className="mt-1 text-sm text-ink-muted">
            見慣れた物の「実は…」を、散歩の写真から
          </p>
        )}
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

  // ---- Story view: name -> hero -> narration -> sources -> list -> collapsed photo ----
  if (storyView && result && preview) {
    const { lead, body } = splitLead(story.text);
    const dateLine = [kanjiDate(new Date()), hero?.place]
      .filter(Boolean)
      .join("　");
    return (
      <main className="mx-auto max-w-md px-4 py-5">
        {header}
        <div ref={heroRef} className="mt-5 scroll-mt-2" data-section="hero">
          {/* The name stands vertically, with the pointing first sentence beside it
              and the seal in the corner: a page from a walker's notebook (D-39) */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-40 items-start gap-5">
              <h2
                className="vertical font-display w-10 shrink-0 text-[40px] leading-none font-bold tracking-[0.18em]"
                data-testid="hero-name"
              >
                {hero?.name ?? ""}
              </h2>
              <p
                className="vertical font-display h-full shrink-0 text-[15px] leading-[1.9] tracking-[0.1em] text-ink-muted"
                style={{
                  width: `${Math.ceil(lead.length / LEAD_CHARS_PER_COLUMN) * 1.9}em`,
                }}
              >
                {lead}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <span
                className="vertical font-display flex h-11 w-11 -rotate-3 items-center justify-center border-2 border-mark text-[15px] leading-none font-bold text-mark"
                aria-label="今日の主役"
              >
                主役
              </span>
              <span className="font-display text-xs tracking-[0.12em] text-ink-muted">
                {dateLine}
              </span>
            </div>
          </div>
          <div className="mt-5">
            {hero ? (
              <HeroCrop src={preview} box={hero.box} name={hero.name} />
            ) : (
              <div className="-mx-4 h-48 animate-pulse bg-line" aria-hidden />
            )}
          </div>
        </div>

        <section className="mt-6 space-y-5" data-section="story">
          <Narration text={body} streaming={streaming} />
          {streaming && stalled && selectedId && (
            <div
              className="enter flex items-center gap-3 text-sm text-ink-muted"
              data-testid="stalled"
            >
              時間がかかっています
              <button
                type="button"
                onClick={() => startStory(result.session_id, selectedId)}
                className={BUTTON}
              >
                もう一度
              </button>
            </div>
          )}
          {story.phase === "done" && (
            <>
              <Sources sources={story.done.sources} />
              {story.done.search_entry_html && (
                <SearchSuggestions html={story.done.search_entry_html} />
              )}
            </>
          )}
          {story.phase === "error" && (
            <ErrorNotice
              error={describeStatus(story.status, "narrate")}
              onRetry={
                selectedId
                  ? () => startStory(result.session_id, selectedId)
                  : undefined
              }
            />
          )}
        </section>

        {lineupItems.length > 1 && (
          <section className={`${rule} mt-6 pt-4`} data-section="lineup">
            <Lineup
              items={lineupItems}
              selectedId={selectedId}
              onSelect={(id) => startStory(result.session_id, id)}
            />
          </section>
        )}

        <section className={`${rule} mt-6 border-b`} data-section="photo">
          <button
            type="button"
            aria-expanded={photoOpen}
            onClick={() => setPhotoOpen((v) => !v)}
            className="font-display flex w-full items-center justify-between py-3 text-left text-sm tracking-[0.08em]"
          >
            元の写真と見つけた物
            <svg
              viewBox="0 0 16 16"
              className={`h-4 w-4 text-ink-muted transition-transform ${photoOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path d="M3 6l5 5 5-5" />
            </svg>
          </button>
          {photoOpen && (
            <div className="space-y-3 pb-4">
              <BoxOverlay
                src={preview}
                objects={result.objects}
                lineup={result.lineup}
                selectedId={selectedId}
              />
              <p className="text-sm text-ink-muted">{result.scene}</p>
              {others.length > 0 && (
                <ul
                  className="flex flex-wrap gap-x-3 gap-y-1"
                  aria-label="候補に入らなかった物"
                >
                  {others.map((o) => (
                    <li key={o.id} className="text-xs text-ink-muted">
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

  // ---- Intake view: picker, then the photo while it is read and the boxes lock on ----
  return (
    <main className="mx-auto max-w-md px-4 py-5">
      {header}
      {!preview && (
        <div className="mt-8">
          <PhotoInput onSelect={handleSelectPhoto} />
        </div>
      )}

      {stage && (
        <p
          className="mt-5 flex items-center justify-center gap-2 text-sm text-ink-muted"
          aria-live="polite"
          data-stage={stage}
        >
          <span
            className="breathe inline-block h-1.5 w-1.5 rounded-full bg-ink"
            aria-hidden
          />
          {stageMessage(stage, elapsed)}
        </p>
      )}
      {waiting && elapsed >= STUCK_AFTER_S && (
        <div className="enter mt-3 text-center">
          <button type="button" onClick={handleCancel} className={BUTTON}>
            中断する
          </button>
        </div>
      )}
      {analysis.phase === "error" && (
        <div className="mt-5">
          <ErrorNotice
            error={analysis.error}
            onRetry={handleRetryAnalyze}
            retryLabel="同じ写真でもう一度"
          />
        </div>
      )}

      {preview && (
        // Edge to edge on a dark field, like a viewfinder; the photo keeps its own aspect
        <div className="relative -mx-4 mt-4 bg-ink" data-section="photo">
          <div className="relative mx-auto w-fit">
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
          <span className="torn-top" aria-hidden />
          <span className="torn-bottom" aria-hidden />
        </div>
      )}

      {result && !revealing && result.lineup.length === 0 && (
        <section className="mt-5" data-section="lineup">
          <Lineup items={[]} selectedId={null} onSelect={() => {}} />
        </section>
      )}

      {hint &&
        (waiting || revealing || (result && result.lineup.length === 0)) && (
          <div className="mt-6">
            <HintCard text={hint} onNext={() => setHint((h) => pickHint(h))} />
          </div>
        )}
    </main>
  );
}
