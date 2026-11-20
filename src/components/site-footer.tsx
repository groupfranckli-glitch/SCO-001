import Link from "next/link";
import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { digits, getContact, type Contact } from "@/lib/contact";

const NO_CONTACT: Contact = { contact_phone: "", contact_whatsapp: "", contact_email: "", contact_address: "Abidjan, Côte d'Ivoire", contact_hours: "" };

async function FooterWithContact() {
  return <FooterBody c={await getContact()} />;
}

/** Pied de page : les contacts (modifiables dans l'admin) sont lus en cache ; en repli, le pied de page s'affiche sans eux. */
export function SiteFooter() {
  return (
    <Suspense fallback={<FooterBody c={NO_CONTACT} />}>
      <FooterWithContact />
    </Suspense>
  );
}

function FooterBody({ c }: { c: Contact }) {
  const wa = digits(c.contact_whatsapp);
  const tel = digits(c.contact_phone);
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <BrandLogo />
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
            <li>Paiement à la livraison</li>
            <li>Produits d&apos;origine</li>
            <li>Vente réservée aux personnes de 18 ans et plus</li>
          </ul>
        </div>
        <address className="card h-fit self-start p-5 text-sm not-italic" aria-label="Contacts" data-testid="footer-contact">
          <p className="eyebrow">Nous joindre</p>
          <ul className="mt-4 space-y-2.5">
            {wa.length >= 8 && (
              <li>
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-4 hover:underline">
                  WhatsApp · {c.contact_whatsapp}
                </a>
              </li>
            )}
            {tel.length >= 8 && (
              <li>
                <a href={`tel:+${tel}`} className="underline-offset-4 hover:underline">
                  Appeler · {c.contact_phone}
                </a>
              </li>
            )}
            {c.contact_email && (
              <li>
                <a href={`mailto:${c.contact_email}`} className="break-all underline-offset-4 hover:underline">
                  {c.contact_email}
                </a>
              </li>
            )}
            <li className="text-ink-soft">{c.contact_address}</li>
            {c.contact_hours && <li className="text-ink-soft">{c.contact_hours}</li>}
          </ul>
        </address>
      </div>
      <div className="border-t border-line px-4 py-5 text-center text-xs text-ink-soft sm:px-8">
        La nicotine crée une forte dépendance. Produits réservés aux adultes. © SCO PUFF
      </div>
    </footer>
  );
}
