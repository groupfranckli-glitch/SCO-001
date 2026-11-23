import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { StockAdjust } from "@/components/admin/stock-adjust";
import { PageSkeleton } from "@/components/page-skeleton";
import { addVariantWithStock, createProduct } from "@/app/admin/modules-actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Stock" };

const MOVE: Record<string, string> = { restock: "Réapprovisionnement", reserve: "Réservation", release: "Libération", sale: "Vente", adjustment: "Ajustement", return: "Retour" };

async function Content() {
  const supabase = await createClient();
  const [{ data: variants }, { data: moves }, { data: products }] = await Promise.all([
    supabase.from("product_variants").select("id,sku,color,flavor,stock_on_hand,stock_reserved,is_active,products(name)").order("sku"),
    supabase.from("stock_movements").select("id,movement_type,quantity,note,created_at,product_variants(sku)").order("created_at", { ascending: false }).limit(15),
    supabase.from("products").select("id,name,kind").order("name"),
  ]);

  return (
    <>
      <h1 className="display text-5xl">Stock</h1>
      <p className="mt-3 max-w-xl text-sm text-ink-soft">
        Le stock vendable est le stock physique moins les quantités réservées par les commandes en cours. Chaque ajustement est historisé.
      </p>

      <div className="mt-8 overflow-x-auto rounded-3xl border border-line bg-surface">
        <table className="w-full min-w-[44rem] text-left text-sm" data-testid="stock-table">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-ink-soft">
            <tr>
              <th className="px-5 py-3 font-normal">Variante</th>
              <th className="px-3 py-3 text-right font-normal">Physique</th>
              <th className="px-3 py-3 text-right font-normal">Réservé</th>
              <th className="px-3 py-3 text-right font-normal">Vendable</th>
              <th className="px-5 py-3 font-normal">Ajuster</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(variants ?? []).map((v) => {
              const name = (v.products as unknown as { name: string } | null)?.name ?? "";
              const label = [v.color, v.flavor].filter(Boolean).join(" · ");
              const available = Math.max(v.stock_on_hand - v.stock_reserved, 0);
              return (
                <tr key={v.id} data-testid="stock-row">
                  <td className="px-5 py-3">
                    <span className="block">{name} · {label}</span>
                    <span className="text-xs text-ink-soft">{v.sku}{v.is_active ? "" : " · inactif"}</span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{v.stock_on_hand}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{v.stock_reserved}</td>
                  <td className={`px-3 py-3 text-right tabular-nums ${available === 0 ? "text-danger" : ""}`}>{available}</td>
                  <td className="px-5 py-3"><StockAdjust variantId={v.id} label={`${name} ${label}`} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="display mt-12 text-3xl">Ajouter une saveur ou une couleur</h2>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">
        Choisissez le produit, indiquez la saveur (NexBAR, recharges, kit) et/ou la couleur (batteries, kit), le prix et le stock de départ. Elle apparaît tout de suite dans la boutique.
      </p>
      <div className="mt-4 rounded-3xl border border-line bg-surface p-5" data-testid="add-variant">
        <ActionForm
          action={addVariantWithStock}
          submit="Ajouter"
          resetOnSuccess
          fields={[
            { name: "productId", label: "Produit", type: "select", options: (products ?? []).map((p) => ({ value: p.id, label: p.name })), wide: true },
            { name: "flavor", label: "Saveur (ex. Mango Ice)" },
            { name: "color", label: "Couleur (ex. Vert)" },
            { name: "price_fcfa", label: "Prix FCFA", type: "number", required: true, min: 0 },
            { name: "stock", label: "Stock de départ", type: "number", required: true, min: 0, value: 0 },
          ]}
        />
      </div>

      <h2 className="display mt-12 text-3xl">Ajouter un nouveau produit</h2>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">Créez d&apos;abord le produit, puis ajoutez ses saveurs ou couleurs avec le formulaire ci-dessus.</p>
      <div className="mt-4 rounded-3xl border border-line bg-surface p-5" data-testid="add-product">
        <ActionForm
          action={createProduct}
          submit="Créer le produit"
          resetOnSuccess
          fields={[
            { name: "categorySlug", label: "Page de la boutique", type: "select", options: [{ value: "nexpod", label: "Kit NexPOD" }, { value: "batteries", label: "Batteries NexPOD" }, { value: "recharges", label: "Recharges NexPOD" }, { value: "nexbar", label: "NexBAR" }] },
            { name: "kind", label: "Type", type: "select", options: [{ value: "nexpod_battery", label: "NexPOD batterie" }, { value: "nexpod_refill", label: "NexPOD recharge" }, { value: "nexpod_kit", label: "NexPOD kit" }, { value: "nexbar", label: "NexBAR" }] },
            { name: "name", label: "Nom", required: true, wide: true },
            { name: "description", label: "Description", wide: true },
            { name: "puffs", label: "Bouffées", type: "number" },
          ]}
        />
      </div>

      <h2 className="display mt-12 text-3xl">Derniers mouvements</h2>
      {!moves || moves.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">Aucun mouvement pour le moment.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-3xl border border-line bg-surface text-sm">
          {moves.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <span>
                {MOVE[m.movement_type] ?? m.movement_type} · {(m.product_variants as unknown as { sku: string } | null)?.sku}
                {m.note ? <span className="text-ink-soft"> — {m.note}</span> : null}
              </span>
              <span className="tabular-nums text-ink-soft">
                {m.quantity > 0 ? "+" : ""}{m.quantity} · {new Date(m.created_at).toLocaleString("fr-FR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function AdminStock() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}
