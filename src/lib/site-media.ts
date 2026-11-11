import { createPublicClient } from "@/lib/supabase/public";

export { BUCKET, publicUrl } from "@/lib/storage-url";
import { publicUrl } from "@/lib/storage-url";

/** Emplacements d'images de l'interface, modifiables depuis l'admin. `fallback` : image fournie avec le site. */
export const SLOTS = [
  { key: "logo", label: "Logo (fond clair)", hint: "PNG ou WebP transparent conseillé, environ 400 × 120 px.", fallback: null },
  { key: "logo_light", label: "Logo (fond sombre)", hint: "Version claire du logo, utilisée sur la photo d'accueil. Sinon le logo principal est repris.", fallback: null },
  { key: "hero", label: "Photo de la page d'entrée", hint: "Grande photo plein écran, format paysage ou carré, 1600 px de large.", fallback: "/products/nexpod-dark.jpg" },
  { key: "tile_nexbar", label: "Boutique · tuile NexBAR", hint: "Photo de la tuile NexBAR.", fallback: "/products/nexbar-peach-ice.jpg" },
  { key: "tile_nexpod", label: "Boutique · tuile NexPOD", hint: "Photo de la tuile NexPOD.", fallback: "/products/nexpod-dark.jpg" },
  { key: "tile_batteries", label: "Boutique · tuile Batteries", hint: "Photo de la tuile Batteries.", fallback: "/products/nexpod-batteries.jpg" },
  { key: "tile_recharges", label: "Boutique · tuile Recharges", hint: "Photo de la tuile Recharges.", fallback: "/products/nexpod-mint.jpg" },
  { key: "tile_kits", label: "Boutique · tuile Kits", hint: "Photo de la tuile Kits.", fallback: "/products/nexpod-kit.jpg" },
] as const;

export type SlotKey = (typeof SLOTS)[number]["key"];
export const SLOT_KEYS = SLOTS.map((s) => s.key) as [SlotKey, ...SlotKey[]];
export const slotSetting = (k: SlotKey) => `img_${k}`;

export type SlotImages = Record<SlotKey, string | null>;

/** Images personnalisées (URL publique) ou null quand on garde l'image par défaut. Ne lève jamais : le site reste affichable. */
export async function getSlotImages(): Promise<SlotImages> {
  const out = Object.fromEntries(SLOTS.map((s) => [s.key, null])) as SlotImages;
  try {
    const { data } = await createPublicClient().from("site_settings").select("key,value").in("key", SLOTS.map((s) => slotSetting(s.key)));
    for (const r of data ?? []) {
      const slot = SLOTS.find((s) => slotSetting(s.key) === r.key);
      if (slot && typeof r.value === "string" && r.value) out[slot.key] = publicUrl(r.value);
    }
  } catch {
    /* valeurs par défaut */
  }
  return out;
}

export type Banner = { id: string; title: string; alt: string | null; href: string | null; url: string };

export async function getBanners(placement: "home" | "boutique"): Promise<Banner[]> {
  try {
    const { data } = await createPublicClient()
      .from("banners")
      .select("id,title,alt,href,image_path")
      .eq("placement", placement)
      .order("position")
      .order("created_at", { ascending: false });
    return (data ?? []).map((b) => ({ id: b.id, title: b.title, alt: b.alt, href: b.href, url: publicUrl(b.image_path) }));
  } catch {
    return [];
  }
}
