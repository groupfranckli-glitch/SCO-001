"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adjustStock } from "@/app/admin/actions";

export function StockAdjust({ variantId, label }: { variantId: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        setError(null);
        start(async () => {
          const r = await adjustStock({ variantId, delta: Number(f.get("delta")), note: String(f.get("note") ?? "") || undefined });
          if (r.ok) {
            form.reset();
            router.refresh();
          } else setError(r.error);
        });
      }}
    >
      <label className="sr-only" htmlFor={`d-${variantId}`}>
        Ajustement pour {label}
      </label>
      <input id={`d-${variantId}`} name="delta" type="number" step={1} required placeholder="+10 / −2" className="h-10 w-24 rounded-xl border border-line bg-surface px-3 text-sm" />
      <input name="note" maxLength={200} placeholder="Motif (facultatif)" className="h-10 w-40 rounded-xl border border-line bg-surface px-3 text-sm" />
      <button type="submit" className="pill h-10 min-h-0 px-4 text-xs" disabled={pending}>
        Appliquer
      </button>
      {error && (
        <span role="alert" className="w-full text-xs text-danger">
          {error}
        </span>
      )}
    </form>
  );
}
