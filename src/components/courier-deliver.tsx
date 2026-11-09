"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { courierDeliver } from "@/app/livreur/actions";

export function CourierDeliver({ orderId, total, cod }: { orderId: string; total: number; cod: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState(String(total));
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await courierDeliver({ orderId, amount: cod ? Number(amount) : 0 });
          if (r.ok) router.refresh();
          else setError(r.error);
        });
      }}
    >
      {cod && (
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-ink-soft">
          Montant encaissé (FCFA)
          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} className="h-11 w-40 rounded-xl border border-line bg-surface px-3 text-base text-ink" />
        </label>
      )}
      <button type="submit" className="pill" disabled={pending}>
        {pending ? "…" : "Livré"}
      </button>
      {error && <p role="alert" className="w-full text-sm text-danger">{error}</p>}
    </form>
  );
}
