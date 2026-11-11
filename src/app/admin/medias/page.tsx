import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { ImageUpload } from "@/components/admin/image-upload";
import { AdminPage, Title, card } from "@/components/admin/page-shell";
import { createBanner, deleteBanner, removeSlotImage, saveBanner, uploadSlotImage } from "@/app/admin/media-actions";
import { SLOTS, getSlotImages } from "@/lib/site-media";
import { publicUrl } from "@/lib/storage-url";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Médias & bannières" };

const PLACEMENTS = [
  { value: "home", label: "Page d'entrée (sous la photo)" },
  { value: "boutique", label: "Boutique (en haut)" },
];

async function Content() {
  const supabase = await createClient();
  const [slots, { data: banners }] = await Promise.all([
    getSlotImages(),
    supabase.from("banners").select("id,title,alt,href,image_path,placement,position,is_active,starts_at,ends_at").order("placement").order("position"),
  ]);
  const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

  return (
    <>
      <Title hint="Logo, photos de l'interface et bannières publicitaires. Les photos des produits se changent dans Catalogue. Tout est publié immédiatement sur le site.">
        Médias &amp; bannières
      </Title>

      <h2 className="display mt-10 text-3xl">Logo et images du site</h2>
      <ul className={`${card} mt-4 divide-y divide-line`} data-testid="slots">
        {SLOTS.map((s) => (
          <li key={s.key} className="px-5 py-4" data-testid={`slot-${s.key}`}>
            <p className="text-sm font-medium">{s.label}</p>
            <p className="mb-3 text-xs text-ink-soft">{s.hint}</p>
            <ImageUpload
              action={uploadSlotImage}
              hidden={{ key: s.key }}
              current={slots[s.key] ?? s.fallback}
              onRemove={slots[s.key] ? { action: removeSlotImage, payload: { key: s.key }, label: "Revenir à l'image d'origine" } : undefined}
            />
          </li>
        ))}
      </ul>

      <h2 className="display mt-12 text-3xl">Bannières publicitaires</h2>
      <div className={`${card} mt-4 p-5`} data-testid="banner-new">
        <p className="mb-3 text-sm font-medium">Nouvelle bannière</p>
        <ImageUpload
          action={createBanner}
          submit="Publier la bannière"
          resetOnSuccess
          extra={[
            { name: "title", label: "Titre", required: true, placeholder: "Offre de la semaine" },
            { name: "alt", label: "Description de l'image" },
            { name: "href", label: "Lien (facultatif)", placeholder: "/boutique/nexbar" },
            { name: "placement", label: "Emplacement", type: "select", options: PLACEMENTS, value: "home" },
            { name: "starts_at", label: "Début", type: "date" },
            { name: "ends_at", label: "Fin", type: "date" },
          ]}
        />
        <p className="mt-2 text-xs text-ink-soft">Format conseillé : 1600 × 500 px. Sans dates, la bannière reste affichée tant qu&apos;elle est active.</p>
      </div>

      <ul className="mt-6 space-y-4" data-testid="banners-admin">
        {(banners ?? []).map((b) => (
          <li key={b.id} className={`${card} p-5`} data-testid="banner-admin">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={publicUrl(b.image_path)} alt={b.alt || b.title} className="mb-4 h-24 w-full rounded-2xl border border-line object-cover sm:w-80" />
            <ActionForm
              action={saveBanner}
              hidden={{ id: b.id }}
              submit="Enregistrer"
              fields={[
                { name: "title", label: "Titre", value: b.title, required: true },
                { name: "alt", label: "Description", value: b.alt },
                { name: "href", label: "Lien", value: b.href },
                { name: "placement", label: "Emplacement", type: "select", options: PLACEMENTS, value: b.placement },
                { name: "position", label: "Ordre", type: "number", value: b.position, min: 0 },
                { name: "starts_at", label: "Début", type: "date", value: day(b.starts_at) },
                { name: "ends_at", label: "Fin", type: "date", value: day(b.ends_at) },
                { name: "is_active", label: "Affichée", type: "checkbox", value: b.is_active },
              ]}
            />
            <div className="mt-3">
              <ActionForm action={deleteBanner} hidden={{ id: b.id }} submit="Supprimer la bannière" fields={[]} />
            </div>
          </li>
        ))}
        {(banners ?? []).length === 0 && <li className="text-sm text-ink-soft">Aucune bannière pour l&apos;instant.</li>}
      </ul>
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
