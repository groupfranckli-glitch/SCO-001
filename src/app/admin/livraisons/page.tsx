import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage, Title, card } from "@/components/admin/page-shell";
import { AssignCourier } from "@/components/admin/assign-courier";
import { ORDER_STATUS_LABEL } from "@/lib/checkout";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Livraisons" };

async function Content() {
  const supabase = await createClient();
  const [{ data: rows }, { data: couriers }] = await Promise.all([
    supabase
      .from("deliveries")
      .select("order_id,courier_id,status,orders(id,order_number,status,delivery_commune,delivery_address,delivery_phone)")
      .order("assigned_at", { ascending: false, nullsFirst: true })
      .limit(100),
    supabase.from("profiles").select("id,full_name").eq("role", "courier"),
  ]);
  const list = (couriers ?? []).map((c) => ({ id: c.id as string, name: (c.full_name as string) || "Livreur sans nom" }));
  type O = { id: string; order_number: string; status: string; delivery_commune: string; delivery_address: string; delivery_phone: string };
  const open = (rows ?? []).filter((r) => {
    const o = r.orders as unknown as O | null;
    return o && !["delivered", "cancelled"].includes(o.status);
  });
  return (
    <>
      <Title hint="Attribuez un livreur à chaque commande avant de la remettre. Le livreur ne peut plus être changé une fois la commande en route.">Livraisons</Title>
      {list.length === 0 && <p className="mt-6 rounded-2xl border border-line bg-muted/40 p-4 text-sm">Aucun livreur : donnez le rôle « Livreur » à un compte depuis la page Équipe.</p>}
      <ul className={`${card} mt-8 divide-y divide-line`} data-testid="deliveries">
        {open.length === 0 && <li className="px-5 py-8 text-sm text-ink-soft">Aucune livraison à organiser.</li>}
        {open.map((r) => {
          const o = r.orders as unknown as O;
          const locked = o.status === "out_for_delivery";
          return (
            <li key={o.id} className="flex flex-wrap items-end justify-between gap-4 px-5 py-4">
              <div className="text-sm">
                <Link href={`/admin/commandes/${o.order_number}`} className="font-medium underline underline-offset-4">{o.order_number}</Link>
                <p className="text-ink-soft">{o.delivery_commune} · {o.delivery_address}</p>
                <p className="text-xs text-accent-ink">{ORDER_STATUS_LABEL[o.status] ?? o.status}</p>
              </div>
              {locked ? (
                <p className="text-sm text-ink-soft">{list.find((c) => c.id === r.courier_id)?.name ?? "—"} · en route</p>
              ) : (
                <AssignCourier orderId={o.id} courierId={r.courier_id as string | null} couriers={list} />
              )}
            </li>
          );
        })}
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
