"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { checkPromo, placeOrder } from "@/app/commande-actions";
import { useCart } from "@/components/cart-provider";
import { formatFcfa } from "@/lib/format";

type Zone = { commune: string; fee: number };

const input =
  "mt-2 h-12 w-full rounded-xl border border-line bg-surface px-4 text-sm outline-none transition focus:border-ink";
const label = "block text-[11px] uppercase tracking-[0.16em] text-ink-soft";

function Recap({
  lines,
  subtotal,
  discount,
  fee,
  total,
}: {
  lines: ReturnType<typeof useCart>["lines"];
  subtotal: number;
  discount: number;
  fee: number | null;
  total: number;
}) {
  return (
    <>
      <ul className="space-y-3">
        {lines.map((l) => (
          <li key={l.variantId} className="flex items-center gap-3 text-sm" data-testid="recap-line">
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
              {l.image && <Image src={l.image} alt="" fill sizes="48px" className="object-cover" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{l.productName}</span>
              <span className="text-xs text-ink-soft">
                {l.label} · quantité {l.quantity}
              </span>
            </span>
            <span className="tabular-nums">{formatFcfa(l.unitPrice * l.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-soft">Sous-total</dt>
          <dd className="tabular-nums">{formatFcfa(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <dt className="text-ink-soft">Réduction</dt>
            <dd className="tabular-nums" data-testid="recap-discount">
              − {formatFcfa(discount)}
            </dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-ink-soft">Livraison</dt>
          <dd className="tabular-nums" data-testid="recap-fee">
            {fee === null ? "choisissez la commune" : formatFcfa(fee)}
          </dd>
        </div>
        <div className="display flex justify-between border-t border-line pt-3 text-2xl">
          <dt>Total</dt>
          <dd className="tabular-nums" data-testid="recap-total">
            {formatFcfa(total)}
          </dd>
        </div>
      </dl>
    </>
  );
}

export function CheckoutForm({ zones, defaults }: { zones: Zone[]; defaults: { name: string; phone: string } }) {
  const router = useRouter();
  const { lines, subtotal, ready, clear } = useCart();
  const [pending, start] = useTransition();
  const [promoPending, startPromo] = useTransition();
  const key = useRef<string | null>(null);

  const [commune, setCommune] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return <div className="mt-12 h-64 animate-pulse rounded-3xl bg-muted" aria-busy="true" />;

  if (lines.length === 0) {
    return (
      <div className="mx-auto mt-12 max-w-md rounded-3xl border border-line bg-surface px-6 py-14 text-center" data-testid="checkout-empty">
        <p className="display text-3xl">Votre panier est vide</p>
        <Link href="/boutique" className="pill mt-8">
          Découvrir la boutique
        </Link>
      </div>
    );
  }

  const fee = zones.find((z) => z.commune === commune)?.fee ?? null;
  const discount = Math.min(promo?.discount ?? 0, subtotal);
  const total = subtotal - discount + (fee ?? 0);

  function applyPromo() {
    setPromoError(null);
    startPromo(async () => {
      const r = await checkPromo(promoInput, subtotal);
      if (r.ok) setPromo({ code: r.code, discount: r.discount });
      else {
        setPromo(null);
        setPromoError(r.error);
      }
    });
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const text = (n: string) => String(f.get(n) ?? "");
    key.current ??= crypto.randomUUID();
    start(async () => {
      const r = await placeOrder({
        idempotencyKey: key.current,
        lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        name: text("name"),
        phone: text("phone"),
        commune,
        quartier: text("quartier") || undefined,
        address: text("address"),
        landmark: text("landmark") || undefined,
        notes: text("notes") || undefined,
        promo: promo?.code,
        provider: "cash_on_delivery",
        ageConfirmed: f.get("adult") === "on",
        website: text("website"),
      });
      if (r.ok) {
        clear();
        key.current = null;
        router.push(`/compte/commandes/${r.number}`);
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]" data-testid="checkout-form">
      {/* Récapitulatif compact et repliable sur mobile */}
      <details className="card lg:hidden" data-testid="recap-mobile">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm">
          <span className="display text-xl">Récapitulatif</span>
          <span className="tabular-nums">{formatFcfa(total)}</span>
        </summary>
        <div className="border-t border-line px-5 py-5">
          <Recap lines={lines} subtotal={subtotal} discount={discount} fee={fee} total={total} />
        </div>
      </details>

      <div className="space-y-10">
        <section aria-labelledby="h-livraison">
          <h2 id="h-livraison" className="display text-2xl">
            Livraison
          </h2>
          <div className="mt-4 rounded-2xl border border-ink bg-accent-soft/50 px-5 py-4 text-sm">
            <p className="font-medium">Livraison à Abidjan</p>
            <p className="text-xs text-ink-soft">À domicile ou au bureau</p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className={label}>
              Nom complet
              <input name="name" required minLength={2} maxLength={80} defaultValue={defaults.name} autoComplete="name" className={input} />
            </label>
            <label className={label}>
              Téléphone
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                required
                pattern="\+?[0-9 ]{8,20}"
                title="8 à 20 chiffres, par exemple 07 00 00 00 00"
                defaultValue={defaults.phone}
                autoComplete="tel"
                placeholder="07 00 00 00 00"
                className={input}
              />
            </label>
            <label className={label}>
              Commune
              <select
                name="commune"
                required
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                className={input}
                data-testid="commune"
              >
                <option value="" disabled>
                  Choisir…
                </option>
                {zones.map((z) => (
                  <option key={z.commune} value={z.commune}>
                    {z.commune}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Quartier
              <input name="quartier" maxLength={80} autoComplete="address-level3" className={input} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Adresse précise
              <input name="address" required minLength={5} maxLength={200} autoComplete="street-address" placeholder="Rue, immeuble, porte…" className={input} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Point de repère
              <input name="landmark" maxLength={150} placeholder="Près de la pharmacie, derrière le marché…" className={input} />
            </label>
          </div>
        </section>

        <section aria-labelledby="h-paiement" className="border-t border-line pt-10">
          <h2 id="h-paiement" className="display text-2xl">
            Paiement
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Moyen de paiement">
            {[
              { id: "wave", name: "Wave", sub: "Bientôt disponible" },
              { id: "orange_money", name: "Orange Money", sub: "Bientôt disponible" },
            ].map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked="false" aria-disabled="true" disabled className="rounded-2xl border border-line bg-surface px-4 py-4 text-left text-sm opacity-50">
                <span className="block font-medium">{p.name}</span>
                <span className="text-xs text-ink-soft">{p.sub}</span>
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked="true"
              data-testid="pay-cod"
              className="rounded-2xl border border-ink bg-accent-soft/50 px-4 py-4 text-left text-sm"
            >
              <span className="block font-medium">Paiement à la livraison</span>
              <span className="text-xs text-ink-soft">En espèces, à la réception</span>
            </button>
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            Vous réglez en espèces au livreur, au moment de la remise de votre commande. Wave et Orange Money seront ajoutés très prochainement.
          </p>
        </section>

        <section aria-labelledby="h-promo" className="border-t border-line pt-10">
          <h2 id="h-promo" className="display text-2xl">
            Code promo <span className="text-xs font-sans not-italic text-ink-soft">facultatif</span>
          </h2>
          <div className="mt-4 flex gap-3">
            <label className="flex-1">
              <span className="sr-only">Code promo</span>
              <input
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value);
                  setPromo(null);
                }}
                maxLength={30}
                placeholder="Votre code"
                className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-sm uppercase outline-none focus:border-ink"
              />
            </label>
            <button type="button" className="pill pill-ghost" disabled={promoPending || promoInput.trim().length < 3} onClick={applyPromo}>
              Appliquer
            </button>
          </div>
          {promo && (
            <p role="status" className="mt-2 text-sm text-accent-ink">
              Code {promo.code} appliqué : − {formatFcfa(discount)}
            </p>
          )}
          {promoError && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {promoError}
            </p>
          )}
        </section>

        <section aria-labelledby="h-notes" className="border-t border-line pt-10">
          <h2 id="h-notes" className="display text-2xl">
            Une précision ? <span className="text-xs font-sans not-italic text-ink-soft">facultatif</span>
          </h2>
          <label className="mt-4 block">
            <span className="sr-only">Notes de livraison</span>
            <textarea
              name="notes"
              maxLength={300}
              rows={3}
              placeholder="Horaire de livraison, demande particulière…"
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-ink"
            />
          </label>
        </section>

        <label className="flex items-start gap-3 border-t border-line pt-8 text-sm">
          <input name="adult" type="checkbox" required className="mt-1 h-4 w-4 accent-[var(--accent-ink)]" data-testid="adult" />
          <span>Je confirme avoir 18 ans ou plus. La nicotine crée une forte dépendance ; ces produits sont réservés aux adultes.</span>
        </label>

        {/* Piège à robots : invisible, doit rester vide */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Site web
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" data-testid="checkout-error">
            {error}
          </p>
        )}

        <button type="submit" className="pill w-full lg:hidden" disabled={pending} data-testid="submit-mobile">
          {pending ? "Validation…" : "Valider ma commande"}
        </button>
      </div>

      <aside className="hidden lg:block">
        <div className="card sticky top-28 bg-accent-soft/40 p-6">
          <h2 className="display text-2xl">Récapitulatif</h2>
          <div className="mt-5">
            <Recap lines={lines} subtotal={subtotal} discount={discount} fee={fee} total={total} />
          </div>
          <button type="submit" className="pill mt-6 w-full" disabled={pending} data-testid="submit-desktop">
            {pending ? "Validation…" : "Valider ma commande"}
          </button>
          <p className="mt-4 text-xs text-ink-soft">Vous réglez en espèces à la livraison. Aucun paiement n&apos;est demandé maintenant.</p>
        </div>
      </aside>
    </form>
  );
}
