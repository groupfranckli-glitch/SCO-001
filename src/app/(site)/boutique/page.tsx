import type { Metadata } from "next";
import { Suspense } from "react";
import { CollectionTile } from "@/components/collection-tile";
import { PageSkeleton } from "@/components/page-skeleton";
import { getProducts } from "@/lib/catalog";
import { Banners } from "@/components/banners";
import { buildTiles } from "@/lib/collections";
import { getSlotImages } from "@/lib/site-media";

export const metadata: Metadata = {
  title: "Boutique",
  description: "NexPOD et NexBAR : kit, batteries, recharges et puffs jetables 10 000 puffs.",
};

const LAYOUT: Record<string, string> = {
  nexbar: "min-h-[22rem]",
  nexpod: "min-h-[22rem]",
  batteries: "min-h-[22rem]",
  recharges: "min-h-[22rem]",
};

async function Tiles() {
  const [products, images] = await Promise.all([getProducts(), getSlotImages()]);
  const tiles = buildTiles(products).map((t) => ({ ...t, image: images[`tile_${t.key}` as keyof typeof images] ?? t.image }));
  if (tiles.length === 0) {
    return <p className="mt-12 text-ink-soft">Le catalogue est en cours de préparation. Revenez très bientôt.</p>;
  }
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {tiles.map((t, i) => (
        <CollectionTile key={t.key} tile={t} priority={i < 2} className={LAYOUT[t.key]} />
      ))}
    </div>
  );
}

export default function BoutiquePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-8 sm:pt-16">
      <p className="eyebrow">Boutique</p>
      <h1 className="display mt-3 text-5xl sm:text-6xl">Deux univers, une sélection courte</h1>
      <Banners placement="boutique" />
      <Suspense fallback={<PageSkeleton />}>
        <Tiles />
      </Suspense>

      <div className="marquee mt-20 border-y border-line py-8" role="list" aria-label="Nos engagements">
        <div className="marquee-track">
          {[0, 1, 2, 3].map((copy) => (
            <div key={copy} className="marquee-group" aria-hidden={copy > 0 ? "true" : undefined}>
              {[
                ["Livraison", "à domicile à Abidjan"],
                ["Produits d'origine", "NexPOD et NexBAR"],
                ["18+", "vente réservée aux adultes"],
              ].map(([a, b]) => (
                <span key={a} role={copy === 0 ? "listitem" : undefined} className="marquee-item">
                  <span className="display text-2xl">{a}</span>
                  <span className="ml-2 text-sm text-ink-soft">{b}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
