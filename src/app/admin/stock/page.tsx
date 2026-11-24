import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { StockGrid } from "@/components/admin/stock-grid";
import { PageSkeleton } from "@/components/page-skeleton";
import { addVariantWithStock, createProduct } from "@/app/admin/modules-actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Stock" };

const MOVE: Record<string, string> = { restock: "Réapprovisionnement", reserve: "Réservation", release: "Libération", sale: "Vente", adjustment: "Ajustement", return: "Retour" };

type Prod = { id: string; name: string; kind: string; position: number; variants: { id: string; sku: string; color: string | null; flavor: string | null; price_fcfa: number; stock_on_hand: number; stock_reserved: number; is_active: boolean }[] };

const SECTION: Record<string, { help: string; add: { name: string; label: string; placeholder: string }[]; fill: string }> = {
  nexpod_kit: {
    help: "Une ligne par saveur. La couleur n'est que celle du boîtier : les mêmes saveurs sont proposées dans toutes les couleurs.",
    add: [{ name: "flavor", label: "Nouvelle saveur (créée pour toutes les couleurs)", placeholder: "ex. Mango Ice" }, { name: "color", label: "Nouvelle couleur (créée pour toutes les saveurs)", placeholder: "ex. Vert" }],
    fill: "Saveur ou couleur",
  },
  nexpod_battery: { help: "Une ligne par couleur. Les batteries n'ont pas de saveur.", add: [{ name: "color", label: "Nouvelle couleur", placeholder: "ex. Vert" }], fill: "Couleur" },
  nexpod_refill: { help: "Une ligne par saveur. Les recharges n'ont pas de couleur.", add: [{ name: "flavor", label: "Nouvelle saveur", placeholder: "ex. Mango Ice" }], fill: "Saveur" },
  nexbar: { help: "Une ligne par saveur.", add: [{ name: "flavor", label: "Nouvelle saveur", placeholder: "ex. Mango Ice" }], fill: "Saveur" },
};

