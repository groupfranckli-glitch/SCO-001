import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="contenu" className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="eyebrow">Erreur 404</p>
        <h1 className="display mt-3 text-5xl">Page introuvable</h1>
        <p className="mt-5 text-ink-soft">Cette page n&apos;existe pas ou n&apos;est plus disponible.</p>
        <Link href="/boutique" className="pill mt-8">
          Retour à la boutique
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
