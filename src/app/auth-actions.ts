"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth";
import { allow, clientIp } from "@/lib/rate-limit";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; info?: string };

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(120),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").max(72),
});

const TOO_MANY = "Trop de tentatives. Patientez quelques minutes puis réessayez.";

/** Traduit l'erreur d'authentification en message utile ; jamais de détail technique côté visiteur. */
function signInMessage(code: string | undefined, status: number | undefined): string {
  if (code === "invalid_credentials") return "E-mail ou mot de passe incorrect.";
  if (code === "email_not_confirmed") return "Votre adresse e-mail n'est pas encore confirmée. Contactez-nous pour activer votre compte.";
  if (code === "over_request_rate_limit" || status === 429) return TOO_MANY;
  if (status && status >= 500) return "Le service de connexion est momentanément indisponible. Réessayez dans un instant.";
  return "Connexion impossible. Vérifiez vos informations et réessayez.";
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const ip = await clientIp();
  if (!(await allow(`signin:${ip}:${parsed.data.email}`, 8, 600)) || !(await allow(`signin-ip:${ip}`, 40, 600))) return { error: TOO_MANY };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    console.error("signIn", error.code ?? "?", error.status ?? "?");
    return { error: signInMessage(error.code, error.status) };
  }
  redirect(safeNext(String(form.get("next") ?? "")));
}

/**
 * Création de compte : le compte est créé côté serveur et directement activé, puis la personne est connectée.
 * L'envoi d'un e-mail de confirmation n'est plus nécessaire (le service d'e-mail intégré à Supabase est très limité
 * et bloquait les nouveaux clients). Les abus sont freinés par la limite de création par adresse IP.
 */
export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = credentials
    .extend({ name: z.string().trim().min(2, "Indiquez votre nom").max(80), adult: z.literal("on", { message: "Confirmez avoir 18 ans ou plus" }) })
    .safeParse({ email: form.get("email"), password: form.get("password"), name: form.get("name"), adult: form.get("adult") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (String(form.get("website") ?? "") !== "") return { error: "Création du compte impossible." }; // champ piège pour les robots
  const ip = await clientIp();
  if (!(await allow(`signup:${ip}`, 6, 3600))) return { error: TOO_MANY };

  const { error: createError } = await createServiceClient().auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.name },
  });
  if (createError) {
    console.error("signUp", createError.code ?? "?", createError.status ?? "?");
    if (createError.code === "email_exists" || createError.code === "user_already_exists")
      return { error: "Un compte existe déjà avec cette adresse e-mail. Connectez-vous." };
    if (createError.code === "weak_password") return { error: "Mot de passe trop facile à deviner. Choisissez-en un plus long ou plus original." };
    return { error: "Création du compte impossible pour le moment. Réessayez dans un instant." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { info: "Compte créé. Vous pouvez maintenant vous connecter." };
  redirect(safeNext(String(form.get("next") ?? "")));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
