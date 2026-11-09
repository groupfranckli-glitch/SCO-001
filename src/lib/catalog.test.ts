import { describe, expect, it } from "vitest";
import { availableQty, mapProduct, matchesQuery } from "@/lib/catalog";

const row = {
  id: "p", slug: "s", name: "NexBAR 10K", kind: "nexbar" as const, description: "Puff jetable", puffs: 10000,
  categories: { slug: "nexbar", name: "NexBAR" },
  product_variants: [
    { id: "a", sku: "A", color: null, flavor: "Peach Ice", price_fcfa: 10000, stock_on_hand: 5, stock_reserved: 5, is_active: true },
    { id: "b", sku: "B", color: null, flavor: "Double Apple", price_fcfa: 9000, stock_on_hand: 4, stock_reserved: 1, is_active: true },
    { id: "c", sku: "C", color: null, flavor: "Masquée", price_fcfa: 1, stock_on_hand: 9, stock_reserved: 0, is_active: false },
  ],
};

describe("catalogue", () => {
  it("le stock vendable est le stock physique moins le réservé, jamais négatif", () => {
    expect(availableQty(10, 3)).toBe(7);
    expect(availableQty(2, 5)).toBe(0);
  });
  it("ignore les variantes inactives et calcule le prix minimum", () => {
    const p = mapProduct(row);
    expect(p.variants.map((v) => v.label)).toEqual(["Double Apple", "Peach Ice"]);
    expect(p.priceFrom).toBe(9000);
    expect(p.inStock).toBe(true);
  });
  it("un produit sans stock vendable est hors stock", () => {
    const p = mapProduct({ ...row, product_variants: [row.product_variants[0]] });
    expect(p.inStock).toBe(false);
  });
  it("la recherche ignore accents et casse, et exige tous les mots", () => {
    const p = mapProduct(row);
    expect(matchesQuery(p, "PEACH")).toBe(true);
    expect(matchesQuery(p, "peach apple")).toBe(true);
    expect(matchesQuery(p, "mint")).toBe(false);
    expect(matchesQuery(p, "  ")).toBe(false);
  });
});
