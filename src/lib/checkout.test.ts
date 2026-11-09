import { describe, expect, it } from "vitest";
import * as c from "@/lib/checkout";

describe("règles de commande", () => {
  it("la majorité est fixée à 18 ans", () => {
    expect(c.MIN_AGE).toBe(18);
  });
  it("refuse une ligne de panier à quantité excessive ou négative", () => {
    expect(c.cartLineSchema.safeParse({ variantId: "00000000-0000-4000-8000-000000000000", quantity: 999 }).success).toBe(false);
    expect(c.cartLineSchema.safeParse({ variantId: "00000000-0000-4000-8000-000000000000", quantity: -1 }).success).toBe(false);
  });
});

import { checkoutSchema, computeTotals, promoDiscount } from "@/lib/checkout";
import { safeNext } from "@/lib/auth";

const base = {
  idempotencyKey: "a".repeat(20),
  lines: [{ variantId: "00000000-0000-4000-8000-000000000000", quantity: 1 }],
  name: "Awa Koné", phone: "07 00 00 00 00", commune: "Cocody", address: "Rue 12, porte 3",
  provider: "cash_on_delivery" as const, ageConfirmed: true as const,
};

describe("validation de la commande", () => {
  it("accepte une commande complète", () => {
    expect(checkoutSchema.safeParse(base).success).toBe(true);
  });
  it("refuse sans confirmation d'âge", () => {
    expect(checkoutSchema.safeParse({ ...base, ageConfirmed: false }).success).toBe(false);
  });
  it("refuse Wave et Orange Money tant qu'ils ne sont pas opérationnels", () => {
    expect(checkoutSchema.safeParse({ ...base, provider: "wave" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, provider: "orange_money" }).success).toBe(false);
  });
  it("refuse téléphone invalide, adresse trop courte et champ piège rempli", () => {
    expect(checkoutSchema.safeParse({ ...base, phone: "abc" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, address: "x" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, website: "spam" }).success).toBe(false);
  });
});

describe("montants", () => {
  it("remise en pourcentage arrondie à l'inférieur, remise fixe plafonnée au sous-total", () => {
    expect(promoDiscount("percent", 10, 19999)).toBe(1999);
    expect(promoDiscount("fixed", 5000, 3000)).toBe(3000);
  });
  it("total = sous-total − remise + livraison", () => {
    expect(computeTotals([{ unitPrice: 10000, quantity: 2 }], 1000, 2000)).toEqual({ subtotal: 20000, deliveryFee: 1000, discount: 2000, total: 19000 });
  });
});

describe("redirection après connexion", () => {
  it("n'accepte que les chemins internes", () => {
    expect(safeNext("/commande")).toBe("/commande");
    expect(safeNext("//evil.example")).toBe("/compte");
    expect(safeNext("https://evil.example")).toBe("/compte");
    expect(safeNext("/\\evil")).toBe("/compte");
    expect(safeNext(null)).toBe("/compte");
  });
});
