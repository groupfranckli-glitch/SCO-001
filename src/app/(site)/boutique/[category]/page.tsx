import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { ProductSheet } from "@/components/product-sheet";
import { getCategories, getProducts } from "@/lib/catalog";

const INTRO: Record<string, string> = {
  nexpod: "Le kit NexPOD : une batterie et une recharge, prêts à l'emploi. Choisissez une ou plusieurs couleurs.",
  batteries: "La batterie rechargeable NexPOD, en quatre couleurs. Compatible avec toutes les recharges NexPOD.",
  recharges: "Les recharges préremplies qui s'insèrent dans la batterie NexPOD. Choisissez une ou plusieurs saveurs.",
  nexbar: "La puff jetable 10 000 puffs, avec écrans de suivi et flux d'air réglable. À choisir selon la saveur.",
};
const TITLES: Record<string, string> = { nexpod: "Kit NexPOD", batteries: "Batteries NexPOD", recharges: "Recharges NexPOD", nexbar: "NexBAR" };

export async function generateMetadata({ params }: PageProps<"/boutique/[category]">): Promise<Metadata> {
  const { category } = await params;
  return { title: TITLES[category] ?? "Boutique" };
}

async function Content({ params }: { params: PageProps<"/boutique/[category]">["params"] }) {
  const { category } = await params;
  const [cats, products] = await Promise.all([getCategories(), getProducts(category)]);
  const cat = cats.find((c) => c.slug === category);
  if (!cat) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-8 sm:pt-16">
      <nav aria-label="Fil d'Ariane" className="text-sm text-ink-soft">
        <Link href="/boutique" className="hover:underline">
          Boutique
        </Link>{" "}
        / <span className="text-ink">{cat.name}</span>
      </nav>
      <h1 className="display mt-4 text-6xl sm:text-7xl">{cat.name}</h1>
      <p className="mt-5 max-w-xl text-ink-soft">{INTRO[cat.slug] ?? ""}</p>

      {products.length === 0 ? (
        <p className="mt-16 text-ink-soft">Aucun produit disponible pour le moment.</p>
      ) : (
        <div className="mt-16 space-y-24 sm:space-y-32">
          {products.map((p, i) => (
            <ProductSheet key={p.id} product={p} index={i} priority={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryPage({ params }: PageProps<"/boutique/[category]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
