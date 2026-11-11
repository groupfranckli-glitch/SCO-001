import { createPublicClient } from "@/lib/supabase/public";
import { norm, type Media, type ProductKind } from "@/lib/media";
import { publicUrl } from "@/lib/storage-url";

export type Variant = {
  id: string;
  sku: string;
  color: string | null;
  flavor: string | null;
  label: string;
  priceFcfa: number;
  /** Quantité réellement vendable : stock physique moins stock réservé. */
  available: number;
  /** Photo téléversée depuis l'admin pour cette variante (sinon photo du produit ou image fournie). */
  photo: Media | null;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  kind: ProductKind;
  description: string | null;
  puffs: number | null;
  categorySlug: string;
  categoryName: string;
  variants: Variant[];
  priceFrom: number | null;
  inStock: boolean;
  photo: Media | null;
};

type ImageRow = { variant_id: string | null; storage_path: string; bg: string; fit: "contain" | "cover" };
const toMedia = (i: ImageRow): Media => ({ src: publicUrl(i.storage_path), bg: i.bg, fit: i.fit });

type Row = {
  id: string;
  slug: string;
  name: string;
  kind: ProductKind;
  description: string | null;
  puffs: number | null;
  categories: { slug: string; name: string } | null;
  product_variants: {
    id: string;
    sku: string;
    color: string | null;
    flavor: string | null;
    price_fcfa: number;
    stock_on_hand: number;
    stock_reserved: number;
    is_active: boolean;
  }[];
  product_images?: ImageRow[] | null;
};

export function availableQty(onHand: number, reserved: number): number {
  return Math.max(onHand - reserved, 0);
}

export function mapProduct(r: Row): Product {
  const images = r.product_images ?? [];
  const byVariant = new Map(images.filter((i) => i.variant_id).map((i) => [i.variant_id as string, toMedia(i)]));
  const productImage = images.find((i) => !i.variant_id);
  const variants: Variant[] = r.product_variants
    .filter((v) => v.is_active)
    .map((v) => ({
      id: v.id,
      sku: v.sku,
      color: v.color,
      flavor: v.flavor,
      label: v.color ?? v.flavor ?? r.name,
      priceFcfa: v.price_fcfa,
      available: availableQty(v.stock_on_hand, v.stock_reserved),
      photo: byVariant.get(v.id) ?? null,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    kind: r.kind,
    description: r.description,
    puffs: r.puffs,
    categorySlug: r.categories?.slug ?? "",
    categoryName: r.categories?.name ?? "",
    variants,
    priceFrom: variants.length ? Math.min(...variants.map((v) => v.priceFcfa)) : null,
    inStock: variants.some((v) => v.available > 0),
    photo: productImage ? toMedia(productImage) : null,
  };
}

const SELECT =
  "id,slug,name,kind,description,puffs,categories(slug,name),product_variants(id,sku,color,flavor,price_fcfa,stock_on_hand,stock_reserved,is_active),product_images(variant_id,storage_path,bg,fit)";

/** Ordre d'affichage : gamme NexPOD (batterie, recharge, kit) puis NexBAR. */
const KIND_ORDER: Record<ProductKind, number> = { nexpod_battery: 0, nexpod_refill: 1, nexpod_kit: 2, nexbar: 3 };

export async function getProducts(categorySlug?: string): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("products").select(SELECT).eq("is_active", true);
  if (error) throw new Error(`Catalogue indisponible : ${error.message}`);
  const all = (data as unknown as Row[]).map(mapProduct).sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  return categorySlug ? all.filter((p) => p.categorySlug === categorySlug) : all;
}

export async function getProduct(slug: string): Promise<Product | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("products").select(SELECT).eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error) throw new Error(`Produit indisponible : ${error.message}`);
  return data ? mapProduct(data as unknown as Row) : null;
}

export async function getCategories() {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("categories").select("slug,name,position").eq("is_active", true).order("position");
  if (error) throw new Error(`Catégories indisponibles : ${error.message}`);
  return data as { slug: string; name: string; position: number }[];
}

/** Recherche simple sur le nom, la description, les saveurs et les couleurs. */
export function matchesQuery(p: Product, query: string): boolean {
  const q = norm(query);
  if (!q) return false;
  const haystack = norm([p.name, p.description, p.categoryName, ...p.variants.map((v) => v.label)].join(" "));
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

export async function searchProducts(query: string): Promise<Product[]> {
  const all = await getProducts();
  return all.filter((p) => matchesQuery(p, query));
}

export type HomeSection = {
  id: string;
  section_type: string;
  title: string | null;
  body: string | null;
  cta_label: string | null;
  cta_href: string | null;
};

export async function getHomeSections(): Promise<HomeSection[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("home_sections")
    .select("id,section_type,title,body,cta_label,cta_href")
    .eq("is_active", true)
    .order("position");
  return (data ?? []) as HomeSection[];
}

