"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdmin } from "@/lib/admin";
import { MAX_IMAGE_BYTES, sniffImage } from "@/lib/image-validate";
import { BUCKET, SLOT_KEYS, slotSetting } from "@/lib/site-media";
import { createServiceClient } from "@/lib/supabase/server";

export type MediaResult = { ok: true } | { ok: false; error: string };
type Db = ReturnType<typeof createServiceClient>;

const fail = (error: string): MediaResult => ({ ok: false, error });
const uuid = z.string().uuid();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide");
const href = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(300).regex(/^(\/(?!\/)|https:\/\/)/, "Le lien doit commencer par / (page du site) ou https://").optional(),
);
const optDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide").optional(),
);

/** Contrôle l'image reçue (taille, vrai format lu dans les octets) puis la range sous un nom aléatoire. Jamais le nom du visiteur. */
async function storeImage(db: Db, file: unknown, folder: string): Promise<{ path: string } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Choisissez une image." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Image trop lourde (4 Mo maximum)." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { error: "Format refusé : utilisez une image JPEG, PNG, WebP ou AVIF." };
  const path = `${folder}/${randomUUID()}.${kind.ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: kind.mime, cacheControl: "31536000", upsert: false });
  if (error) return { error: "Téléversement impossible." };
  return { path };
}

const removeFile = async (db: Db, path: string | null | undefined) => {
  if (path) await db.storage.from(BUCKET).remove([path]).catch(() => undefined);
};

async function audit(db: Db, adminId: string, action: string, details: object) {
  await db.from("audit_log").insert({ actor_id: adminId, action, entity: "media", details });
}

const refresh = () => {
  for (const p of ["/", "/boutique", "/produit", "/admin"]) revalidatePath(p, "layout");
};

async function guard(fn: (adminId: string, db: Db) => Promise<MediaResult>): Promise<MediaResult> {
  const admin = await getAdmin();
  if (!admin) return fail("Accès refusé.");
  try {
    const r = await fn(admin.id, createServiceClient());
    if (r.ok) refresh();
    return r;
  } catch {
    return fail("Enregistrement impossible.");
  }
}

// ---------- Photos du catalogue ----------
export async function uploadProductPhoto(fd: FormData): Promise<MediaResult> {
  const parsed = z
    .object({ productId: uuid, variantId: z.preprocess((v) => (v ? v : undefined), uuid.optional()), bg: color.default("#ffffff"), fit: z.enum(["contain", "cover"]).default("contain") })
    .safeParse({ productId: fd.get("productId"), variantId: fd.get("variantId") || undefined, bg: fd.get("bg") || undefined, fit: fd.get("fit") || undefined });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;
  return guard(async (adminId, db) => {
    if (d.variantId) {
      const { data: v } = await db.from("product_variants").select("id").eq("id", d.variantId).eq("product_id", d.productId).maybeSingle();
      if (!v) return fail("Variante introuvable.");
    } else {
      const { data: p } = await db.from("products").select("id").eq("id", d.productId).maybeSingle();
      if (!p) return fail("Produit introuvable.");
    }
    const stored = await storeImage(db, fd.get("file"), "products");
    if ("error" in stored) return fail(stored.error);
    const q = db.from("product_images").select("id,storage_path").eq("product_id", d.productId);
    const { data: old } = await (d.variantId ? q.eq("variant_id", d.variantId) : q.is("variant_id", null)).maybeSingle();
    if (old) await db.from("product_images").delete().eq("id", old.id);
    const { error } = await db
      .from("product_images")
      .insert({ product_id: d.productId, variant_id: d.variantId ?? null, storage_path: stored.path, bg: d.bg, fit: d.fit });
    if (error) {
      await removeFile(db, stored.path);
      return fail("Enregistrement impossible.");
    }
    await removeFile(db, old?.storage_path);
    await audit(db, adminId, "media.product_photo", { productId: d.productId, variantId: d.variantId ?? null });
    return { ok: true };
  });
}

export async function removeProductPhoto(input: unknown): Promise<MediaResult> {
  const parsed = z.object({ productId: uuid, variantId: uuid.optional() }).safeParse(input);
  if (!parsed.success) return fail("Demande invalide.");
  const d = parsed.data;
  return guard(async (adminId, db) => {
    const q = db.from("product_images").select("id,storage_path").eq("product_id", d.productId);
    const { data: old } = await (d.variantId ? q.eq("variant_id", d.variantId) : q.is("variant_id", null)).maybeSingle();
    if (!old) return { ok: true };
    await db.from("product_images").delete().eq("id", old.id);
    await removeFile(db, old.storage_path);
    await audit(db, adminId, "media.product_photo_removed", d);
    return { ok: true };
  });
}

// ---------- Logo et images de l'interface ----------
export async function uploadSlotImage(fd: FormData): Promise<MediaResult> {
  const key = z.enum(SLOT_KEYS).safeParse(fd.get("key"));
  if (!key.success) return fail("Emplacement inconnu.");
  return guard(async (adminId, db) => {
    const stored = await storeImage(db, fd.get("file"), "site");
    if ("error" in stored) return fail(stored.error);
    const setting = slotSetting(key.data);
    const { data: old } = await db.from("site_settings").select("value").eq("key", setting).maybeSingle();
    const { error } = await db.from("site_settings").upsert({ key: setting, value: stored.path, updated_at: new Date().toISOString() });
    if (error) {
      await removeFile(db, stored.path);
      return fail("Enregistrement impossible.");
    }
    if (typeof old?.value === "string") await removeFile(db, old.value);
    await audit(db, adminId, "media.slot", { key: key.data });
    return { ok: true };
  });
}

export async function removeSlotImage(input: unknown): Promise<MediaResult> {
  const key = z.object({ key: z.enum(SLOT_KEYS) }).safeParse(input);
  if (!key.success) return fail("Emplacement inconnu.");
  return guard(async (adminId, db) => {
    const setting = slotSetting(key.data.key);
    const { data: old } = await db.from("site_settings").select("value").eq("key", setting).maybeSingle();
    await db.from("site_settings").delete().eq("key", setting);
    if (typeof old?.value === "string") await removeFile(db, old.value);
    await audit(db, adminId, "media.slot_removed", { key: key.data.key });
    return { ok: true };
  });
}

// ---------- Bannières publicitaires ----------
const bannerFields = {
  title: z.string().trim().min(1, "Donnez un titre à la bannière").max(80),
  alt: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(160).optional()),
  href,
  placement: z.enum(["home", "boutique"]),
  starts_at: optDate,
  ends_at: optDate,
};
const startIso = (d?: string) => (d ? `${d}T00:00:00Z` : null);
const endIso = (d?: string) => (d ? `${d}T23:59:59Z` : null);

export async function createBanner(fd: FormData): Promise<MediaResult> {
  const parsed = z.object(bannerFields).safeParse({
    title: fd.get("title"), alt: fd.get("alt"), href: fd.get("href"), placement: fd.get("placement"),
    starts_at: fd.get("starts_at"), ends_at: fd.get("ends_at"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;
  if (d.starts_at && d.ends_at && d.ends_at < d.starts_at) return fail("La date de fin précède la date de début.");
  return guard(async (adminId, db) => {
    const stored = await storeImage(db, fd.get("file"), "banners");
    if ("error" in stored) return fail(stored.error);
    const { error } = await db.from("banners").insert({
      title: d.title, alt: d.alt ?? null, href: d.href ?? null, placement: d.placement,
      starts_at: startIso(d.starts_at), ends_at: endIso(d.ends_at), image_path: stored.path,
    });
    if (error) {
      await removeFile(db, stored.path);
      return fail("Enregistrement impossible.");
    }
    await audit(db, adminId, "banner.create", { title: d.title, placement: d.placement });
    return { ok: true };
  });
}

export async function saveBanner(input: unknown): Promise<MediaResult> {
  const parsed = z
    .object({ id: uuid, ...bannerFields, position: z.number().int().min(0).max(999).default(0), is_active: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;
  if (d.starts_at && d.ends_at && d.ends_at < d.starts_at) return fail("La date de fin précède la date de début.");
  return guard(async (adminId, db) => {
    const { error } = await db.from("banners").update({
      title: d.title, alt: d.alt ?? null, href: d.href ?? null, placement: d.placement, position: d.position,
      is_active: d.is_active, starts_at: startIso(d.starts_at), ends_at: endIso(d.ends_at),
    }).eq("id", d.id);
    if (error) return fail("Enregistrement impossible.");
    await audit(db, adminId, "banner.update", { id: d.id });
    return { ok: true };
  });
}

export async function deleteBanner(input: unknown): Promise<MediaResult> {
  const parsed = z.object({ id: uuid }).safeParse(input);
  if (!parsed.success) return fail("Demande invalide.");
  return guard(async (adminId, db) => {
    const { data: old } = await db.from("banners").select("image_path").eq("id", parsed.data.id).maybeSingle();
    const { error } = await db.from("banners").delete().eq("id", parsed.data.id);
    if (error) return fail("Suppression impossible.");
    await removeFile(db, old?.image_path);
    await audit(db, adminId, "banner.delete", { id: parsed.data.id });
    return { ok: true };
  });
}
