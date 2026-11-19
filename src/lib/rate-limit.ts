import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

/** Adresse IP du visiteur telle que transmise par l'hébergeur (jamais utilisée pour autre chose que limiter les abus). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "inconnue").trim().slice(0, 64);
}

/** true = autorisé. Compteur tenu en base (partagé entre toutes les instances) ; en cas de panne on laisse passer plutôt que de bloquer les clients. */
export async function allow(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await createServiceClient().rpc("rate_limit_hit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}
