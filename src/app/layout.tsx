import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AgeGateSlot } from "@/components/age-gate-slot";
import { CartProvider } from "@/components/cart-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SCO PUFF — Puffs et e-cigarettes à Abidjan", template: "%s · SCO PUFF" },
  description:
    "SCO PUFF, boutique de puffs et d'e-cigarettes à Abidjan : NexPOD et NexBAR, livraison à domicile. Réservé aux adultes.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f6f2ea",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body className="min-h-svh flex flex-col">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-background"
        >
          Aller au contenu
        </a>
        <CartProvider>{children}</CartProvider>
        <Suspense fallback={null}>
          <AgeGateSlot />
        </Suspense>
      </body>
    </html>
  );
}
