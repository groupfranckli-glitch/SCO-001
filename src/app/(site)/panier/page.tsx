import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = { title: "Panier" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-8 sm:pt-16">
      <p className="eyebrow">Votre sélection</p>
      <h1 className="display mt-3 text-5xl sm:text-6xl">Panier</h1>
      <CartView />
    </div>
  );
}
