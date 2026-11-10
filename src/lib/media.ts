/**
 * Photos produit fournies par le client, servies depuis /public/products.
 * Solution transitoire : au lot « Administration », ces associations passeront en base
 * (Supabase Storage + table product_images) pour être modifiables sans toucher au code.
 */
export type ProductKind = "nexpod_battery" | "nexpod_refill" | "nexpod_kit" | "nexbar";

export type Media = {
  src: string;
  /** Couleur de fond du cadre, identique au fond de la photo pour un rendu sans bordure visible. */
  bg: string;
  fit: "contain" | "cover";
};

const WHITE = "#ffffff";
const BLACK = "#050505";
const m = (file: string, bg: string, fit: Media["fit"] = "contain"): Media => ({
  src: `/products/${file}.jpg`,
  bg,
  fit,
});

export const norm = (s: string | null | undefined): string =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const NEXBAR: Record<string, Media> = {
  "strawberry kiwi": m("nexbar-strawberry-kiwi", WHITE),
  "blueberry raspberry": m("nexbar-blueberry-raspberry", WHITE),
  "energy ice": m("nexbar-energy-ice", WHITE),
  "double apple": m("nexbar-double-apple", BLACK),
  "watermelon ice": m("nexbar-watermelon-ice", WHITE),
  "peach ice": m("nexbar-peach-ice", "#f4c9c3", "cover"),
  "grape apple": m("nexbar-grape-apple", "#7a63c9", "cover"),
};

const BATTERY: Record<string, Media> = {
  noir: m("nexpod-battery-noir", WHITE),
  bleu: m("nexpod-battery-bleu", WHITE),
  violet: m("nexpod-battery-violet", WHITE),
  rouge: m("nexpod-battery-rouge", BLACK),
};

const REFILL: Record<string, Media> = {
  mint: m("nexpod-mint", WHITE),
  "three melons": m("nexpod-three-melons", BLACK),
};

const FALLBACK: Record<ProductKind, Media> = {
  nexbar: m("nexbar-range", WHITE),
  nexpod_battery: m("nexpod-batteries", WHITE),
  nexpod_refill: m("nexpod-mint", WHITE),
  nexpod_kit: m("nexpod-kit", WHITE),
};

type VariantLike = { color: string | null; flavor: string | null };

/** Photo propre à la variante (saveur ou couleur), ou null si on n'en a pas. */
export function variantMedia(kind: ProductKind, v: VariantLike): Media | null {
  const key = norm(v.flavor ?? v.color);
  if (kind === "nexbar") return NEXBAR[key] ?? null;
  if (kind === "nexpod_battery") return BATTERY[key] ?? null;
  if (kind === "nexpod_refill") return REFILL[key] ?? null;
  return null;
}

/** Photo à afficher : celle de la variante, sinon celle de la gamme. */
export function mediaFor(kind: ProductKind, v?: VariantLike | null): Media {
  return (v && variantMedia(kind, v)) || FALLBACK[kind];
}

/** Caractéristiques affichées sous la description, d'après les emballages et visuels fournis. */
export const SPECS: Record<ProductKind, string[]> = {
  nexbar: [
    "10 000 puffs",
    "Écrans de niveau d'e-liquide et de batterie",
    "Flux d'air réglable · résistance nexMESH",
    "Recharge USB‑C",
  ],
  nexpod_battery: ["Technologie mesh coil nexM", "Compatible avec les recharges NexPOD"],
  nexpod_refill: ["Recharge préremplie, prête à l'emploi", "Jusqu'à 5 000 puffs · sel de nicotine 50 mg"],
  nexpod_kit: ["Batterie + recharge préremplie", "Jusqu'à 5 000 puffs · sel de nicotine 50 mg"],
};
