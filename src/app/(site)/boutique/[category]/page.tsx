import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { ProductSheet } from "@/components/product-sheet";
import { getCategories, getProducts } from "@/lib/catalog";

const INTRO: Record<string, string> = {
  nexpod: "Un système pod : une batterie rechargeable, des recharges préremplies, ou un kit prêt à l'emploi.",
  nexbar: "La puff jetable 10 000 puffs, avec écrans de suivi et flux d'air réglable. À choisir selon la saveur.",
};

export async function generateMetadata({ params }: PageProps<"/boutique/[category]">): Promise<Metadata> {
  const { category } = await params;
  return { title: category.toUpperCase().replace("NEX", "Nex") };
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
