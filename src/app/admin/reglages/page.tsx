import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { AdminPage, Title, card } from "@/components/admin/page-shell";
import { addZone, saveContact, saveHome, saveZone } from "@/app/admin/modules-actions";
import { getContact } from "@/lib/contact";
import { getHomeContent } from "@/lib/home";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Réglages" };

async function Content() {
  const supabase = await createClient();
  const [{ data: zones }, home] = await Promise.all([
    supabase.from("delivery_zones").select("commune,fee_fcfa,is_active").order("position"),
    getHomeContent(),
  ]);
  const contact = await getContact();
  return (
    <>
      <Title hint="Contenu de la page d'entrée et frais de livraison par commune d'Abidjan.">Réglages</Title>

      <h2 className="display mt-10 text-3xl">Page d&apos;entrée</h2>
      <div className={`${card} mt-4 p-5`} data-testid="home-form">
        <ActionForm
          action={saveHome}
          submit="Publier"
          fields={[
            { name: "home_title", label: "Titre", value: home.title, wide: true, required: true },
            { name: "home_text", label: "Texte", value: home.text, wide: true, required: true },
            { name: "home_cta", label: "Bouton", value: home.cta, required: true },
          ]}
        />
      </div>

      <h2 className="display mt-12 text-3xl">Contacts du pied de page</h2>
      <div className={`${card} mt-4 p-5`} data-testid="contact-form">
        <ActionForm
          action={saveContact}
          submit="Publier"
          fields={[
            { name: "contact_phone", label: "Téléphone", value: contact.contact_phone, placeholder: "+225 07 00 00 00 00" },
            { name: "contact_whatsapp", label: "WhatsApp", value: contact.contact_whatsapp, placeholder: "+225 07 00 00 00 00" },
            { name: "contact_email", label: "E-mail", type: "email", value: contact.contact_email },
            { name: "contact_address", label: "Zone / adresse", value: contact.contact_address, wide: true },
            { name: "contact_hours", label: "Horaires", value: contact.contact_hours, placeholder: "Tous les jours, 9h – 21h", wide: true },
            { name: "social_instagram", label: "Instagram (@nom ou lien)", value: contact.social_instagram, placeholder: "@scopuff", wide: true },
            { name: "social_facebook", label: "Facebook (nom ou lien)", value: contact.social_facebook, wide: true },
            { name: "social_tiktok", label: "TikTok (@nom ou lien)", value: contact.social_tiktok, wide: true },
            { name: "social_youtube", label: "YouTube (@nom ou lien)", value: contact.social_youtube, wide: true },
            { name: "social_x", label: "X (nom ou lien)", value: contact.social_x, wide: true },
            { name: "contact_extra", label: "Autres contacts, une ligne chacun : Libellé | valeur", type: "textarea", value: contact.contact_extra, placeholder: "Service client | +225 07 00 00 00 00", wide: true },
          ]}
        />
      </div>

      <h2 className="display mt-12 text-3xl">Frais de livraison</h2>
      <ul className={`${card} mt-4 divide-y divide-line`} data-testid="zones">
        {(zones ?? []).map((z) => (
          <li key={z.commune} className="flex flex-wrap items-center gap-4 px-5 py-3">
            <span className="w-32 text-sm font-medium">{z.commune}</span>
            <ActionForm
              action={saveZone}
              hidden={{ commune: z.commune }}
              submit="OK"
              fields={[
                { name: "fee_fcfa", label: "Frais FCFA", type: "number", value: z.fee_fcfa, min: 0, required: true },
                { name: "is_active", label: "Desservie", type: "checkbox", value: z.is_active },
              ]}
            />
          </li>
        ))}
      </ul>
      <div className={`${card} mt-4 p-5`}>
        <ActionForm action={addZone} submit="Ajouter une commune" resetOnSuccess fields={[
          { name: "commune", label: "Commune", required: true },
          { name: "fee_fcfa", label: "Frais FCFA", type: "number", min: 0, required: true },
        ]} />
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
