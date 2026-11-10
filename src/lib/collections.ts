import type { Product } from "@/lib/catalog";
import { plural } from "@/lib/format";
import type { ProductKind } from "@/lib/media";

export type Tile = {
  key: "nexbar" | "nexpod" | "batteries" | "recharges" | "kits";
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

/** Tuiles de la boutique, construites depuis le catalogue réel : une tuile n'apparaît que si elle a des produits. */
export function buildTiles(products: Product[]): Tile[] {
  const byKind = (k: ProductKind) => products.filter((p) => p.kind === k);
  const tiles: Tile[] = [];

  const bar = byKind("nexbar");
  if (bar.length) {
    const puffs = bar[0].puffs ? `${new Intl.NumberFormat("fr-FR").format(bar[0].puffs)} puffs` : "Puffs jetables";
    tiles.push({
      key: "nexbar",
      title: "NexBAR",
      href: "/boutique/nexbar",
      image: "/products/nexbar-peach-ice.jpg",
      tone: "dark",
      position: "50% 35%",
      eyebrow: plural(variantCount(bar), "saveur"),
      subtitle: `Puffs jetables · ${puffs}`,
    });
  }

  const pod = products.filter((p) => p.categorySlug === "nexpod");
  if (pod.length) {
    tiles.push({
      key: "nexpod",
      title: "NexPOD",
      href: "/boutique/nexpod",
      image: "/products/nexpod-dark.jpg",
      tone: "dark",
      position: "50% 55%",
      eyebrow: plural(pod.length, "produit"),
      subtitle: "Batteries, recharges et kits",
    });
  }

  const sub = (
    key: Tile["key"],
    title: string,
    kind: ProductKind,
    image: string,
    unit: string,
    position = "50% 50%",
  ) => {
    const ps = byKind(kind);
    if (!ps.length) return;
    tiles.push({
      key,
      title,
      href: `/boutique/nexpod#${ps[0].slug}`,
      image,
      tone: "light",
      position,
      eyebrow: plural(variantCount(ps), unit),
      subtitle: "NexPOD",
    });
  };
  sub("batteries", "Batteries", "nexpod_battery", "/products/nexpod-batteries.jpg", "couleur", "50% 50%");
  sub("recharges", "Recharges", "nexpod_refill", "/products/nexpod-mint.jpg", "saveur", "35% 50%");
  sub("kits", "Kits", "nexpod_kit", "/products/nexpod-kit.jpg", "couleur", "50% 45%");

  return tiles;
}
