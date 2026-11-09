"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatFcfa } from "@/lib/format";

export function CartView() {
  const { lines, subtotal, ready, setQty, remove } = useCart();

  if (!ready) {
    return <div className="mt-12 h-48 animate-pulse rounded-3xl bg-muted" aria-busy="true" aria-label="Chargement du panier" />;
  }

  if (lines.length === 0) {
    return (
      <div className="mt-12 rounded-3xl border border-line bg-surface px-6 py-16 text-center" data-testid="cart-empty">
        <p className="display text-3xl">Votre panier est vide</p>
        <p className="mt-3 text-sm text-ink-soft">Choisissez une saveur ou une couleur, nous nous occupons du reste.</p>
        <Link href="/boutique" className="pill mt-8">
          Découvrir la boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((l) => (
          <li key={l.variantId} data-testid="cart-line" className="flex gap-4 py-5">
            <Link
              href={`/produit/${l.productSlug}`}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-muted"
              aria-label={l.productName}
            >
              {l.image && <Image src={l.image} alt="" fill sizes="96px" className="object-cover" />}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="display truncate text-2xl">{l.productName}</p>
                  <p className="text-sm text-ink-soft">{l.label}</p>
                </div>
                <p className="shrink-0 text-sm tabular-nums">{formatFcfa(l.unitPrice * l.quantity)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="inline-flex h-10 items-center rounded-full border border-line bg-surface" role="group" aria-label={`Quantité ${l.productName} ${l.label}`}>
                  <button
                    type="button"
                    aria-label="Diminuer la quantité"
                    onClick={() => setQty(l.variantId, l.quantity - 1)}
                    className="grid h-10 w-10 place-items-center"
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-sm tabular-nums" data-testid="line-qty">
                    {l.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Augmenter la quantité"
                    onClick={() => setQty(l.variantId, l.quantity + 1)}
                    className="grid h-10 w-10 place-items-center"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(l.variantId)}
                  className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
                >
                  Retirer
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="card h-fit p-6">
        <h2 className="display text-2xl">Récapitulatif</h2>
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Sous-total</dt>
            <dd data-testid="subtotal" className="tabular-nums">
              {formatFcfa(subtotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Livraison</dt>
            <dd className="text-ink-soft">calculée à la commande</dd>
          </div>
        </dl>
        <Link href="/commande" className="pill mt-6 w-full" data-testid="checkout-link">
          Passer la commande
        </Link>
        <Link href="/boutique" className="mt-4 block text-center text-sm text-ink-soft underline underline-offset-4">
          Continuer mes achats
        </Link>
      </aside>
    </div>
  );
}
