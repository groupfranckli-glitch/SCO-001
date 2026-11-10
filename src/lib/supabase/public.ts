import { createClient } from "@supabase/supabase-js";

/**
 * Client anonyme sans session ni cookies, pour la lecture des données publiques (catalogue, contenu).
 * Reste soumis à la RLS : il ne voit que ce que le rôle `anon` a le droit de lire.
 */
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
