"use client";

import { useState, useTransition } from "react";
import { confirmAge } from "@/app/actions";
import { Logo } from "@/components/logo";

export function AgeGate({ logoUrl }: { logoUrl?: string | null }) {
  const [denied, setDenied] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-title"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background/95 px-4 py-10 backdrop-blur-md"
    >
      <div className="card w-full max-w-md px-7 py-10 text-center sm:px-10">
        <div className="flex justify-center">
          <Logo imageUrl={logoUrl} />
        </div>
        {denied ? (
          <div role="alert" className="mt-8">
            <h2 id="age-title" className="display text-3xl">
              Accès réservé aux adultes
            </h2>
            <p className="mt-4 text-sm text-ink-soft">
              La vente de produits contenant de la nicotine est interdite aux mineurs. Nous ne pouvons pas vous ouvrir
              l&apos;accès à la boutique.
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <h2 id="age-title" className="display text-3xl sm:text-4xl">
              Avez-vous 18 ans ou plus ?
            </h2>
            <p className="mt-4 text-sm text-ink-soft">
              Nos produits contiennent de la nicotine, substance qui crée une forte dépendance. Ils sont strictement
              réservés aux personnes majeures.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                className="pill"
                disabled={pending}
                onClick={() => start(async () => void (await confirmAge()))}
              >
                {pending ? "Un instant…" : "Oui, j'ai 18 ans ou plus"}
              </button>
              <button type="button" className="pill pill-ghost" onClick={() => setDenied(true)}>
                Non, j&apos;ai moins de 18 ans
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
