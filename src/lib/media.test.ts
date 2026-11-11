import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { mediaFor, variantMedia } from "@/lib/media";
import { buildTiles } from "@/lib/collections";
import type { Product } from "@/lib/catalog";

describe("photos produit", () => {
  it("associe une photo à chaque couleur de batterie, sans tenir compte de la casse", () => {
    for (const color of ["Noir", "Bleu", "Violet", "Rouge", "ROUGE"]) {
      expect(variantMedia("nexpod_battery", { color, flavor: null })).not.toBeNull();
    }
  });
  it("retombe sur la photo de gamme pour une saveur inconnue", () => {
    expect(mediaFor("nexbar", { color: null, flavor: "Inconnue" }).src).toBe("/products/nexbar-range.jpg");
  });
  it("tous les fichiers référencés existent", () => {
    const keys = ["Strawberry Kiwi", "Blueberry Raspberry", "Energy Ice", "Double Apple", "Watermelon Ice", "Peach Ice", "Grape Apple"];
    for (const f of keys) expect(existsSync(`public${mediaFor("nexbar", { color: null, flavor: f }).src}`)).toBe(true);
    for (const c of ["Noir", "Bleu", "Violet", "Rouge"]) expect(existsSync(`public${mediaFor("nexpod_battery", { color: c, flavor: null }).src}`)).toBe(true);
    for (const f of ["Mint", "Three Melons"]) expect(existsSync(`public${mediaFor("nexpod_refill", { color: null, flavor: f }).src}`)).toBe(true);
  });
});

const prod = (kind: Product["kind"], cat: string): Product => ({
  id: kind, slug: kind, name: kind, kind, description: null, puffs: 10000, categorySlug: cat, categoryName: cat,
  variants: [{ id: "v", sku: "s", color: "Noir", flavor: null, label: "Noir", priceFcfa: 1, available: 1, photo: null }], priceFrom: 1, inStock: true, photo: null,
});

describe("tuiles de la boutique", () => {
  it("n'affiche que les tuiles ayant des produits", () => {
    expect(buildTiles([]).length).toBe(0);
    expect(buildTiles([prod("nexbar", "nexbar")]).map((t) => t.key)).toEqual(["nexbar"]);
  });
  it("construit les cinq tuiles pour le catalogue complet", () => {
    const keys = buildTiles([prod("nexpod_battery", "nexpod"), prod("nexpod_refill", "nexpod"), prod("nexpod_kit", "nexpod"), prod("nexbar", "nexbar")]).map((t) => t.key);
    expect(keys).toEqual(["nexbar", "nexpod", "batteries", "recharges", "kits"]);
  });
});
