import type { Metadata } from "next";
import { Suspense } from "react";
import { CollectionTile } from "@/components/collection-tile";
import { PageSkeleton } from "@/components/page-skeleton";
import { getProducts } from "@/lib/catalog";
import { buildTiles } from "@/lib/collections";

export const metadata: Metadata = {
  title: "Boutique",
  description: "NexPOD et NexBAR : batteries, recharges, kits et puffs jetables 10 000 puffs.",
};

const LAYOUT: Record<string, string> = {
  nexbar: "min-h-[26rem] md:row-span-2 md:min-h-0",
  nexpod: "min-h-[17rem]",
  batteries: "min-h-[17rem]",
  recharges: "min-h-[17rem]",
  kits: "min-h-[17rem]",
};

async function Tiles() {
  const tiles = buildTiles(await getProducts());
  if (tiles.length === 0) {
    return <p className="mt-12 text-ink-soft">Le catalogue est en cours de préparation. Revenez très bientôt.</p>;
  }
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-3 md:grid-rows-2 md:[grid-auto-rows:minmax(18rem,1fr)] md:[grid-auto-flow:dense]">
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
      <Suspense fallback={<PageSkeleton />}>
        <Tiles />
      </Suspense>

      <ul className="mt-20 grid gap-6 border-y border-line py-8 text-center sm:grid-cols-3">
        {[
          ["Livraison", "à domicile à Abidjan"],
          ["Produits d'origine", "NexPOD et NexBAR"],
          ["18+", "vente réservée aux adultes"],
        ].map(([a, b]) => (
          <li key={a}>
            <span className="display text-2xl">{a}</span>
            <span className="ml-2 text-sm text-ink-soft">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
