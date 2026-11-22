import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export const CONTACT_KEYS = [
  "contact_phone", "contact_whatsapp", "contact_email", "contact_address", "contact_hours", "contact_extra",
  "social_instagram", "social_facebook", "social_tiktok", "social_youtube", "social_x",
] as const;
export type Contact = Record<(typeof CONTACT_KEYS)[number], string>;

export const EMPTY_CONTACT: Contact = { contact_phone: "", contact_whatsapp: "", contact_email: "", contact_address: "Abidjan, Côte d'Ivoire", contact_hours: "", contact_extra: "", social_instagram: "", social_facebook: "", social_tiktok: "", social_youtube: "", social_x: "" };

async function readContact(): Promise<Contact> {
  "use cache";
  cacheTag("site-contact");
  const OUT_DEFAULT = { ...EMPTY_CONTACT };
  const out = { ...EMPTY_CONTACT };
  const { data, error } = await createPublicClient().from("site_settings").select("key,value").in("key", [...CONTACT_KEYS]);
  if (error) {
    cacheLife("seconds"); // échec : on ne garde pas les valeurs par défaut en mémoire
    return OUT_DEFAULT;
  }
  cacheLife("hours");
  for (const r of data ?? []) if ((CONTACT_KEYS as readonly string[]).includes(r.key) && typeof r.value === "string" && r.value.trim()) out[r.key as keyof Contact] = r.value.trim();
  return out;
}

/** Contacts affichés dans le pied de page, modifiables depuis l'admin. Ne lève jamais. */
export async function getContact(): Promise<Contact> {
  try {
    return await readContact();
  } catch {
    return EMPTY_CONTACT;
  }
}

