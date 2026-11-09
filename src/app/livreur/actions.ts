"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const MSG: Record<string, string> = {
  not_your_delivery: "Cette livraison ne vous est pas attribuée.",
  order_not_ready: "Cette commande n'est pas en cours de livraison.",
  amount_mismatch: "Le montant encaissé doit être égal au total de la commande.",
  not_a_courier: "Accès refusé.",
};

/** Le livreur confirme la remise et l'encaissement ; son identité vient de la session, jamais du formulaire. */
export async function courierDeliver(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = z.object({ orderId: z.string().uuid(), amount: z.number().int().min(0).max(10_000_000) }).safeParse(input);
  if (!p.success) return { ok: false, error: "Montant invalide." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "Connectez-vous." };
  const { error } = await createServiceClient().rpc("courier_deliver", { p_order: p.data.orderId, p_courier: data.user.id, p_amount: p.data.amount });
  if (error) return { ok: false, error: MSG[Object.keys(MSG).find((k) => error.message.includes(k)) ?? ""] ?? "Opération impossible." };
  revalidatePath("/livreur", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
