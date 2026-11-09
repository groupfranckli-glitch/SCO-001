import type { Metadata } from "next";
import { AdminPage, Title, card } from "@/components/admin/page-shell";
import { formatFcfa } from "@/lib/format";
import { customerStats } from "@/lib/stats";
import { emailMap } from "@/lib/admin-users";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Clients" };

async function Content() {
  const supabase = await createClient();
  const [{ data: profiles }, { data: orders }, emails] = await Promise.all([
    supabase.from("profiles").select("id,full_name,phone,created_at").eq("role", "customer").order("created_at", { ascending: false }).limit(300),
    supabase.from("orders").select("customer_id,total_fcfa,status").limit(5000),
    emailMap(),
  ]);
  const stats = customerStats(orders ?? []);
  return (
    <>
      <Title hint="Comptes clients et valeur de leurs commandes (hors annulées).">Clients</Title>
      <div className={`${card} mt-8 overflow-x-auto`}>
        <table className="w-full min-w-[40rem] text-left text-sm" data-testid="customers">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-ink-soft">
            <tr><th className="px-5 py-3 font-normal">Client</th><th className="px-3 py-3 font-normal">Téléphone</th><th className="px-3 py-3 text-right font-normal">Commandes</th><th className="px-5 py-3 text-right font-normal">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(profiles ?? []).length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-ink-soft">Aucun client pour le moment.</td></tr>}
            {(profiles ?? []).map((p) => {
              const s = stats.get(p.id as string) ?? { count: 0, spent: 0 };
              return (
                <tr key={p.id as string}>
                  <td className="px-5 py-3"><span className="block">{(p.full_name as string) || "Sans nom"}</span><span className="text-xs text-ink-soft">{emails.get(p.id as string) ?? ""}</span></td>
                  <td className="px-3 py-3">{(p.phone as string) ?? "—"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{s.count}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatFcfa(s.spent)}</td>
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
