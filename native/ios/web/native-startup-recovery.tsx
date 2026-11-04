import { BrandMark } from "./BrandMark";

export function NativeStartupRecovery({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="native-startup-recovery" role="alert">
      <BrandMark />
      <h1>We couldn’t open your library</h1>
      <p>
        Your saved articles, bookmarks, downloads and reading history have not
        been deleted. Fylogia did not reset your library.
      </p>
      <p>Retry to reconnect to your existing on-device library.</p>
      <button type="button" onClick={onRetry}>
        Retry opening Fylogia
      </button>
    </main>
  );
}
