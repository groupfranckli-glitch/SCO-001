import Link from "next/link";

/** Identité SCO PUFF : un nuage de vapeur stylisé et un mot-symbole en serif italique. */
export function Logo({ light = false, href }: { light?: boolean; href?: string }) {
  const content = (
    <span className={`inline-flex items-center gap-2 ${light ? "text-white" : "text-ink"}`}>
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <circle cx="13" cy="13" r="12" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M7 15.5c0-2 1.6-3.4 3.4-3.2.5-1.9 2.1-3.1 3.9-3.1 2.2 0 3.9 1.7 3.9 3.8 1.2.2 2 1.2 2 2.4 0 1.4-1.1 2.4-2.5 2.4h-7.6c-1.8 0-3.1-.9-3.1-2.3Z"
          fill="currentColor"
          opacity="0.9"
        />
      </svg>
      <span className="display text-[1.55rem] leading-none">
        Sco <span className={light ? "text-white" : "text-accent-ink"}>Puff</span>
      </span>
    </span>
  );
  return href ? (
    <Link href={href} aria-label="SCO PUFF — accueil" className="inline-flex">
      {content}
    </Link>
  ) : (
    content
  );
}
