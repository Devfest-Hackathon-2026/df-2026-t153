"use client";

import { useEffect, useRef } from "react";

type Props = {
  text: string;
  streaming: boolean;
};

// The narration is the only thing on the page set in serif: it is someone talking,
// not the interface reporting.
export const VOICE_CLASS = "font-serif text-[18px] leading-[1.9] text-ink";

export default function Narration({ text, streaming }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Follow the text as it grows; stop once done so the reader can scroll freely
    if (streaming) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [text, streaming]);

  return (
    <div aria-live="polite">
      <p className={`${VOICE_CLASS} whitespace-pre-wrap`}>
        {text}
        {streaming && (
          <span className="ml-0.5 inline-block w-2 animate-pulse bg-ink/70">
            &nbsp;
          </span>
        )}
      </p>
      <div ref={endRef} />
    </div>
  );
}
