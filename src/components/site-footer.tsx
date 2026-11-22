import Link from "next/link";
import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { SocialIcon } from "@/components/social-icons";
import { EMPTY_CONTACT, getContact, type Contact } from "@/lib/contact";
import { digits, NETWORK_LABEL, NETWORKS, parseExtra, socialUrl } from "@/lib/contact-links";


async function FooterWithContact() {
  return <FooterBody c={await getContact()} />;
}

/** Pied de page : les contacts (modifiables dans l'admin) sont lus en cache ; en repli, le pied de page s'affiche sans eux. */
export function SiteFooter() {
  return (
    <Suspense fallback={<FooterBody c={EMPTY_CONTACT} />}>
      <FooterWithContact />
    </Suspense>
  );
}

function FooterBody({ c }: { c: Contact }) {
  const wa = digits(c.contact_whatsapp);
  const tel = digits(c.contact_phone);
  const socials = NETWORKS.flatMap((n) => {
    const href = socialUrl(n, c[`social_${n}` as keyof Contact]);
    return href ? [{ n, href }] : [];
  });
  const extras = parseExtra(c.contact_extra).items;
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
                Kit NexPOD
              </Link>
            </li>
            <li>
              <Link href="/boutique/batteries" className="hover:underline">
                Batteries
              </Link>
            </li>
            <li>
              <Link href="/boutique/recharges" className="hover:underline">
                Recharges
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
            {extras.map((x) => (
              <li key={`${x.label}-${x.value}`} className="text-ink-soft">
                {x.label} :{" "}
                {x.href ? (
                  <a href={x.href} {...(x.href.startsWith("https") ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})} className="break-all text-ink underline-offset-4 hover:underline">
                    {x.value}
                  </a>
                ) : (
                  <span className="text-ink">{x.value}</span>
                )}
              </li>
            ))}
          </ul>
          {socials.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Réseaux sociaux" data-testid="footer-socials">
              {socials.map(({ n, href }) => (
                <li key={n}>
                  <a href={href} target="_blank" rel="noopener noreferrer nofollow" aria-label={NETWORK_LABEL[n]} title={NETWORK_LABEL[n]} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-background transition hover:border-ink hover:bg-ink hover:text-background">
                    <SocialIcon network={n} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </address>
      </div>
      <div className="border-t border-line px-4 py-5 text-center text-xs text-ink-soft sm:px-8">
        La nicotine crée une forte dépendance. Produits réservés aux adultes. © SCO PUFF
      </div>
    </footer>
  );
}
