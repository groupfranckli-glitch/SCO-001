import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { formatFcfa } from "@/lib/format";
import { resolveMedia } from "@/lib/media";

export function ProductCard({ product }: { product: Product }) {
  const first = product.variants.find((v) => v.available > 0) ?? product.variants[0];
  const media = resolveMedia(product, first);
  return (
    <Link href={`/produit/${product.slug}`} data-testid="product-card" className="group block">
      <div className="relative aspect-square overflow-hidden rounded-[1.75rem]" style={{ background: media.bg }}>
        <Image
          src={media.src}
          alt={`${product.name}${first ? ` — ${first.label}` : ""}`}
          fill
          sizes="(min-width: 768px) 33vw, 50vw"
          className={`transition duration-500 group-hover:scale-[1.03] ${media.fit === "cover" ? "object-cover" : "object-contain"}`}
        />
      </div>
      <p className="eyebrow mt-4">{product.categoryName}</p>
      <h3 className="display mt-1 text-2xl">{product.name}</h3>
      {product.priceFrom !== null && (
        <p className="mt-1 text-sm text-ink-soft">
          {product.variants.length > 1 ? "À partir de " : ""}
          {formatFcfa(product.priceFrom)}
        </p>
      )}
    </Link>
  );
}
