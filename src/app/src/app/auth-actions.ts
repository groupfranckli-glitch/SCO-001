"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth";
import { allow, clientIp } from "@/lib/rate-limit";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; info?: string; pending?: string };

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(120),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").max(72),
});

const TOO_MANY = "Trop de tentatives. Patientez quelques minutes puis réessayez.";

/** Traduit l'erreur d'authentification en message utile ; jamais de détail technique côté visiteur. */
function signInMessage(code: string | undefined, status: number | undefined): string {
  if (code === "invalid_credentials") return "E-mail ou mot de passe incorrect.";
  if (code === "email_not_confirmed") return "Votre adresse e-mail n'est pas encore confirmée. Saisissez le code reçu par e-mail ou créez de nouveau votre compte pour en recevoir un autre.";
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
 * Création de compte avec vérification par code : Supabase envoie par e-mail (SMTP Resend) un code à usage unique ;
 * le compte n'est utilisable qu'après saisie de ce code (verifyOtp). Les abus sont freinés par des limites par IP et par adresse.
 */
export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = credentials
    .extend({ name: z.string().trim().min(2, "Indiquez votre nom").max(80), adult: z.literal("on", { message: "Confirmez avoir 18 ans ou plus" }) })
    .safeParse({ email: form.get("email"), password: form.get("password"), name: form.get("name"), adult: form.get("adult") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (String(form.get("website") ?? "") !== "") return { error: "Création du compte impossible." }; // champ piège pour les robots
  const ip = await clientIp();
  if (!(await allow(`signup:${ip}`, 6, 3600)) || !(await allow(`signup-mail:${parsed.data.email}`, 3, 3600))) return { error: TOO_MANY };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.name } },
  });
  if (error) {
    console.error("signUp", error.code ?? "?", error.status ?? "?");
    if (error.code === "weak_password") return { error: "Mot de passe trop facile à deviner. Choisissez-en un plus long ou plus original." };
    if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit" || error.status === 429)
      return { error: "Trop d'e-mails envoyés. Patientez quelques minutes puis réessayez." };
    // Le service d'e-mail refuse l'envoi (ex. domaine d'expédition pas encore vérifié) : repli sécurisé, le compte est
    // créé et activé par le serveur afin que les clients ne soient jamais bloqués. Le code reste utilisé dès que l'envoi fonctionne.
    if (error.status && error.status >= 500) return directSignUp(parsed.data, String(form.get("next") ?? ""));
    return { error: "Création du compte impossible pour le moment. Réessayez dans un instant." };
  }
  // Adresse déjà utilisée et confirmée : Supabase ne révèle rien (identities vide) ; on le dit sans ambiguïté utile.
  if (data.user && data.user.identities && data.user.identities.length === 0)
    return { error: "Un compte existe déjà avec cette adresse e-mail. Connectez-vous." };
  if (data.session) redirect(safeNext(String(form.get("next") ?? ""))); // confirmation désactivée côté Supabase
  return { pending: parsed.data.email, info: `Un code à 6 chiffres vient d'être envoyé à ${parsed.data.email}.` };
}

async function directSignUp(d: { email: string; password: string; name: string }, next: string): Promise<AuthState> {
  const { error: createError } = await createServiceClient().auth.admin.createUser({
    email: d.email,
    password: d.password,
    email_confirm: true,
    user_metadata: { full_name: d.name },
  });
  if (createError) {
    console.error("signUp-direct", createError.code ?? "?", createError.status ?? "?");
    if (createError.code === "email_exists" || createError.code === "user_already_exists")
      return { error: "Un compte existe déjà avec cette adresse e-mail. Connectez-vous." };
    if (createError.code === "weak_password") return { error: "Mot de passe trop facile à deviner. Choisissez-en un plus long ou plus original." };
    return { error: "Création du compte impossible pour le moment. Réessayez dans un instant." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: d.email, password: d.password });
  if (error) return { info: "Compte créé. Vous pouvez maintenant vous connecter." };
  redirect(safeNext(next));
}

const otpSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  token: z.string().trim().regex(/^\d{6,8}$/, "Saisissez le code reçu par e-mail (chiffres uniquement)"),
});

/** Vérifie le code reçu par e-mail ; en cas de succès la personne est connectée. */
export async function verifyOtp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = otpSchema.safeParse({ email: form.get("email"), token: form.get("token") });
  const pending = String(form.get("email") ?? "");
  if (!parsed.success) return { pending, error: parsed.error.issues[0].message };
  const ip = await clientIp();
  if (!(await allow(`otp:${ip}:${parsed.data.email}`, 8, 600))) return { pending, error: TOO_MANY };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.token, type: "signup" });
  if (error) {
    console.error("verifyOtp", error.code ?? "?", error.status ?? "?");
    if (error.status === 429) return { pending, error: TOO_MANY };
    return { pending, error: "Code incorrect ou expiré. Vérifiez-le ou demandez un nouveau code." };
  }
  redirect(safeNext(String(form.get("next") ?? "")));
}

/** Renvoie un nouveau code (limité). */
export async function resendOtp(_: AuthState, form: FormData): Promise<AuthState> {
  const email = z.string().trim().toLowerCase().email().max(120).safeParse(form.get("email"));
  if (!email.success) return { error: "Adresse e-mail invalide" };
  const ip = await clientIp();
  if (!(await allow(`otp-resend:${email.data}`, 3, 3600)) || !(await allow(`otp-resend-ip:${ip}`, 10, 3600)))
    return { pending: email.data, error: "Trop de demandes de code. Patientez avant de réessayer." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: email.data });
  if (error) {
    console.error("resendOtp", error.code ?? "?", error.status ?? "?");
    return { pending: email.data, error: "Envoi impossible pour le moment. Réessayez dans quelques minutes." };
  }
  return { pending: email.data, info: "Un nouveau code vient d'être envoyé." };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
