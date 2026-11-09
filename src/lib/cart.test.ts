import { describe, expect, it } from "vitest";
import { MAX_LINE_QTY, cartCount, cartReducer, cartSubtotal, parseStoredCart, type CartLine } from "@/lib/cart";

const line = (o: Partial<CartLine> = {}): Omit<CartLine, "quantity"> => ({
  variantId: "v1", productSlug: "s", productName: "N", label: "L", unitPrice: 10000, maxQty: 50, ...o,
});

describe("panier", () => {
  it("ajoute, cumule et plafonne à 20 par ligne", () => {
    let s = cartReducer([], { type: "add", line: line(), quantity: 15 });
    s = cartReducer(s, { type: "add", line: line(), quantity: 15 });
    expect(s[0].quantity).toBe(MAX_LINE_QTY);
  });
  it("plafonne au stock connu", () => {
    const s = cartReducer([], { type: "add", line: line({ maxQty: 3 }), quantity: 9 });
    expect(s[0].quantity).toBe(3);
  });
  it("retire la ligne à quantité 0 et n'ajoute rien si le stock est nul", () => {
    expect(cartReducer([], { type: "add", line: line({ maxQty: 0 }), quantity: 1 })).toEqual([]);
    const s = cartReducer([], { type: "add", line: line(), quantity: 1 });
    expect(cartReducer(s, { type: "setQty", variantId: "v1", quantity: 0 })).toEqual([]);
  });
  it("calcule total et nombre d'articles", () => {
    let s = cartReducer([], { type: "add", line: line(), quantity: 2 });
    s = cartReducer(s, { type: "add", line: line({ variantId: "v2", unitPrice: 6000 }), quantity: 1 });
    expect(cartCount(s)).toBe(3);
    expect(cartSubtotal(s)).toBe(26000);
  });
  it("rejette un stockage falsifié", () => {
    expect(parseStoredCart("pas du json")).toEqual([]);
    expect(parseStoredCart(JSON.stringify([{ variantId: "x", productSlug: "s", productName: "n", label: "l", unitPrice: -5, quantity: 1, maxQty: 1 }]))).toEqual([]);
    expect(parseStoredCart(JSON.stringify([{ ...line(), quantity: 999 }]))).toEqual([]);
    expect(parseStoredCart(JSON.stringify([{ ...line(), quantity: 1, image: "https://evil.example/x.png" }]))).toEqual([]);
    expect(parseStoredCart(JSON.stringify([{ ...line(), quantity: 2, image: "/products/a.jpg" }]))).toHaveLength(1);
  });
});
