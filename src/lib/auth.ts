/** Redirection post-connexion : uniquement un chemin interne (pas d'open redirect). */
export function safeNext(next: string | null | undefined, fallback = "/compte"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
