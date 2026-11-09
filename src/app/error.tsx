"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="eyebrow">Oups</p>
      <h1 className="display mt-3 text-5xl">Un incident est survenu</h1>
      <p className="mt-5 text-ink-soft">Le catalogue n&apos;a pas pu être chargé. Réessayez dans un instant.</p>
      <div className="mt-8 flex gap-3">
        <button type="button" className="pill" onClick={reset}>
          Réessayer
        </button>
        <Link href="/" className="pill pill-ghost">
          Accueil
        </Link>
      </div>
    </main>
  );
}
