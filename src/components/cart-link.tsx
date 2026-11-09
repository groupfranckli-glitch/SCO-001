"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";

export function CartLink() {
  const { count, ready } = useCart();
  const shown = ready ? count : 0;
  return (
    <Link
      href="/panier"
      aria-label={shown > 0 ? `Panier, ${shown} article${shown > 1 ? "s" : ""}` : "Panier"}
      className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-black/5"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M5.5 8.5h13l-1 11h-11l-1-11Z" strokeLinejoin="round" />
        <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" strokeLinecap="round" />
      </svg>
      {shown > 0 && (
        <span
          data-testid="cart-count"
          className="absolute right-0 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent-ink px-1 text-[10px] font-medium text-white"
        >
          {shown}
        </span>
      )}
    </Link>
  );
}
