import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { ProductCard } from "@/components/product-card";
import { searchProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Recherche" };

async function Results({ searchParams }: { searchParams: PageProps<"/recherche">["searchParams"] }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? "").trim().slice(0, 80);

  if (!q) {
    return <p className="mt-10 text-ink-soft">Saisissez une saveur, une couleur ou un nom de produit.</p>;
  }
  const results = await searchProducts(q);
  return (
    <>
      <p className="mt-4 text-ink-soft" data-testid="search-summary">
        {results.length} résultat{results.length > 1 ? "s" : ""} pour « {q} »
      </p>
      {results.length === 0 ? (
        <p className="mt-10 text-ink-soft">Rien ne correspond. Essayez « mint », « bleu » ou « ice ».</p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/recherche">) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-8 sm:pt-16">
      <p className="eyebrow">Recherche</p>
      <h1 className="display mt-3 text-5xl sm:text-6xl">Résultats</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
