// NEXT_PUBLIC_* is inlined at build time, so each variable must be referenced literally here
const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export function apiBase(): string {
  if (!API_BASE) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE が未設定です（.env.local.example を参照）",
    );
  }
  return API_BASE.replace(/\/$/, "");
}
