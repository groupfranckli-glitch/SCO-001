export const BUCKET = "site-media";

/** URL publique d'un fichier du bucket (lecture seule pour tout le monde ; l'écriture n'est possible que par le serveur). */
export function publicUrl(path: string): string {
  return `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;
}
