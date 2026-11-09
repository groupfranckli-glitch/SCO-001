"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdmin } from "@/lib/admin";
import { slugify } from "@/lib/stats";
import { createServiceClient } from "@/lib/supabase/server";

export type AdminResult = { ok: true } | { ok: false; error: string };

const optText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());
const optInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || Number.isNaN(v) ? undefined : v), z.number().int().min(min).max(max).optional());
const fcfa = z.number({ message: "Montant invalide" }).int().min(0).max(10_000_000);

const MESSAGES: Record<string, string> = {
  courier_required: "Attribuez d'abord un livreur à cette commande.",
  not_a_courier: "Cette personne n'a pas le rôle livreur.",
  delivery_locked: "La livraison est déjà en cours : le livreur ne peut plus être changé.",
  user_not_found: "Aucun compte avec cet e-mail : la personne doit d'abord s'inscrire.",
  cannot_demote_self: "Vous ne pouvez pas retirer votre propre rôle administrateur.",
  "23505": "Cette valeur existe déjà (code, SKU, commune ou nom).",
  "23514": "Valeur refusée par les règles de la base.",
  "23503": "Élément lié à d'autres données : désactivez-le plutôt que de le supprimer.",
};
const explain = (e: { message: string; code?: string }) =>
  MESSAGES[Object.keys(MESSAGES).find((k) => e.message.includes(k)) ?? e.code ?? ""] ?? "Enregistrement impossible.";

async function run(
  schema: z.ZodType,
  input: unknown,
  action: string,
  entity: string,
  paths: string[],
  fn: (data: never, adminId: string, db: ReturnType<typeof createServiceClient>) => PromiseLike<{ error: { message: string; code?: string } | null } | void>,
): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Accès refusé." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const db = createServiceClient();
  try {
    const res = await fn(parsed.data as never, admin.id, db);
    if (res && res.error) return { ok: false, error: explain(res.error) };
  } catch {
    return { ok: false, error: "Enregistrement impossible." };
  }
  await db.from("audit_log").insert({ actor_id: admin.id, action, entity, details: parsed.data as object });
  for (const p of ["/admin", ...paths]) revalidatePath(p, "layout");
  return { ok: true };
}

// ---------- Catalogue ----------
export async function saveProduct(input: unknown): Promise<AdminResult> {
  return run(
    z.object({ id: z.string().uuid(), name: z.string().trim().min(2).max(80), description: optText(400), puffs: optInt(0, 100000), is_active: z.boolean() }),
    input, "product.update", "product", ["/boutique", "/produit"],
    (d: { id: string; name: string; description?: string; puffs?: number; is_active: boolean }, _a, db) =>
      db.from("products").update({ name: d.name, description: d.description ?? null, puffs: d.puffs ?? null, is_active: d.is_active }).eq("id", d.id),
  );
}

export async function createProduct(input: unknown): Promise<AdminResult> {
  return run(
    z.object({
      categorySlug: z.enum(["nexpod", "nexbar"]),
      kind: z.enum(["nexpod_battery", "nexpod_refill", "nexpod_kit", "nexbar"]),
      name: z.string().trim().min(2).max(80),
      description: optText(400),
      puffs: optInt(0, 100000),
    }),
    input, "product.create", "product", ["/boutique"],
    async (d: { categorySlug: string; kind: string; name: string; description?: string; puffs?: number }, _a, db) => {
      const { data: cat } = await db.from("categories").select("id").eq("slug", d.categorySlug).maybeSingle();
      if (!cat) return { error: { message: "Catégorie introuvable" } };
      const base = slugify(d.name) || "produit";
      let last: { error: { message: string; code?: string } | null } = { error: null };
      for (const slug of [base, `${base}-2`, `${base}-3`]) {
        last = await db.from("products").insert({ category_id: cat.id, slug, name: d.name, kind: d.kind, description: d.description ?? null, puffs: d.puffs ?? null });
        if (!last.error || last.error.code !== "23505") break;
      }
      return last;
    },
  );
}

export async function saveVariant(input: unknown): Promise<AdminResult> {
  return run(
    z.object({ id: z.string().uuid(), color: optText(40), flavor: optText(60), price_fcfa: fcfa, is_active: z.boolean() }),
    input, "variant.update", "variant", ["/boutique", "/produit"],
    (d: { id: string; color?: string; flavor?: string; price_fcfa: number; is_active: boolean }, _a, db) =>
      db.from("product_variants").update({ color: d.color ?? null, flavor: d.flavor ?? null, price_fcfa: d.price_fcfa, is_active: d.is_active }).eq("id", d.id),
  );
}

