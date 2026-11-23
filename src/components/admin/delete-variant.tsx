"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Result = { ok: true } | { ok: false; error: string };

/** Bouton « Supprimer » avec confirmation ; l'action serveur revérifie les droits et protège l'historique des commandes. */
export function DeleteVariant({ action, id, label }: { action: (input: unknown) => Promise<Result>; id: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="text-xs text-danger underline underline-offset-4 disabled:opacity-50"
        aria-label={`Supprimer ${label}`}
        onClick={() => {
          if (!window.confirm(`Supprimer « ${label} » définitivement ? Cette action ne peut pas être annulée.`)) return;
          setMsg(null);
          start(async () => {
            const r = await action({ id });
            if (r.ok) router.refresh();
            else {
              setMsg(r.error);
              router.refresh();
            }
          });
        }}
      >
        {pending ? "…" : "Supprimer"}
      </button>
      {msg && (
        <span role="alert" className="text-xs text-danger">
          {msg}
        </span>
      )}
    </span>
  );
}