async function Content() {
  const supabase = await createClient();
  const [{ data: prods }, { data: moves }] = await Promise.all([
    supabase.from("products").select("id,name,kind,categories(position),product_variants(id,sku,color,flavor,price_fcfa,stock_on_hand,stock_reserved,is_active)"),
    supabase.from("stock_movements").select("id,movement_type,quantity,note,created_at,product_variants(sku)").order("created_at", { ascending: false }).limit(15),
  ]);
  const products: Prod[] = (prods ?? [])
    .map((p) => ({
      id: p.id as string,
      name: p.name as string,
      kind: p.kind as string,
      position: (p.categories as unknown as { position: number } | null)?.position ?? 99,
      variants: ((p.product_variants as unknown as Prod["variants"]) ?? []).slice().sort((a, b) => `${a.color ?? ""}${a.flavor ?? ""}`.localeCompare(`${b.color ?? ""}${b.flavor ?? ""}`)),
    }))
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));

  return (
    <>
      <h1 className="display text-5xl">Stock</h1>
      <p className="mt-3 max-w-xl text-sm text-ink-soft">
        Une section par page de la boutique. Modifiez les quantités puis cliquez sur « Enregistrer » : le site est mis à jour immédiatement. Chaque changement est historisé.
      </p>
      <nav aria-label="Sections du stock" className="mt-5 flex flex-wrap gap-2">
        {products.map((p) => (
          <a key={p.id} href={`#p-${p.id}`} className="rounded-full border border-line px-4 py-2 text-sm">{p.name}</a>
        ))}
      </nav>

      {products.map((p) => {
        const cfg = SECTION[p.kind] ?? SECTION.nexbar;
        const live = p.variants.filter((v) => v.is_active);
        const off = p.variants.filter((v) => !v.is_active);
        const rows = live.map((v) => ({ id: v.id, color: v.color, flavor: v.flavor, onHand: v.stock_on_hand, reserved: v.stock_reserved }));
        const price = p.variants[0]?.price_fcfa ?? 0;
        const total = live.reduce((n, v) => n + Math.max(v.stock_on_hand - v.stock_reserved, 0), 0);
        return (
          <section key={p.id} id={`p-${p.id}`} data-testid="stock-section" data-kind={p.kind} className="mt-10 scroll-mt-24 rounded-3xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="display text-3xl">{p.name}</h2>
              <p className="text-sm text-ink-soft">{live.length} option{live.length > 1 ? "s" : ""} · {total} vendable{total > 1 ? "s" : ""}</p>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">{cfg.help}</p>

            <div className="mt-5">
              {rows.length ? <StockGrid key={rows.map((r) => `${r.id}:${r.onHand}`).join(",")} rows={rows} byFlavor={p.kind === "nexpod_kit"} /> : <p className="text-sm text-ink-soft">Aucune option pour le moment : ajoutez-en une ci-dessous.</p>}
            </div>

            <div className="mt-6 border-t border-line pt-5" data-testid="add-variant">
              <h3 className="text-base font-bold">Ajouter</h3>
              {p.kind === "nexpod_kit" ? (
                <div className="mt-3 grid gap-4 lg:grid-cols-2">
                  <ActionForm action={addVariantWithStock} submit="Ajouter la saveur" resetOnSuccess hidden={{ productId: p.id }} fields={[{ name: "flavor", label: cfg.add[0].label, required: true, placeholder: cfg.add[0].placeholder, wide: true }, { name: "price_fcfa", label: "Prix FCFA", type: "number", required: true, min: 0, value: price }, { name: "stock", label: "Stock par couleur", type: "number", required: true, min: 0, value: 0 }]} />
                  <ActionForm action={addVariantWithStock} submit="Ajouter la couleur" resetOnSuccess hidden={{ productId: p.id }} fields={[{ name: "color", label: cfg.add[1].label, required: true, placeholder: cfg.add[1].placeholder, wide: true }, { name: "price_fcfa", label: "Prix FCFA", type: "number", required: true, min: 0, value: price }, { name: "stock", label: "Stock par saveur", type: "number", required: true, min: 0, value: 0 }]} />
                </div>
              ) : (
                <div className="mt-3">
                  <ActionForm action={addVariantWithStock} submit="Ajouter" resetOnSuccess hidden={{ productId: p.id }} fields={[{ name: cfg.add[0].name, label: cfg.add[0].label, required: true, placeholder: cfg.add[0].placeholder, wide: true }, { name: "price_fcfa", label: "Prix FCFA", type: "number", required: true, min: 0, value: price }, { name: "stock", label: "Stock de départ", type: "number", required: true, min: 0, value: 0 }]} />
                </div>
              )}
              <p className="mt-2 text-xs text-ink-soft">Le prix est à saisir ; modifiez ou supprimez une option dans Catalogue. Elle apparaît tout de suite dans la boutique.</p>
            </div>

            {off.length > 0 && (
              <details className="mt-5 text-sm">
                <summary className="cursor-pointer text-ink-soft">{off.length} option{off.length > 1 ? "s" : ""} désactivée{off.length > 1 ? "s" : ""} (masquée{off.length > 1 ? "s" : ""} de la boutique)</summary>
                <ul className="mt-2 text-ink-soft">
                  {off.map((v) => (
                    <li key={v.id}>{[v.color, v.flavor].filter(Boolean).join(" · ")} — {v.stock_on_hand} en stock</li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        );
      })}

      <details className="mt-10 rounded-3xl border border-line bg-surface p-5">
        <summary className="cursor-pointer text-base font-bold">Ajouter un nouveau produit</summary>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">Créez d&apos;abord le produit ; il apparaîtra ensuite comme une section de cette page pour y ajouter ses options.</p>
        <div className="mt-4" data-testid="add-product">
          <ActionForm
            action={createProduct}
            submit="Créer le produit"
            resetOnSuccess
            fields={[
              { name: "categorySlug", label: "Page de la boutique", type: "select", options: [{ value: "nexpod", label: "Kit NexPOD" }, { value: "batteries", label: "Batteries NexPOD" }, { value: "recharges", label: "Recharges NexPOD" }, { value: "nexbar", label: "NexBAR" }] },
              { name: "kind", label: "Type", type: "select", options: [{ value: "nexpod_battery", label: "Batterie (couleurs)" }, { value: "nexpod_refill", label: "Recharge (saveurs)" }, { value: "nexpod_kit", label: "Kit (couleurs × saveurs)" }, { value: "nexbar", label: "NexBAR (saveurs)" }] },
              { name: "name", label: "Nom", required: true, wide: true },
              { name: "description", label: "Description", wide: true },
              { name: "puffs", label: "Bouffées", type: "number" },
            ]}
          />
        </div>
      </details>

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
