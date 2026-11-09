"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; info?: string };

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(120),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").max(72),
});

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "E-mail ou mot de passe incorrect." };
  redirect(safeNext(String(form.get("next") ?? "")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = credentials
    .extend({ name: z.string().trim().min(2, "Indiquez votre nom").max(80), adult: z.literal("on", { message: "Confirmez avoir 18 ans ou plus" }) })
    .safeParse({ email: form.get("email"), password: form.get("password"), name: form.get("name"), adult: form.get("adult") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.name } },
  });
  if (error) return { error: "Création du compte impossible. Vérifiez vos informations ou connectez-vous." };
  if (!data.session) return { info: "Compte créé. Confirmez votre adresse e-mail grâce au lien reçu, puis connectez-vous." };
  redirect(safeNext(String(form.get("next") ?? "")));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
