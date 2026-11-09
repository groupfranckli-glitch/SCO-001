"use server";

import { checkoutSchema, promoDiscount } from "@/lib/checkout";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type PlaceOrderResult = { ok: true; number: string } | { ok: false; error: string };

const ERRORS: Record<string, string> = {
  insufficient_stock: "Un article n'est plus disponible en quantité suffisante. Modifiez votre panier.",
  variant_unavailable: "Un article de votre panier n'est plus en vente. Modifiez votre panier.",
  zone_unavailable: "Nous ne livrons pas encore cette commune.",
  promo_invalid: "Ce code promo n'est pas valable.",
  rate_limited: "Trop de commandes en peu de temps. Réessayez dans quelques minutes.",
  invalid_quantity: "Quantité invalide.",
  empty_cart: "Votre panier est vide.",
};

export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Connectez-vous pour finaliser votre commande." };

  try {
    const service = createServiceClient();
    const { data, error } = await service.rpc("create_order", {
      p_customer: auth.user.id,
      p_key: d.idempotencyKey,
      p_lines: d.lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
      p_name: d.name,
      p_phone: d.phone.replace(/\s+/g, ""),
      p_commune: d.commune,
      p_quartier: d.quartier ?? null,
      p_address: d.address,
      p_landmark: d.landmark ?? null,
      p_notes: d.notes ?? null,
      p_provider: d.provider,
      p_promo: d.promo ?? null,
    });
    if (error) {
      const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
      return { ok: false, error: key ? ERRORS[key] : "La commande n'a pas pu être enregistrée. Réessayez." };
    }
    const row = (data as { r_order_number: string }[])[0];
    return { ok: true, number: row.r_order_number };
  } catch {
    return { ok: false, error: "Service momentanément indisponible. Réessayez dans un instant." };
  }
}

export type PromoResult = { ok: true; code: string; discount: number } | { ok: false; error: string };

/** Aperçu de remise. Le calcul définitif est refait en base à la création de la commande. */
export async function checkPromo(code: string, subtotal: number): Promise<PromoResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Connectez-vous pour utiliser un code promo." };
  const clean = code.trim().toUpperCase().slice(0, 30);
  if (clean.length < 3 || !Number.isFinite(subtotal) || subtotal <= 0) return { ok: false, error: "Code promo invalide." };
  try {
    const { data } = await createServiceClient().from("promo_codes").select("*").eq("code", clean).maybeSingle();
    const p = data as
      | { kind: "percent" | "fixed"; value: number; min_subtotal_fcfa: number; max_uses: number | null; used_count: number; expires_at: string | null; is_active: boolean }
      | null;
    const valid =
      p &&
      p.is_active &&
      (!p.expires_at || new Date(p.expires_at) > new Date()) &&
      (p.max_uses === null || p.used_count < p.max_uses) &&
      subtotal >= p.min_subtotal_fcfa;
    if (!p || !valid) return { ok: false, error: "Ce code promo n'est pas valable." };
    return { ok: true, code: clean, discount: promoDiscount(p.kind, p.value, subtotal) };
  } catch {
    return { ok: false, error: "Vérification impossible pour le moment." };
  }
}