export async function createVariant(input: unknown): Promise<AdminResult> {
  return run(
    z.object({
      productId: z.string().uuid(),
      sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/, "SKU : 3 à 40 caractères (lettres, chiffres, - ou _)"),
      color: optText(40),
      flavor: optText(60),
      price_fcfa: fcfa,
    }),
    input, "variant.create", "variant", ["/boutique", "/produit"],
    (d: { productId: string; sku: string; color?: string; flavor?: string; price_fcfa: number }, _a, db) =>
      db.from("product_variants").insert({ product_id: d.productId, sku: d.sku, color: d.color ?? null, flavor: d.flavor ?? null, price_fcfa: d.price_fcfa }),
  );
}

// ---------- Codes promo ----------
export async function createPromo(input: unknown): Promise<AdminResult> {
  return run(
    z
      .object({
        code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "Code : 3 à 30 caractères (lettres, chiffres, - ou _)"),
        kind: z.enum(["percent", "fixed"]),
        value: z.number({ message: "Valeur invalide" }).int().min(1).max(10_000_000),
        min_subtotal_fcfa: optInt(0, 10_000_000),
        max_uses: optInt(1, 1_000_000),
        expires_at: optText(10),
      })
      .refine((d) => d.kind !== "percent" || d.value <= 100, { message: "Un pourcentage ne peut pas dépasser 100" })
      .refine((d) => !d.expires_at || /^\d{4}-\d{2}-\d{2}$/.test(d.expires_at), { message: "Date invalide" }),
    input, "promo.create", "promo", [],
    (d: { code: string; kind: string; value: number; min_subtotal_fcfa?: number; max_uses?: number; expires_at?: string }, _a, db) =>
      db.from("promo_codes").insert({
        code: d.code, kind: d.kind, value: d.value, min_subtotal_fcfa: d.min_subtotal_fcfa ?? 0, max_uses: d.max_uses ?? null,
        expires_at: d.expires_at ? `${d.expires_at}T23:59:59+00:00` : null,
      }),
  );
}

export async function setPromoActive(input: unknown): Promise<AdminResult> {
  return run(z.object({ code: z.string().min(3).max(30), is_active: z.boolean() }), input, "promo.toggle", "promo", [],
    (d: { code: string; is_active: boolean }, _a, db) => db.from("promo_codes").update({ is_active: d.is_active }).eq("code", d.code));
}

// ---------- Réglages ----------
export async function saveZone(input: unknown): Promise<AdminResult> {
  return run(z.object({ commune: z.string().min(2).max(60), fee_fcfa: fcfa, is_active: z.boolean() }), input, "zone.update", "zone", ["/commande"],
    (d: { commune: string; fee_fcfa: number; is_active: boolean }, _a, db) => db.from("delivery_zones").update({ fee_fcfa: d.fee_fcfa, is_active: d.is_active }).eq("commune", d.commune));
}

export async function addZone(input: unknown): Promise<AdminResult> {
  return run(z.object({ commune: z.string().trim().min(2).max(60), fee_fcfa: fcfa }), input, "zone.create", "zone", ["/commande"],
    (d: { commune: string; fee_fcfa: number }, _a, db) => db.from("delivery_zones").insert({ commune: d.commune, fee_fcfa: d.fee_fcfa, position: 100 }));
}

export async function saveHome(input: unknown): Promise<AdminResult> {
  return run(
    z.object({ home_title: z.string().trim().min(3).max(140), home_text: z.string().trim().min(3).max(300), home_cta: z.string().trim().min(2).max(40) }),
    input, "settings.home", "settings", ["/"],
    async (d: { home_title: string; home_text: string; home_cta: string }, _a, db) =>
      db.from("site_settings").upsert(Object.entries(d).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }))),
  );
}

// ---------- Livraisons, équipe ----------
export async function assignCourier(input: unknown): Promise<AdminResult> {
  return run(z.object({ orderId: z.string().uuid(), courierId: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable()) }), input, "delivery.assign", "order", [],
    (d: { orderId: string; courierId: string | null }, adminId, db) =>
      db.rpc("admin_assign_courier", { p_order: d.orderId, p_courier: d.courierId, p_actor: adminId }));
}

export async function setRole(input: unknown): Promise<AdminResult> {
  return run(z.object({ email: z.string().trim().email("Adresse e-mail invalide").max(120), role: z.enum(["admin", "courier", "customer"]) }), input, "team.role.request", "profile", [],
    (d: { email: string; role: string }, adminId, db) => db.rpc("admin_set_role", { p_email: d.email, p_role: d.role, p_actor: adminId }));
}
