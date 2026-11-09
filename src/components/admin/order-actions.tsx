"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setOrderStatus } from "@/app/admin/actions";

const NEXT: Record<string, { to: string; label: string } | undefined> = {
  pending: { to: "confirmed", label: "Confirmer la commande" },
  confirmed: { to: "preparing", label: "Passer en préparation" },
  preparing: { to: "out_for_delivery", label: "Remettre au livreur" },
  out_for_delivery: { to: "delivered", label: "Livrée et encaissée" },
};

export function OrderActions({ orderId, status, cod, hasCourier = true }: { orderId: string; status: string; cod: boolean; hasCourier?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = NEXT[status];
  if (!next) return <p className="text-sm text-ink-soft">Commande clôturée : aucune action possible.</p>;

  const run = (to: string) =>
    start(async () => {
      setError(null);
      const r = await setOrderStatus({ orderId, status: to });
      if (r.ok) router.refresh();
      else setError(r.error);
    });

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="pill"
          disabled={pending || (next.to === "out_for_delivery" && !hasCourier)}
          onClick={() => {
            if (next.to === "delivered" && cod && !window.confirm("Confirmer que le montant a bien été encaissé en espèces ?")) return;
            run(next.to);
          }}
        >
          {next.label}
        </button>
        <button
          type="button"
          className="pill pill-ghost"
          disabled={pending}
          onClick={() => window.confirm("Annuler cette commande ? Le stock réservé sera libéré.") && run("cancelled")}
        >
          Annuler
        </button>
      </div>
      {next.to === "out_for_delivery" && !hasCourier && (
        <p className="mt-3 text-sm text-ink-soft" data-testid="courier-hint">Attribuez d&apos;abord un livreur dans la page Livraisons.</p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
