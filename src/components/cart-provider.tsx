"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { cartCount, cartReducer, cartSubtotal, parseStoredCart, type CartAction, type CartLine } from "@/lib/cart";

const KEY = "scopuff-cart-v1";

type State = { ready: boolean; lines: CartLine[] };

function reducer(state: State, action: CartAction): State {
  if (action.type === "hydrate") return { ready: true, lines: action.lines };
  return { ...state, lines: cartReducer(state.lines, action) };
}

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  add: (line: Omit<CartLine, "quantity">, quantity: number) => void;
  setQty: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartLine[] {
  try {
    return parseStoredCart(window.localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { ready: false, lines: [] });

  useEffect(() => {
    dispatch({ type: "hydrate", lines: readStorage() });
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) dispatch({ type: "hydrate", lines: readStorage() });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!state.ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state.lines));
    } catch {
      /* stockage indisponible (navigation privée) : le panier reste en mémoire */
    }
  }, [state]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      count: cartCount(state.lines),
      subtotal: cartSubtotal(state.lines),
      ready: state.ready,
      add: (line, quantity) => dispatch({ type: "add", line, quantity }),
      setQty: (variantId, quantity) => dispatch({ type: "setQty", variantId, quantity }),
      remove: (variantId) => dispatch({ type: "remove", variantId }),
      clear: () => dispatch({ type: "clear" }),
    }),
    [state],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}
