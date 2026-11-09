"use server";

import { cookies } from "next/headers";
import { AGE_COOKIE } from "@/lib/age";

/** Mémorise la déclaration de majorité (30 jours). La vérification légale reste redemandée à la commande. */
export async function confirmAge(): Promise<void> {
  const jar = await cookies();
  jar.set(AGE_COOKIE, "1", {
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://"),
    path: "/",
  });
}
