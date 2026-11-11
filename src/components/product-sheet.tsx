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

const SWATCH: Record<string, string> = { noir: "#15120f", bleu: "#3b6fd0", violet: "#8c78d6", rouge: "#c8312b" };

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
  const [variantId, setVariantId] = useState(firstAvailable?.id ?? "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId) ?? firstAvailable;
  const media = resolveMedia(product, variant);
  const maxQty = variant ? Math.min(variant.available, MAX_LINE_QTY) : 0;
  const quantity = Math.max(1, Math.min(qty, Math.max(maxQty, 1)));
  const soldOut = !variant || maxQty <= 0;
  const stock = stockText(variant?.available ?? 0);
  const specs = SPECS[product.kind];
  const optionLabel = product.kind === "nexpod_battery" || product.kind === "nexpod_kit" ? "Couleur" : "Saveur";
  const showOptions = product.variants.length > 1;
  const reverse = index % 2 === 1;

  function addToCart(): boolean {
    if (!variant || soldOut) return false;
    add(
      {
        variantId: variant.id,
        productSlug: product.slug,
        productName: product.name,
        label: variant.label,
        unitPrice: variant.priceFcfa,
        maxQty: variant.available,
        image: media.src,
      },
      quantity,
    );
    return true;
  }

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

        {showOptions && (
          <fieldset className="mt-7">
            <legend className="eyebrow mb-3">
              {optionLabel} · <span className="normal-case tracking-normal text-ink">{variant?.label}</span>
            </legend>
            <div role="radiogroup" aria-label={optionLabel} className="flex flex-wrap gap-2">
              {product.variants.map((v) => {
                const selected = v.id === variant?.id;
                const swatch = SWATCH[norm(v.color)];
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid="variant-option"
                    onClick={() => {
                      setVariantId(v.id);
                      setAdded(false);
                    }}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition ${
                      selected ? "border-ink bg-ink text-background" : "border-line bg-surface hover:border-ink"
                    } ${v.available <= 0 ? "opacity-50" : ""}`}
                  >
                    {swatch && (
                      <span
                        aria-hidden="true"
                        className="h-3.5 w-3.5 rounded-full border border-white/40"
                        style={{ background: swatch }}
                      />
                    )}
                    {v.label}
                    {v.available <= 0 && <span className="sr-only"> (épuisé)</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="inline-flex h-12 items-center rounded-full border border-line bg-surface" role="group" aria-label="Quantité">
            <button
              type="button"
              aria-label="Diminuer la quantité"
              disabled={quantity <= 1}
              onClick={() => {
                setQty(quantity - 1);
                setAdded(false);
              }}
              className="grid h-12 w-12 place-items-center text-lg disabled:opacity-30"
            >
              −
            </button>
            <span className="w-8 text-center text-sm tabular-nums" data-testid="qty" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Augmenter la quantité"
              disabled={quantity >= maxQty}
              onClick={() => {
                setQty(quantity + 1);
                setAdded(false);
              }}
              className="grid h-12 w-12 place-items-center text-lg disabled:opacity-30"
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="pill pill-ghost"
            disabled={soldOut}
            data-testid="add-to-cart"
            onClick={() => setAdded(addToCart())}
          >
            Ajouter au panier
          </button>
          <button
            type="button"
            className="pill"
            disabled={soldOut}
            data-testid="order-now"
            onClick={() => {
              if (addToCart()) router.push("/panier");
            }}
          >
            Commander
          </button>
        </div>

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
