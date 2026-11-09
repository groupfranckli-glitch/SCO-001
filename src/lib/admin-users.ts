import { createServiceClient } from "@/lib/supabase/server";

/** E-mails des comptes (table auth, inaccessible via l'API publique) : lecture serveur réservée aux pages admin. */
export async function emailMap(): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  try {
    const { data } = await createServiceClient().auth.admin.listUsers({ page: 1, perPage: 500 });
    for (const u of data?.users ?? []) if (u.email) m.set(u.id, u.email);
  } catch {
    /* e-mails indisponibles : on affiche sans */
  }
  return m;
}
