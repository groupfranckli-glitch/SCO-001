import type { Metadata } from "next";
import { AdminPage, Title, card } from "@/components/admin/page-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Journal" };

const ACTION: Record<string, string> = {
  "order.status": "Statut de commande", "stock.adjust": "Ajustement de stock", "delivery.assign": "Attribution livreur",
  "team.role": "Rôle modifié", "product.update": "Produit modifié", "product.create": "Produit créé", "variant.update": "Variante modifiée",
  "variant.create": "Variante créée", "promo.create": "Code promo créé", "promo.toggle": "Code promo activé/désactivé",
  "zone.update": "Zone modifiée", "zone.create": "Zone créée", "settings.home": "Page d'entrée modifiée", "team.role.request": "Demande de rôle",
};

async function Content() {
  const supabase = await createClient();
  const { data } = await supabase.from("audit_log").select("id,action,entity,entity_id,details,created_at").order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <Title hint="Trace de toutes les actions sensibles (100 dernières). Non modifiable.">Journal</Title>
      <ul className={`${card} mt-8 divide-y divide-line text-sm`} data-testid="audit">
        {(data ?? []).length === 0 && <li className="px-5 py-8 text-ink-soft">Aucune action enregistrée.</li>}
        {(data ?? []).map((a) => (
          <li key={a.id as number} className="px-5 py-3">
            <div className="flex flex-wrap justify-between gap-2"><span>{ACTION[a.action as string] ?? (a.action as string)}</span><span className="text-xs text-ink-soft">{new Date(a.created_at as string).toLocaleString("fr-FR")}</span></div>
            {a.details ? <p className="mt-1 break-words text-xs text-ink-soft">{JSON.stringify(a.details).slice(0, 200)}</p> : null}
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
