import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { AdminPage, Title, card } from "@/components/admin/page-shell";
import { createProduct, createVariant, saveProduct, saveVariant } from "@/app/admin/modules-actions";
import { removeProductPhoto, uploadProductPhoto } from "@/app/admin/media-actions";
import { ImageUpload } from "@/components/admin/image-upload";
import { publicUrl } from "@/lib/storage-url";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Catalogue" };

type V = { id: string; sku: string; color: string | null; flavor: string | null; price_fcfa: number; is_active: boolean };

async function Content() {
  const supabase = await createClient();
  const [{ data: products }, { data: images }] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,kind,description,puffs,is_active,product_variants(id,sku,color,flavor,price_fcfa,is_active)")
      .order("created_at"),
    supabase.from("product_images").select("product_id,variant_id,storage_path,bg"),
  ]);
  const photo = (productId: string, variantId?: string) =>
    (images ?? []).find((i) => i.product_id === productId && (i.variant_id ?? undefined) === variantId);

  return (
    <>
      <Title hint="Modifiez les produits, leurs variantes (couleurs, saveurs) et leurs prix. Un produit ou une variante désactivé disparaît de la boutique sans être supprimé.">Catalogue</Title>
      <div className="mt-8 space-y-6" data-testid="catalogue">
        {(products ?? []).map((p) => {
          const variants = (p.product_variants as unknown as V[]) ?? [];
          const flavorBased = p.kind === "nexbar";
          return (
            <section key={p.id} className={`${card} p-5`} data-testid="product-admin">
              <ActionForm
                action={saveProduct}
                hidden={{ id: p.id }}
                submit="Enregistrer le produit"
                fields={[
                  { name: "name", label: "Nom", value: p.name, required: true, wide: true },
                  { name: "description", label: "Description", value: p.description, wide: true },
                  { name: "puffs", label: "Bouffées", type: "number", value: p.puffs },
                  { name: "is_active", label: "Visible en boutique", type: "checkbox", value: p.is_active },
                ]}
              />
              <h3 className="mt-6 text-xs uppercase tracking-wider text-ink-soft">Photo du produit</h3>
              <div className="mt-3" data-testid="product-photo">
                <ImageUpload
                  action={uploadProductPhoto}
                  hidden={{ productId: p.id }}
                  extra={[{ name: "bg", label: "Fond", type: "color", value: photo(p.id)?.bg ?? "#ffffff" }]}
                  current={photo(p.id) ? publicUrl(photo(p.id)!.storage_path) : null}
                  currentBg={photo(p.id)?.bg}
                  onRemove={{ action: removeProductPhoto, payload: { productId: p.id } }}
                />
                <p className="mt-2 text-xs text-ink-soft">Utilisée quand une variante n&apos;a pas sa propre photo. Sans photo ici, l&apos;image fournie avec le site reste affichée.</p>
              </div>
              <h3 className="mt-6 text-xs uppercase tracking-wider text-ink-soft">Variantes</h3>
              <ul className="mt-3 divide-y divide-line">
                {variants.map((v) => (
                  <li key={v.id} className="py-3" data-testid="variant-admin">
                    <p className="mb-2 text-xs text-ink-soft">{v.sku}</p>
                    <ActionForm
                      action={saveVariant}
                      hidden={{ id: v.id }}
                      submit="OK"
                      fields={[
                        flavorBased ? { name: "flavor", label: "Saveur", value: v.flavor } : { name: "color", label: "Couleur", value: v.color },
                        { name: "price_fcfa", label: "Prix FCFA", type: "number", value: v.price_fcfa, required: true, min: 0 },
                        { name: "is_active", label: "Actif", type: "checkbox", value: v.is_active },
                      ]}
                    />
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-ink-soft underline underline-offset-4">
                        {photo(p.id, v.id) ? "Photo de cette variante ✓" : "Photo de cette variante"}
                      </summary>
                      <div className="mt-3">
                        <ImageUpload
                          action={uploadProductPhoto}
                          hidden={{ productId: p.id, variantId: v.id }}
                          extra={[{ name: "bg", label: "Fond", type: "color", value: photo(p.id, v.id)?.bg ?? "#ffffff" }]}
                          current={photo(p.id, v.id) ? publicUrl(photo(p.id, v.id)!.storage_path) : null}
                          currentBg={photo(p.id, v.id)?.bg}
                          onRemove={{ action: removeProductPhoto, payload: { productId: p.id, variantId: v.id } }}
                        />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm underline underline-offset-4">Ajouter une variante</summary>
                <div className="mt-3">
                  <ActionForm
                    action={createVariant}
                    hidden={{ productId: p.id }}
                    submit="Ajouter"
                    resetOnSuccess
                    fields={[
                      { name: "sku", label: "SKU", placeholder: "NEXPOD-BAT-VERT", required: true },
                      flavorBased ? { name: "flavor", label: "Saveur" } : { name: "color", label: "Couleur" },
                      { name: "price_fcfa", label: "Prix FCFA", type: "number", required: true, min: 0 },
                    ]}
                  />
                </div>
              </details>
            </section>
          );
        })}
      </div>

      <h2 className="display mt-12 text-3xl">Nouveau produit</h2>
      <div className={`${card} mt-4 p-5`}>
        <ActionForm
          action={createProduct}
          submit="Créer"
          resetOnSuccess
          fields={[
            { name: "categorySlug", label: "Gamme", type: "select", options: [{ value: "nexpod", label: "NexPOD" }, { value: "nexbar", label: "NexBAR" }] },
            {
              name: "kind", label: "Type", type: "select",
              options: [
                { value: "nexpod_battery", label: "NexPOD batterie" }, { value: "nexpod_refill", label: "NexPOD recharge" },
                { value: "nexpod_kit", label: "NexPOD kit" }, { value: "nexbar", label: "NexBAR" },
              ],
            },
            { name: "name", label: "Nom", required: true, wide: true },
            { name: "description", label: "Description", wide: true },
            { name: "puffs", label: "Bouffées", type: "number" },
          ]}
        />
      </div>
    </>
  );
}

export default function Page() {
  return (
    <AdminPage>
      <Content />
    </AdminPage>
  );
}
