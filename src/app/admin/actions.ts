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

const bulkSchema = z.object({
  items: z
    .array(z.object({ variantId: z.string().uuid(), target: z.number().int().min(0).max(100000) }))
    .min(1)
    .max(200),
});

/** Fixe le stock physique de plusieurs variantes d'un coup (écart calculé côté serveur, chaque écart est historisé). */
export async function setStockBulk(input: unknown): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Accès refusé." };
  const p = bulkSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Quantités invalides (nombres entiers de 0 à 100 000)." };
  const db = createServiceClient();
  const { data: rows, error: e0 } = await db.from("product_variants").select("id,stock_on_hand").in("id", p.data.items.map((i) => i.variantId));
  if (e0) return { ok: false, error: "Opération impossible." };
  const current = new Map((rows ?? []).map((r) => [r.id as string, r.stock_on_hand as number]));
  for (const it of p.data.items) {
    const now = current.get(it.variantId);
    if (now === undefined) return { ok: false, error: "Variante introuvable." };
    const delta = it.target - now;
    if (delta === 0) continue;
    const { error } = await db.rpc("admin_adjust_stock", { p_variant: it.variantId, p_delta: delta, p_note: "Mise à jour du stock", p_actor: admin.id });
    if (error) return { ok: false, error: explain(error.message, error.code) };
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/boutique", "layout");
  revalidatePath("/produit", "layout");
  return { ok: true };
}
