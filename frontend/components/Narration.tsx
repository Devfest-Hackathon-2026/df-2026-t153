"use client";

import { useEffect, useRef } from "react";

type Props = {
  text: string;
  streaming: boolean;
};

export default function Narration({ text, streaming }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Follow the text as it grows; stop once done so the reader can scroll freely
    if (streaming) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [text, streaming]);

  return (
    <div className="space-y-2" aria-live="polite">
      <p className="whitespace-pre-wrap leading-relaxed">
        {text}
        {streaming && (
          <span className="ml-0.5 inline-block w-2 animate-pulse bg-gray-400">
            &nbsp;
          </span>
        )}
      </p>
      <div ref={endRef} />
    </div>
  );
}
