import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Utilisateur administrateur courant, ou null (utilisé par les actions serveur). */
export async function getAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("role,full_name").eq("id", data.user.id).maybeSingle();
  return profile?.role === "admin" ? { id: data.user.id, name: profile.full_name as string | null, email: data.user.email ?? "" } : null;
}

/** Garde de page : visiteur → connexion ; connecté non admin → 404 (on ne révèle pas l'existence de l'espace). */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/connexion?next=/admin");
  const admin = await getAdmin();
  if (!admin) notFound();
  return admin;
}
