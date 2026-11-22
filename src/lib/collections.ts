import type { Product } from "@/lib/catalog";
import { plural } from "@/lib/format";
import type { ProductKind } from "@/lib/media";

export type Tile = {
  key: "nexbar" | "nexpod" | "batteries" | "recharges";
  title: string;
  href: string;
  image: string;
  /** « dark » : texte blanc sur voile sombre ; « light » : texte encre sur voile clair. */
  tone: "dark" | "light";
  position: string;
  eyebrow: string;
  subtitle: string;
};

const variantCount = (ps: Product[]) => ps.reduce((n, p) => n + p.variants.length, 0);

/** Tuiles de la boutique, construites depuis le catalogue réel : une tuile n'apparaît que si elle a des produits,
 *  et mène à la page de sa propre catégorie (jamais à une page qui mélange tous les produits). */
export function buildTiles(products: Product[]): Tile[] {
  const byKind = (k: ProductKind) => products.filter((p) => p.kind === k);
  const tiles: Tile[] = [];
  const add = (key: Tile["key"], title: string, kind: ProductKind, image: string, tone: Tile["tone"], position: string, unit: string, subtitle: (ps: Product[]) => string) => {
    const ps = byKind(kind);
    if (!ps.length) return;
    tiles.push({ key, title, href: `/boutique/${ps[0].categorySlug}`, image, tone, position, eyebrow: plural(variantCount(ps), unit), subtitle: subtitle(ps) });
  };

  add("nexbar", "NexBAR", "nexbar", "/products/nexbar-peach-ice.jpg", "dark", "50% 35%", "saveur", (ps) =>
    `Puffs jetables · ${ps[0].puffs ? `${new Intl.NumberFormat("fr-FR").format(ps[0].puffs)} puffs` : "10 000 puffs"}`);
  add("nexpod", "Kit NexPOD", "nexpod_kit", "/products/nexpod-kit.jpg", "dark", "50% 45%", "couleur", () => "Batterie et recharge, prêt à l'emploi");
  add("batteries", "Batteries", "nexpod_battery", "/products/nexpod-batteries.jpg", "light", "50% 50%", "couleur", () => "Batterie NexPOD rechargeable");
  add("recharges", "Recharges", "nexpod_refill", "/products/nexpod-mint.jpg", "light", "35% 50%", "saveur", () => "Recharges pour batterie NexPOD");

  return tiles;
}
