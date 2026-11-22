/** Outils purs (sans accès base) pour les contacts et réseaux sociaux du pied de page : tout lien est validé avant affichage. */

export const NETWORKS = ["instagram", "facebook", "tiktok", "youtube", "x"] as const;
export type Network = (typeof NETWORKS)[number];

const HOSTS: Record<Network, string[]> = {
  instagram: ["instagram.com"],
  facebook: ["facebook.com", "fb.com", "fb.me"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com", "youtu.be"],
  x: ["x.com", "twitter.com"],
};
const BASE: Record<Network, string> = {
  instagram: "https://www.instagram.com/",
  facebook: "https://www.facebook.com/",
  tiktok: "https://www.tiktok.com/@",
  youtube: "https://www.youtube.com/@",
  x: "https://x.com/",
};
export const NETWORK_LABEL: Record<Network, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", x: "X" };

/** Identifiant (@nom) ou lien https du réseau officiel → URL sûre ; sinon null. Jamais de http, de javascript: ni de domaine tiers. */
export function socialUrl(network: Network, raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^@?[A-Za-z0-9._-]{1,50}$/.test(v)) return BASE[network] + v.replace(/^@/, "");
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    const host = u.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
    return HOSTS[network].some((h) => host === h) ? u.toString() : null;
  } catch {
    return null;
  }
}

export type ExtraContact = { label: string; value: string; href: string | null };

/** Lignes « Libellé | valeur » → contacts supplémentaires. Un numéro devient tel:, une adresse e-mail mailto:, un lien https un lien externe. */
export function parseExtra(text: string): { ok: boolean; items: ExtraContact[] } {
  const items: ExtraContact[] = [];
  let ok = true;
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const [label, ...rest] = t.split("|");
    const value = rest.join("|").trim();
    if (!value || !label.trim() || label.trim().length > 60 || value.length > 120) {
      ok = false;
      continue;
    }
    let href: string | null = null;
    if (/^\+?[0-9 ().-]{8,20}$/.test(value)) href = `tel:+${value.replace(/\D/g, "")}`;
    else if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)) href = `mailto:${value}`;
    else if (/^https:\/\//i.test(value)) {
      try {
        const u = new URL(value);
        href = u.username || u.password ? null : u.toString();
      } catch {
        href = null;
      }
    }
    items.push({ label: label.trim(), value, href });
  }
  return { ok: ok && items.length <= 8, items: items.slice(0, 8) };
}

/** Chiffres seuls, pour les liens tel: et wa.me. */
export const digits = (v: string) => v.replace(/\D/g, "");
