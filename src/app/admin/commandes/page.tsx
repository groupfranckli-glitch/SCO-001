import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { ORDER_STATUS_LABEL } from "@/lib/checkout";
import { formatFcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Commandes" };

const FILTERS = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"] as const;

async function Content({ searchParams }: { searchParams: PageProps<"/admin/commandes">["searchParams"] }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = FILTERS.find((s) => s === raw);

  const supabase = await createClient();
  let q = supabase
    .from("orders")
    .select("order_number,status,total_fcfa,created_at,delivery_name,delivery_commune,payments(provider,status)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) q = q.eq("status", status);
  const { data: orders } = await q;

  return (
    <>
      <h1 className="display text-5xl">Commandes</h1>
      <div className="mt-6 flex flex-wrap gap-2 text-sm" role="group" aria-label="Filtrer par statut">
        <Link href="/admin/commandes" className={`rounded-full border px-4 py-1.5 ${!status ? "border-ink bg-ink text-background" : "border-line bg-surface"}`}>
          Toutes
        </Link>
        {FILTERS.map((s) => (
          <Link key={s} href={`/admin/commandes?status=${s}`} className={`rounded-full border px-4 py-1.5 ${status === s ? "border-ink bg-ink text-background" : "border-line bg-surface"}`}>
            {ORDER_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {!orders || orders.length === 0 ? (
        <p className="mt-10 text-ink-soft" data-testid="no-orders">
          Aucune commande{status ? " avec ce statut" : ""}.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-3xl border border-line bg-surface" data-testid="order-list">
          {orders.map((o) => (
            <li key={o.order_number}>
              <Link href={`/admin/commandes/${o.order_number}`} className="grid grid-cols-[1fr_auto] gap-3 px-5 py-4 text-sm hover:bg-muted/40 sm:grid-cols-[1.2fr_1fr_auto_auto]">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{o.delivery_name}</span>
                  <span className="text-xs text-ink-soft">
                    {o.order_number} · {new Date(o.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </span>
                <span className="hidden text-ink-soft sm:block">{o.delivery_commune}</span>
                <span className="text-right tabular-nums">{formatFcfa(o.total_fcfa)}</span>
                <span className="text-right text-xs text-accent-ink">{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function AdminOrders({ searchParams }: PageProps<"/admin/commandes">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
