export const MAX_LINE_QTY = 20;

export type CartLine = {
  variantId: string;
  productSlug: string;
  productName: string;
  label: string;
  unitPrice: number;
  quantity: number;
  /** Stock vendable connu au moment de l'ajout (indicatif : le serveur revalide au checkout). */
  maxQty: number;
  /** Miniature (chemin local /products/...). */
  image?: string;
};

export type CartAction =
  | { type: "hydrate"; lines: CartLine[] }
  | { type: "add"; line: Omit<CartLine, "quantity">; quantity: number }
  | { type: "setQty"; variantId: string; quantity: number }
  | { type: "remove"; variantId: string }
  | { type: "clear" };

const cap = (qty: number, maxQty: number) => Math.max(0, Math.min(qty, MAX_LINE_QTY, maxQty));

export function cartReducer(state: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case "hydrate":
      return action.lines;
    case "add": {
      const existing = state.find((l) => l.variantId === action.line.variantId);
      if (existing) {
        const quantity = cap(existing.quantity + action.quantity, action.line.maxQty);
        return state.map((l) => (l.variantId === existing.variantId ? { ...l, ...action.line, quantity } : l));
      }
      const quantity = cap(action.quantity, action.line.maxQty);
      return quantity > 0 ? [...state, { ...action.line, quantity }] : state;
    }
    case "setQty":
      return state
        .map((l) => (l.variantId === action.variantId ? { ...l, quantity: cap(action.quantity, l.maxQty) } : l))
        .filter((l) => l.quantity > 0);
    case "remove":
      return state.filter((l) => l.variantId !== action.variantId);
    case "clear":
      return [];
  }
}

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

/** Relecture défensive du localStorage : toute donnée malformée est ignorée. */
export function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (l): l is CartLine =>
        !!l &&
        typeof l.variantId === "string" &&
        typeof l.productSlug === "string" &&
        typeof l.productName === "string" &&
        typeof l.label === "string" &&
        Number.isInteger(l.unitPrice) &&
        l.unitPrice >= 0 &&
        Number.isInteger(l.quantity) &&
        l.quantity > 0 &&
        l.quantity <= MAX_LINE_QTY &&
        Number.isInteger(l.maxQty) &&
        (l.image === undefined || (typeof l.image === "string" && l.image.startsWith("/products/"))),
    );
  } catch {
    return [];
  }
}
