import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-ink-soft">
            Puffs et e-cigarettes, livrés à domicile à Abidjan. Une sélection courte, des produits d&apos;origine.
          </p>
        </div>
        <nav aria-label="Pied de page" className="text-sm">
          <p className="eyebrow">Explorer</p>
          <ul className="mt-4 space-y-2">
            <li>
              <Link href="/boutique" className="hover:underline">
                Boutique
              </Link>
            </li>
            <li>
              <Link href="/boutique/nexpod" className="hover:underline">
                NexPOD
              </Link>
            </li>
            <li>
              <Link href="/boutique/nexbar" className="hover:underline">
                NexBAR
              </Link>
            </li>
            <li>
              <Link href="/compte" className="hover:underline">
                Espace client
              </Link>
            </li>
          </ul>
        </nav>
        <div className="text-sm">
          <p className="eyebrow">Bon à savoir</p>
          <ul className="mt-4 space-y-2 text-ink-soft">
            <li>Livraison à domicile à Abidjan</li>
            <li>Vente réservée aux personnes de 18 ans et plus</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line px-4 py-5 text-center text-xs text-ink-soft sm:px-8">
        La nicotine crée une forte dépendance. Produits réservés aux adultes. © SCO PUFF
      </div>
    </footer>
  );
}
