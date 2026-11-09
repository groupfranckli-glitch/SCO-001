import { Suspense, type ReactNode } from "react";
import { PageSkeleton } from "@/components/page-skeleton";

/** Les pages admin lisent des cookies : tout est dans un Suspense (cacheComponents). */
export function AdminPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}
export const Title = ({ children, hint }: { children: ReactNode; hint?: string }) => (
  <>
    <h1 className="display text-5xl">{children}</h1>
    {hint && <p className="mt-3 max-w-xl text-sm text-ink-soft">{hint}</p>}
  </>
);
export const card = "rounded-3xl border border-line bg-surface";
