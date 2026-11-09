import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { ProductSheet } from "@/components/product-sheet";
import { getProduct } from "@/lib/catalog";

async function Content({ params }: { params: PageProps<"/produit/[slug]">["params"] }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-8 sm:pt-14">
      <nav aria-label="Fil d'Ariane" className="mb-8 text-sm text-ink-soft">
        <Link href="/boutique" className="hover:underline">
          Boutique
        </Link>{" "}
        /{" "}
        <Link href={`/boutique/${product.categorySlug}`} className="hover:underline">
          {product.categoryName}
        </Link>
      </nav>
      <ProductSheet product={product} priority as="h1" />
    </div>
  );
}

export default function ProductPage({ params }: PageProps<"/produit/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
