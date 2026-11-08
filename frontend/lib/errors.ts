import { ApiError } from "./api";

export type FriendlyError = {
  /** One line: what happened, in the user's words */
  title: string;
  /** One line: what to do next */
  action: string;
  /** Whether "もう一度" can succeed without changing anything */
  retryable: boolean;
};

// Server `detail` strings are for logs, not for the screen: they can carry model
// output, file paths or quota messages. Only the status code reaches the user.
export function describeStatus(
  status: number,
  kind: "analyze" | "narrate" = "analyze",
): FriendlyError {
  // 400/413 describe the uploaded photo; a narrate 400 is a bug, not a photo problem
  if (kind === "narrate" && (status === 400 || status === 413))
    return describeStatus(599, kind);
  switch (status) {
    case 400:
      return {
        title: "この写真は読み取れませんでした",
        action: "JPEG や HEIC などの写真を選んでください",
        retryable: false,
      };
    case 413:
      return {
        title: "写真が大きすぎました",
        action: "別の写真で試してください",
        retryable: false,
      };
    case 404:
      return {
        title: "この写真の情報が見つかりませんでした",
        action: "写真を選び直してください",
        retryable: false,
      };
    case 502:
      return kind === "narrate"
        ? {
            title: "語りをうまく作れませんでした",
            action: "もう一度か、別の主役で試してください",
            retryable: true,
          }
        : {
            title: "写真をうまく解析できませんでした",
            action: "もう一度か、別の写真で試してください",
            retryable: true,
          };
    case 503:
      return {
        title: "いま混み合っています",
        action: "少し待ってからもう一度お試しください",
        retryable: true,
      };
    case 504:
      return {
        title: "時間切れになりました",
        action: "電波の良い所でもう一度お試しください",
        retryable: true,
      };
    case 0:
      return {
        title: "通信できませんでした",
        action: "電波を確認して、もう一度お試しください",
        retryable: true,
      };
    default:
      return {
        title: `うまくいきませんでした（エラー ${status}）`,
        action: "もう一度お試しください",
        retryable: true,
      };
  }
}

export function describeError(e: unknown): FriendlyError {
  if (e instanceof ApiError) return describeStatus(e.status);
  // fetch rejects with TypeError when the network is down or CORS blocks the response
  return describeStatus(0);
}
