import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage, Title, card } from "@/components/admin/page-shell";
import { formatFcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Paiements" };

const PROVIDER: Record<string, string> = { cash_on_delivery: "Espèces à la livraison", wave: "Wave", orange_money: "Orange Money" };
const STATUS: Record<string, string> = { initiated: "Initié", pending: "En attente", paid: "Payé", failed: "Échoué", cancelled: "Annulé", refunded: "Remboursé" };

async function Content() {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("id,provider,status,amount_fcfa,created_at,verified_at,orders(order_number)")
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <>
      <Title hint="Lecture seule : un paiement Wave ou Orange Money ne passe à « Payé » que sur vérification serveur du fournisseur ; l'espèces est validé à la remise de la commande.">Paiements</Title>
      <div className={`${card} mt-8 overflow-x-auto`}>
        <table className="w-full min-w-[40rem] text-left text-sm" data-testid="payments">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-ink-soft">
            <tr><th className="px-5 py-3 font-normal">Commande</th><th className="px-3 py-3 font-normal">Moyen</th><th className="px-3 py-3 font-normal">Statut</th><th className="px-5 py-3 text-right font-normal">Montant</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(payments ?? []).length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-ink-soft">Aucun paiement.</td></tr>}
            {(payments ?? []).map((p) => {
              const num = (p.orders as unknown as { order_number: string } | null)?.order_number;
              return (
                <tr key={p.id as string}>
                  <td className="px-5 py-3">{num ? <Link className="underline underline-offset-4" href={`/admin/commandes/${num}`}>{num}</Link> : "—"}</td>
                  <td className="px-3 py-3">{PROVIDER[p.provider as string] ?? (p.provider as string)}</td>
                  <td className="px-3 py-3">{STATUS[p.status as string] ?? (p.status as string)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatFcfa(p.amount_fcfa as number)}</td>
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
