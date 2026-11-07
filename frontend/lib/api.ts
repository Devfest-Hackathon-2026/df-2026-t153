import type { components, paths } from "./api.gen";
import { apiBase } from "./env";

export type AnalyzeResponse =
  paths["/api/analyze"]["post"]["responses"]["200"]["content"]["application/json"];
export type InventoryObject = components["schemas"]["InventoryObject"];

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function errorDetail(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "detail" in body) {
      const { detail } = body;
      return typeof detail === "string" ? detail : JSON.stringify(detail);
    }
  } catch {
    // Non-JSON error bodies (proxy pages etc.) fall through to the status text
  }
  return res.statusText;
}

export async function analyze(
  image: File,
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  const body = new FormData();
  body.append("image", image);
  const res = await fetch(`${apiBase()}/api/analyze`, {
    method: "POST",
    body,
    signal,
  });
  if (!res.ok) {
    throw new ApiError(res.status, await errorDetail(res));
  }
  return (await res.json()) as AnalyzeResponse;
}
