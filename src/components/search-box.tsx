"use client";

import { useEffect, useRef, useState } from "react";

export function SearchBox({ light = false }: { light?: boolean }) {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Rechercher"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-black/5"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <form
          role="search"
          action="/recherche"
          method="get"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className={`absolute inset-x-0 top-full z-40 px-4 pb-3 sm:px-8 ${light ? "" : "bg-background/95 backdrop-blur-md"}`}
        >
          <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-line bg-surface px-5 py-1 text-ink shadow-lg">
            <label htmlFor="site-search" className="sr-only">
              Rechercher un produit
            </label>
            <input
              id="site-search"
              ref={input}
              name="q"
              type="search"
              required
              maxLength={80}
              placeholder="Rechercher une saveur, une couleur…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-ink-soft"
            />
            <button type="submit" className="pill h-9 min-h-0 px-5 text-xs">
              Chercher
            </button>
          </div>
        </form>
      )}
    </>
  );
}
