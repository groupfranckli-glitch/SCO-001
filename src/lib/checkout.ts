import { z } from "zod";

export const MIN_AGE = 18;

export function isAdult(birthDate: Date, now: Date = new Date(), minAge = MIN_AGE): boolean {
  const limit = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
  return birthDate <= limit;
}

export const cartLineSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
});

/** Moyens de paiement réellement opérationnels. Wave et Orange Money seront ajoutés avec leur intégration serveur. */
export const ENABLED_PROVIDERS = ["cash_on_delivery"] as const;

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(16).max(80),
  lines: z.array(cartLineSchema).min(1).max(30),
  name: z.string().trim().min(2, "Indiquez votre nom").max(80),
  phone: z.string().trim().regex(/^\+?[0-9 ]{8,20}$/, "Numéro de téléphone invalide"),
  commune: z.string().trim().min(2, "Choisissez votre commune").max(60),
  quartier: z.string().trim().max(80).optional(),
  address: z.string().trim().min(5, "Indiquez une adresse précise").max(200),
  landmark: z.string().trim().max(150).optional(),
  notes: z.string().trim().max(300).optional(),
  promo: z.string().trim().max(30).optional(),
  provider: z.enum(ENABLED_PROVIDERS, { message: "Moyen de paiement indisponible" }),
  ageConfirmed: z.literal(true, { message: "Confirmez avoir 18 ans ou plus" }),
  /** Champ piège anti-robots : un humain ne le voit pas, il doit rester vide. */
  website: z.string().max(0, "Requête refusée").optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Remise : même règle que la fonction SQL create_order (arrondi à l'entier inférieur). */
export function promoDiscount(kind: "percent" | "fixed", value: number, subtotal: number): number {
  return kind === "percent" ? Math.floor((subtotal * value) / 100) : Math.min(value, subtotal);
}

/** Le total est TOUJOURS recalculé côté serveur depuis les prix en base. */
export function computeTotals(lines: { unitPrice: number; quantity: number }[], deliveryFee: number, discount = 0) {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  return { subtotal, deliveryFee, discount, total: subtotal - discount + deliveryFee };
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Reçue",
  confirmed: "Confirmée",
  preparing: "En préparation",
  out_for_delivery: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};
