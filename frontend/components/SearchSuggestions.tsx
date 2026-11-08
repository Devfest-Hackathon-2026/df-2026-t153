"use client";

import { useState } from "react";

type Props = {
  /** `searchEntryPoint.renderedContent` from the grounded response, unmodified */
  html: string;
};

// Google requires the Search Suggestions to be shown exactly as provided whenever a
// grounded response is visible, at the same width as the response, with taps going
// straight to the results page. The snippet (its own <style> + markup) is rendered in
// a sandboxed iframe so neither side's CSS leaks, and nothing in it can run scripts.
// https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-search-suggestions
export default function SearchSuggestions({ html }: Props) {
  const [height, setHeight] = useState(56);
  // The wrapper only resets the iframe document's margin and sends links to a new tab;
  // the snippet itself is untouched.
  const doc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank" rel="noopener"><style>html,body{margin:0;background:transparent}</style></head><body>${html}</body></html>`;
  return (
    <iframe
      title="Google 検索の候補"
      srcDoc={doc}
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      scrolling="no"
      className="block w-full border-0"
      style={{ height }}
      data-testid="search-suggestions"
      onLoad={(e) => {
        const body = e.currentTarget.contentDocument?.body;
        if (body) setHeight(body.scrollHeight);
      }}
    />
  );
}
