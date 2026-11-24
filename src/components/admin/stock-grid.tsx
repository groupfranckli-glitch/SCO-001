"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setStockBulk } from "@/app/admin/actions";

export type StockRow = { id: string; color: string | null; flavor: string | null; onHand: number; reserved: number };

const input = "h-10 w-16 sm:w-20 rounded-xl border border-line bg-surface px-2 text-center text-sm tabular-nums";

/** Saisie du stock d'un produit : liste (saveurs ou couleurs) ou grille couleurs × saveurs (kit). Un seul bouton enregistre tout. */
export function StockGrid({ rows, matrix }: { rows: StockRow[]; matrix: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.id, String(r.onHand)])));
  const [fill, setFill] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const changed = rows.filter((r) => vals[r.id] !== String(r.onHand));
  const set = (id: string, v: string) => {
    setMsg(null);
    setVals((s) => ({ ...s, [id]: v }));
  };
  const label = (r: StockRow) => [r.color, r.flavor].filter(Boolean).join(" · ");

  const cell = (r: StockRow) => (
    <span className="inline-flex flex-col items-center gap-0.5">
      <input
        type="number"
        inputMode="numeric"
        min={r.reserved}
        max={100000}
        step={1}
        value={vals[r.id] ?? ""}
        onChange={(e) => set(r.id, e.target.value)}
        aria-label={`Stock ${label(r)}`}
        data-testid="stock-input"
        className={`${input} ${vals[r.id] !== String(r.onHand) ? "border-ink" : ""}`}
      />
      {r.reserved > 0 && <span className="text-[10px] text-ink-soft">{r.reserved} réservé{r.reserved > 1 ? "s" : ""}</span>}
    </span>
  );

  let body: React.ReactNode;
  if (matrix) {
    const colors = [...new Set(rows.map((r) => r.color ?? ""))];
    const flavors = [...new Set(rows.map((r) => r.flavor ?? ""))].sort();
    const at = (c: string, f: string) => rows.find((r) => (r.color ?? "") === c && (r.flavor ?? "") === f);
    body = (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[26rem] text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-ink-soft">
              <th className="py-2 pr-3 text-left font-normal">Saveur</th>
              {colors.map((c) => (
                <th key={c} className="px-2 py-2 text-center font-normal">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {flavors.map((f) => (
              <tr key={f}>
                <th className="py-2 pr-2 text-left text-xs font-bold sm:text-sm">{f}</th>
                {colors.map((c) => {
                  const r = at(c, f);
                  return (
                    <td key={c} className="px-2 py-2 text-center">
                      {r ? cell(r) : <span className="text-ink-soft">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    body = (
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-2">
            <span className="font-bold">{r.color ?? r.flavor}</span>
            {cell(r)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      {body}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <button
          type="button"
          className="pill h-10 min-h-0 px-5 text-xs"
          disabled={pending || changed.length === 0}
          data-testid="stock-save"
          onClick={() => {
            const items = changed.map((r) => ({ variantId: r.id, target: vals[r.id] === "" ? NaN : Number(vals[r.id]) }));
            if (items.some((i) => !Number.isInteger(i.target) || i.target < 0)) return setMsg({ ok: false, text: "Entrez des nombres entiers positifs." });
            setMsg(null);
            start(async () => {
              const res = await setStockBulk({ items });
              if (res.ok) {
                setMsg({ ok: true, text: `${items.length} modification${items.length > 1 ? "s" : ""} enregistrée${items.length > 1 ? "s" : ""}` });
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
              onClick={() => setVals(Object.fromEntries(rows.map((r) => [r.id, String(Math.max(Number(fill), r.reserved))])))}
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
