"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setStockBulk } from "@/app/admin/actions";

export type StockRow = { id: string; color: string | null; flavor: string | null; onHand: number; reserved: number };

const input = "h-10 w-16 sm:w-20 rounded-xl border border-line bg-surface px-2 text-center text-sm tabular-nums";

/** Saisie du stock d'un produit : liste (saveurs ou couleurs) ou grille couleurs × saveurs (kit). Un seul bouton enregistre tout. */
export function StockGrid({ rows, byFlavor }: { rows: StockRow[]; byFlavor: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Kit : la couleur n'est que le boîtier, le stock se saisit PAR SAVEUR et vaut pour toutes les couleurs.
  type Item = { key: string; title: string; rows: StockRow[] };
  const items: Item[] = byFlavor
    ? [...new Set(rows.map((r) => r.flavor ?? ""))].sort().map((f) => ({ key: f, title: f, rows: rows.filter((r) => (r.flavor ?? "") === f) }))
    : rows.map((r) => ({ key: r.id, title: (r.color ?? r.flavor) as string, rows: [r] }));
  const initial = (it: Item) => String(Math.max(...it.rows.map((r) => r.onHand)));
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(items.map((it) => [it.key, initial(it)])));
  const [fill, setFill] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = (it: Item) => it.rows.some((r) => String(r.onHand) !== vals[it.key]);
  const changed = items.filter(dirty);
  const set = (key: string, v: string) => {
    setMsg(null);
    setVals((s) => ({ ...s, [key]: v }));
  };
  const colors = byFlavor ? [...new Set(rows.map((r) => r.color ?? ""))] : [];

  const body = (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((it) => {
        const reserved = Math.max(...it.rows.map((r) => r.reserved));
        return (
          <li key={it.key} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-2">
            <span className="font-bold">
              {it.title}
            </span>
            <span className="inline-flex flex-col items-center gap-0.5">
              <input
                type="number"
                inputMode="numeric"
                min={reserved}
                max={100000}
                step={1}
                value={vals[it.key] ?? ""}
                onChange={(e) => set(it.key, e.target.value)}
                aria-label={`Stock ${it.title}`}
                data-testid="stock-input"
                className={`${input} ${dirty(it) ? "border-ink" : ""}`}
              />
              {reserved > 0 && <span className="text-[10px] text-ink-soft">{reserved} réservé{reserved > 1 ? "s" : ""}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div>
      {byFlavor && (
        <p className="mb-3 text-sm text-ink-soft">
          Le stock d&apos;une saveur vaut pour toutes les couleurs ({colors.join(", ")}).
          {items.some((it) => it.rows.some((r) => r.onHand !== it.rows[0].onHand)) && <strong className="block text-ink">Certaines couleurs n&apos;ont pas le même stock : cliquez sur « Enregistrer » pour les aligner sur les nombres affichés.</strong>}
        </p>
      )}
      {body}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <button
          type="button"
          className="pill h-10 min-h-0 px-5 text-xs"
          disabled={pending || changed.length === 0}
          data-testid="stock-save"
          onClick={() => {
            const payload = changed.flatMap((it) => it.rows.map((r) => ({ variantId: r.id, target: vals[it.key] === "" ? NaN : Number(vals[it.key]) })));
            if (payload.some((i) => !Number.isInteger(i.target) || i.target < 0)) return setMsg({ ok: false, text: "Entrez des nombres entiers positifs." });
            setMsg(null);
            start(async () => {
              const res = await setStockBulk({ items: payload });
              if (res.ok) {
                setMsg({ ok: true, text: `${changed.length} modification${changed.length > 1 ? "s" : ""} enregistrée${changed.length > 1 ? "s" : ""}` });
                router.refresh();
              } else setMsg({ ok: false, text: res.error });
            });
          }}
        >
          Enregistrer{changed.length ? ` (${changed.length})` : ""}
        </button>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-ink-soft">
          Mettre tout à
          <span className="flex gap-2">
            <input type="number" min={0} max={100000} value={fill} onChange={(e) => setFill(e.target.value)} className={input} aria-label="Quantité pour tout remplir" />
            <button
              type="button"
              className="h-10 rounded-xl border border-line px-3 text-xs normal-case tracking-normal"
              disabled={fill === "" || Number(fill) < 0}
              onClick={() => setVals(Object.fromEntries(items.map((it) => [it.key, String(Math.max(Number(fill), ...it.rows.map((r) => r.reserved)))])))}
            >
              Remplir
            </button>
          </span>
        </label>
        {msg && (
          <span role={msg.ok ? "status" : "alert"} className={`text-xs ${msg.ok ? "text-ink-soft" : "text-danger"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
