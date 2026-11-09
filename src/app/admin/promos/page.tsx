import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { AdminPage, Title, card } from "@/components/admin/page-shell";
import { createPromo, setPromoActive } from "@/app/admin/modules-actions";
import { formatFcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Codes promo" };

async function Content() {
  const supabase = await createClient();
  const { data: promos } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
  return (
    <>
      <Title hint="Les codes ne sont jamais visibles du public. Le contrôle (validité, plafond, minimum) est refait côté serveur à chaque commande.">Codes promo</Title>
      <div className={`${card} mt-8 p-5`}>
        <ActionForm
          action={createPromo}
          submit="Créer le code"
          resetOnSuccess
          fields={[
            { name: "code", label: "Code", placeholder: "BIENVENUE10", required: true },
            { name: "kind", label: "Type", type: "select", options: [{ value: "percent", label: "Pourcentage" }, { value: "fixed", label: "Montant FCFA" }] },
            { name: "value", label: "Valeur", type: "number", required: true, min: 1 },
            { name: "min_subtotal_fcfa", label: "Minimum FCFA", type: "number", min: 0 },
            { name: "max_uses", label: "Utilisations max", type: "number", min: 1 },
            { name: "expires_at", label: "Expire le", type: "date" },
          ]}
        />
      </div>
      <ul className={`${card} mt-6 divide-y divide-line text-sm`} data-testid="promo-list">
        {(promos ?? []).length === 0 && <li className="px-5 py-6 text-ink-soft">Aucun code.</li>}
        {(promos ?? []).map((p) => (
          <li key={p.code} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <span>
              <strong className="font-medium">{p.code}</strong>{" "}
              <span className="text-ink-soft">
                {p.kind === "percent" ? `${p.value} %` : formatFcfa(p.value)} · {p.used_count}
                {p.max_uses ? `/${p.max_uses}` : ""} utilisé(s)
                {p.min_subtotal_fcfa ? ` · min ${formatFcfa(p.min_subtotal_fcfa)}` : ""}
                {p.expires_at ? ` · expire ${new Date(p.expires_at).toLocaleDateString("fr-FR")}` : ""}
              </span>
            </span>
            <ActionForm
              action={setPromoActive}
              hidden={{ code: p.code }}
              submit="OK"
              fields={[{ name: "is_active", label: "Actif", type: "checkbox", value: p.is_active }]}
            />
          </li>
        ))}
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
