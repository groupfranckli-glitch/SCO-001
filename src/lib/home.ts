import { createPublicClient } from "@/lib/supabase/public";

export const HOME_DEFAULTS = {
  title: "Une sélection de puffs pour des pauses qui vous ressemblent",
  text: "NexPOD et NexBAR : des produits d'origine, un choix clair, livrés chez vous. Réservé aux adultes.",
  cta: "Découvrir la boutique",
};

/** Contenu de la page d'entrée, modifiable depuis l'admin ; valeurs par défaut si la base est vide ou injoignable. */
export async function getHomeContent() {
  try {
    const { data } = await createPublicClient().from("site_settings").select("key,value").in("key", ["home_title", "home_text", "home_cta"]);
    const m = new Map((data ?? []).map((r) => [r.key as string, r.value]));
    const pick = (k: string, d: string) => (typeof m.get(k) === "string" && (m.get(k) as string).trim() ? (m.get(k) as string) : d);
    return { title: pick("home_title", HOME_DEFAULTS.title), text: pick("home_text", HOME_DEFAULTS.text), cta: pick("home_cta", HOME_DEFAULTS.cta) };
  } catch {
    return HOME_DEFAULTS;
  }
}
