// "持ち帰った視点" history, kept only on this device.
export type SavedTakeaway = { text: string; object_name: string; at: string };

export const TAKEAWAYS_KEY = "sanpolab.takeaways";
export const TAKEAWAYS_MAX = 10;
const CHANGE_EVENT = "sanpolab:takeaways";
const EMPTY: SavedTakeaway[] = [];

function isSaved(v: unknown): v is SavedTakeaway {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as SavedTakeaway).text === "string" &&
    typeof (v as SavedTakeaway).object_name === "string" &&
    typeof (v as SavedTakeaway).at === "string"
  );
}

function parse(raw: string | null): SavedTakeaway[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSaved) : EMPTY;
  } catch {
    return EMPTY;
  }
}

// localStorage can be missing, blocked or full (private mode, quota); none of that may break the page
function readRaw(): string | null {
  try {
    return window.localStorage.getItem(TAKEAWAYS_KEY);
  } catch {
    return null;
  }
}

export function loadTakeaways(): SavedTakeaway[] {
  return parse(readRaw());
}

export function saveTakeaway(entry: Omit<SavedTakeaway, "at">): void {
  try {
    const next = [
      { ...entry, at: new Date().toISOString() },
      ...loadTakeaways().filter((t) => t.text !== entry.text),
    ].slice(0, TAKEAWAYS_MAX);
    window.localStorage.setItem(TAKEAWAYS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Nothing to do: the story was still shown, only the memo is lost
  }
}

// ---- useSyncExternalStore plumbing: the snapshot is cached per raw string so
// the reference stays stable between renders, and the server snapshot is empty
// so prerendered HTML and the first client render agree.
let cachedRaw: string | null | undefined;
let cachedList: SavedTakeaway[] = EMPTY;

export function getTakeawaysSnapshot(): SavedTakeaway[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parse(raw);
  }
  return cachedList;
}

export function getTakeawaysServerSnapshot(): SavedTakeaway[] {
  return EMPTY;
}

export function subscribeTakeaways(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
