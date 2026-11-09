"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export type AdminResult = { ok: true } | { ok: false; error: string };

const ERR: Record<string, string> = {
  order_closed: "Cette commande est déjà clôturée.",
  invalid_transition: "Ce changement de statut n'est pas autorisé.",
  payment_required: "Le paiement mobile n'est pas encore vérifié : livraison impossible.",
  order_not_found: "Commande introuvable.",
  courier_required: "Attribuez d'abord un livreur à cette commande (page Livraisons).",
  invalid_delta: "Quantité invalide.",
  variant_not_found: "Variante introuvable.",
  "23514": "Le stock ne peut pas descendre sous la quantité déjà réservée.",
};
const explain = (message: string, code?: string) =>
  ERR[Object.keys(ERR).find((k) => message.includes(k)) ?? code ?? ""] ?? "Opération impossible.";

const statusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"]),
});

export async function setOrderStatus(input: unknown): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Accès refusé." };
  const p = statusSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Requête invalide." };
  const { error } = await createServiceClient().rpc("admin_set_order_status", {
    p_order: p.data.orderId,
    p_status: p.data.status,
    p_actor: admin.id,
  });
  if (error) return { ok: false, error: explain(error.message, error.code) };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const stockSchema = z.object({
  variantId: z.string().uuid(),
  delta: z.number().int().min(-100000).max(100000).refine((n) => n !== 0, "La quantité ne peut pas être nulle"),
  note: z.string().trim().max(200).optional(),
});

export async function adjustStock(input: unknown): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Accès refusé." };
  const p = stockSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const { error } = await createServiceClient().rpc("admin_adjust_stock", {
    p_variant: p.data.variantId,
    p_delta: p.data.delta,
    p_note: p.data.note ?? null,
    p_actor: admin.id,
  });
  if (error) return { ok: false, error: explain(error.message, error.code) };
  revalidatePath("/admin", "layout");
  revalidatePath("/boutique", "layout");
  return { ok: true };
}
