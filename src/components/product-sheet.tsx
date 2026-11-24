"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import type { Product } from "@/lib/catalog";
import { MAX_LINE_QTY } from "@/lib/cart";
import { formatFcfa } from "@/lib/format";
import { norm, resolveMedia, SPECS } from "@/lib/media";

const SWATCH: Record<string, string> = { noir: "#15120f", bleu: "#3b6fd0", violet: "#8c78d6", rouge: "#c8312b", gris: "#9a9a9a" };

function stockText(n: number): { text: string; tone: string } {
  if (n <= 0) return { text: "Épuisé", tone: "text-danger" };
  if (n <= 5) return { text: `Plus que ${n} en stock`, tone: "text-accent-ink" };
  return { text: "En stock", tone: "text-ink-soft" };
}

export function ProductSheet({
  product,
  index = 0,
  priority = false,
  as: Heading = "h2",
}: {
  product: Product;
  index?: number;
  priority?: boolean;
  as?: "h1" | "h2";
}) {
  const router = useRouter();
  const { add } = useCart();
  const firstAvailable = product.variants.find((v) => v.available > 0) ?? product.variants[0];
  const showOptions = product.variants.length > 1;
  // Kit : une variante = une couleur + une saveur ; on les choisit séparément.
  const composer = product.variants.length > 0 && product.variants.every((v) => v.color && v.flavor);
  const colors = Array.from(new Set(product.variants.map((v) => v.color as string))).sort((a, b) => a.localeCompare(b, "fr"));
  const flavors = Array.from(new Set(product.variants.map((v) => v.flavor as string))).sort((a, b) => a.localeCompare(b, "fr"));
  const [color, setColor] = useState(firstAvailable?.color ?? "");
  const [flavor, setFlavor] = useState(firstAvailable?.flavor ?? "");
  const combo = composer ? product.variants.find((v) => v.color === color && v.flavor === flavor) : undefined;
  // Quantité choisie par variante : on peut composer plusieurs saveurs / couleurs en une seule fois.
  const [qtys, setQtys] = useState<Record<string, number>>(() => (!showOptions && firstAvailable && firstAvailable.available > 0 ? { [firstAvailable.id]: 1 } : {}));
  const [focusId, setFocusId] = useState(firstAvailable?.id ?? "");

  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.id === focusId) ?? firstAvailable;
  const media = resolveMedia(product, variant);
  const stock = stockText(variant?.available ?? 0);
  const specs = SPECS[product.kind];
  const optionLabel = composer ? "Couleur et saveur" : product.kind === "nexpod_battery" || product.kind === "nexpod_kit" ? "Couleurs" : "Saveurs";
  const reverse = index % 2 === 1;

  const maxFor = (v: { available: number }) => Math.min(v.available, MAX_LINE_QTY);
  const qtyOf = (id: string) => qtys[id] ?? 0;
  const chosen = product.variants.filter((v) => qtyOf(v.id) > 0 && maxFor(v) > 0);
  const totalQty = chosen.reduce((n, v) => n + qtyOf(v.id), 0);
  const totalPrice = chosen.reduce((n, v) => n + qtyOf(v.id) * v.priceFcfa, 0);
  const soldOut = !product.variants.some((v) => v.available > 0);
  const empty = totalQty === 0;

  function setQty(id: string, next: number) {
    const v = product.variants.find((x) => x.id === id);
    if (!v) return;
    setQtys((q) => ({ ...q, [id]: Math.max(0, Math.min(next, maxFor(v))) }));
    setFocusId(id);
    setAdded(false);
  }

  function addToCart(): boolean {
    if (empty) return false;
    for (const v of chosen) {
      add(
        {
          variantId: v.id,
          productSlug: product.slug,
          productName: product.name,
          label: v.label,
          unitPrice: v.priceFcfa,
          maxQty: v.available,
          image: resolveMedia(product, v).src,
        },
        qtyOf(v.id),
      );
    }
    return true;
  }

  const stepper = (v: { id: string; label: string; available: number }) => {
    const q = qtyOf(v.id);
    return (
      <div className="inline-flex h-11 items-center rounded-full border border-line bg-surface" role="group" aria-label={showOptions ? `Quantité ${v.label}` : "Quantité"}>
        <button type="button" aria-label={showOptions ? `Diminuer ${v.label}` : "Diminuer la quantité"} disabled={q <= 0} onClick={() => setQty(v.id, q - 1)} className="grid h-11 w-11 place-items-center text-lg disabled:opacity-30">
          −
        </button>
        <span className="w-7 text-center text-sm tabular-nums" data-testid={showOptions ? "option-qty" : "qty"} aria-live="polite">
          {q}
        </span>
        <button type="button" aria-label={showOptions ? `Augmenter ${v.label}` : "Augmenter la quantité"} disabled={q >= maxFor(v)} onClick={() => setQty(v.id, q + 1)} className="grid h-11 w-11 place-items-center text-lg disabled:opacity-30">
          +
        </button>
      </div>
    );
  };

  return (
    <article
      id={product.slug}
      data-testid="product-sheet"
      className="grid scroll-mt-28 items-center gap-8 md:grid-cols-2 md:gap-16 lg:gap-24"
    >
      <div className={reverse ? "md:order-2" : ""}>
        <div
          className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] shadow-[0_30px_60px_-40px_rgb(21_18_15/0.5)] transition-colors duration-500 sm:aspect-square md:aspect-[5/6]"
          style={{ background: media.bg }}
        >
          <Image
            key={media.src}
            src={media.src}
            alt={`${product.name}${variant && showOptions ? ` — ${variant.label}` : ""}`}
            fill
            priority={priority}
            sizes="(min-width: 768px) 50vw, 100vw"
            className={media.fit === "cover" ? "object-cover" : "object-contain"}
          />
        </div>
      </div>

      <div className={reverse ? "md:order-1" : ""}>
        <p className="eyebrow">{product.categoryName}</p>
        <Heading className="display mt-3 text-5xl sm:text-6xl">{product.name}</Heading>
        {product.description && <p className="mt-5 max-w-md text-ink-soft">{product.description}</p>}

        <ul className="mt-6 space-y-2 text-sm">
          {specs.map((s) => (
            <li key={s} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-ink" />
              {s}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex items-baseline gap-4">
          <p className="display text-4xl" data-testid="price">
            {variant ? formatFcfa(variant.priceFcfa) : "—"}
          </p>
          <p className={`text-sm ${stock.tone}`} data-testid="stock">
            {stock.text}
          </p>
        </div>

        {composer && (
          <div className="mt-7 space-y-6" data-testid="composer">
            <fieldset>
              <legend className="eyebrow mb-3">
                Couleur · <span className="normal-case tracking-normal text-ink">{color}</span>
              </legend>
              <div role="radiogroup" aria-label="Couleur" className="flex flex-wrap gap-2">
                {colors.map((c) => {
                  const sw = SWATCH[norm(c)];
                  const on = c === color;
                  return (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      data-testid="color-option"
                      onClick={() => {
                        setColor(c);
                        const v = product.variants.find((x) => x.color === c && x.flavor === flavor);
                        if (v) setFocusId(v.id);
                      }}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition ${on ? "border-ink bg-ink text-background" : "border-line bg-surface hover:border-ink"}`}
                    >
                      {sw && <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border border-white/40" style={{ background: sw }} />}
                      {c}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="eyebrow mb-3">
                Saveur · <span className="normal-case tracking-normal text-ink">{flavor}</span>
              </legend>
              <div role="radiogroup" aria-label="Saveur" className="flex flex-wrap gap-2">
                {flavors.map((f) => {
                  const v = product.variants.find((x) => x.color === color && x.flavor === f);
                  const on = f === flavor;
                  const out = !v || v.available <= 0;
                  return (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      data-testid="flavor-option"
                      onClick={() => {
                        setFlavor(f);
                        if (v) setFocusId(v.id);
                      }}
                      className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition ${on ? "border-ink bg-ink text-background" : "border-line bg-surface hover:border-ink"} ${out ? "opacity-50" : ""}`}
                    >
                      {f}
                      {out && <span className="sr-only"> (épuisé)</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3" data-testid="combo">
              <p className="text-sm">
                {combo ? combo.flavor ?? combo.label : "Combinaison indisponible"}
                <span className={`block text-xs ${combo && combo.available > 0 ? "text-ink-soft" : "text-danger"}`}>
                  {combo ? (combo.available <= 0 ? "Épuisé" : combo.available <= 5 ? `Plus que ${combo.available} · ${formatFcfa(combo.priceFcfa)}` : formatFcfa(combo.priceFcfa)) : "Choisissez une autre saveur ou couleur"}
                </span>
              </p>
              {combo && combo.available > 0 && stepper(combo)}
            </div>
          </div>
        )}

        {showOptions && !composer && (
          <fieldset className="mt-7">
            <legend className="eyebrow mb-3">
              {optionLabel} · <span className="normal-case tracking-normal text-ink">choisissez-en une ou plusieurs</span>
            </legend>
            <ul className="space-y-2" aria-label={optionLabel}>
              {product.variants.map((v) => {
                const swatch = SWATCH[norm(v.color)];
                const q = qtyOf(v.id);
                const out = v.available <= 0;
                return (
                  <li
                    key={v.id}
                    data-testid="variant-option"
                    className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 transition ${q > 0 ? "border-ink bg-surface" : "border-line bg-surface"} ${out ? "opacity-50" : ""}`}
                  >
                    <button type="button" className="flex min-h-11 flex-1 items-center gap-3 text-left text-sm" onClick={() => setFocusId(v.id)} aria-label={`Voir ${v.label}`}>
                      {swatch && <span aria-hidden="true" className="h-4 w-4 rounded-full border border-line" style={{ background: swatch }} />}
                      <span>
                        {v.label}
                        <span className={`block text-xs ${out ? "text-danger" : "text-ink-soft"}`}>{out ? "Épuisé" : v.available <= 5 ? `Plus que ${v.available}` : formatFcfa(v.priceFcfa)}</span>
                      </span>
                    </button>
                    {out ? <span className="pr-2 text-xs text-danger">Épuisé</span> : stepper(v)}
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {!showOptions && variant && !soldOut && stepper(variant)}
          <button type="button" className="pill pill-ghost" disabled={empty} data-testid="add-to-cart" onClick={() => setAdded(addToCart())}>
            {showOptions ? "Ajouter la sélection" : "Ajouter au panier"}
          </button>
          <button
            type="button"
            className="pill"
            disabled={empty}
            data-testid="order-now"
            onClick={() => {
              if (addToCart()) router.push("/panier");
            }}
          >
            Commander
          </button>
        </div>
        {composer && chosen.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm" aria-label="Votre sélection" data-testid="composer-lines">
            {chosen.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 rounded-xl bg-accent-soft/40 px-3 py-2">
                <span>
                  {qtyOf(v.id)} × {v.label}
                </span>
                <button type="button" className="text-xs underline underline-offset-4" aria-label={`Retirer ${v.label}`} onClick={() => setQty(v.id, 0)}>
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
        {showOptions && (
          <p className="mt-3 text-sm text-ink-soft" data-testid="selection-summary" aria-live="polite">
            {empty ? (soldOut ? "Produit épuisé." : "Aucune sélection pour le moment.") : `${totalQty} article${totalQty > 1 ? "s" : ""} · ${formatFcfa(totalPrice)}`}
          </p>
        )}

        <p role="status" className="mt-4 min-h-6 text-sm text-accent-ink">
          {added && (
            <>
              Ajouté au panier.{" "}
              <Link href="/panier" className="underline underline-offset-4">
                Voir le panier
              </Link>
            </>
          )}
        </p>
      </div>
    </article>
  );
}
