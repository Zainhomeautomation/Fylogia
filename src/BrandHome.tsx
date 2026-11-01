import type { ReactNode } from "react";

/** One keyboard/touch target; callers reuse the existing client-side Home route. */
export function BrandHome({
  onHome,
  children,
  className = "",
}: {
  onHome: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={"brand-home " + className}
      aria-label="Fylogia — Go to homepage"
      title="Fylogia — Go to homepage"
      onClick={onHome}
    >
      {children}
    </button>
  );
}
