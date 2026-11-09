import type { Metadata } from "next";
import { AdminPage, Title, card } from "@/components/admin/page-shell";
import { formatFcfa } from "@/lib/format";
import { courierStats, type CourierDelivery } from "@/lib/stats";
import { emailMap } from "@/lib/admin-users";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Livreurs" };

async function Content() {
  const supabase = await createClient();
  const [{ data: couriers }, { data: deliveries }, emails] = await Promise.all([
    supabase.from("profiles").select("id,full_name,phone").eq("role", "courier"),
    supabase.from("deliveries").select("courier_id,status,cash_collected_fcfa,orders(total_fcfa,status,payments(provider,status))").not("courier_id", "is", null),
    emailMap(),
  ]);
  const stats = courierStats((deliveries ?? []) as unknown as CourierDelivery[]);
  return (
    <>
      <Title hint="Suivi des tournées et des espèces : « à reverser » = encaissé par le livreur ; « à encaisser » = commandes en cours payables à la livraison.">Livreurs</Title>
      <div className={`${card} mt-8 overflow-x-auto`}>
        <table className="w-full min-w-[40rem] text-left text-sm" data-testid="couriers">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-ink-soft">
            <tr><th className="px-5 py-3 font-normal">Livreur</th><th className="px-3 py-3 text-right font-normal">En cours</th><th className="px-3 py-3 text-right font-normal">Livrées</th><th className="px-3 py-3 text-right font-normal">À encaisser</th><th className="px-5 py-3 text-right font-normal">Espèces encaissées</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(couriers ?? []).length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-ink-soft">Aucun livreur. Ajoutez-en depuis la page Équipe.</td></tr>}
            {(couriers ?? []).map((c) => {
              const s = stats.get(c.id as string) ?? { delivered: 0, collected: 0, toCollect: 0, active: 0 };
              return (
                <tr key={c.id as string}>
                  <td className="px-5 py-3"><span className="block">{(c.full_name as string) || "Sans nom"}</span><span className="text-xs text-ink-soft">{emails.get(c.id as string) ?? ""} {c.phone as string ?? ""}</span></td>
                  <td className="px-3 py-3 text-right tabular-nums">{s.active}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{s.delivered}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatFcfa(s.toCollect)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatFcfa(s.collected)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
