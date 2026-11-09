import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderActions } from "@/components/admin/order-actions";
import { PageSkeleton } from "@/components/page-skeleton";
import { ORDER_STATUS_LABEL } from "@/lib/checkout";
import { formatFcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Commande" };

const PAY: Record<string, string> = { cash_on_delivery: "Paiement à la livraison", wave: "Wave", orange_money: "Orange Money" };
const PAY_STATUS: Record<string, string> = { pending: "À encaisser", initiated: "En attente", paid: "Payé", failed: "Échec", cancelled: "Annulé", refunded: "Remboursé" };

async function Content({ params }: { params: PageProps<"/admin/commandes/[number]">["params"] }) {
  const { number } = await params;
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("orders")
    .select(
      "id,order_number,status,subtotal_fcfa,delivery_fee_fcfa,discount_fcfa,promo_code,total_fcfa,created_at,delivery_name,delivery_phone,delivery_commune,delivery_quartier,delivery_address,delivery_landmark,delivery_notes,order_items(product_name,variant_label,unit_price_fcfa,quantity),payments(provider,status,amount_fcfa),deliveries(status,cash_collected_fcfa,courier_id)",
    )
    .eq("order_number", number)
    .maybeSingle();
  if (!o) notFound();
  const pay = o.payments?.[0];
  const delivery = Array.isArray(o.deliveries) ? o.deliveries[0] : o.deliveries;

  return (
    <>
      <Link href="/admin/commandes" className="text-sm text-ink-soft underline underline-offset-4">
        ← Commandes
      </Link>
      <h1 className="display mt-3 text-5xl">{o.order_number}</h1>
      <p className="mt-2 text-ink-soft" data-testid="order-status">
        {ORDER_STATUS_LABEL[o.status] ?? o.status} · {new Date(o.created_at).toLocaleString("fr-FR")}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="card p-6">
          <ul className="divide-y divide-line text-sm">
            {o.order_items.map((i, k) => (
              <li key={k} className="flex justify-between gap-4 py-3">
                <span>
                  {i.product_name}
                  {i.variant_label ? ` · ${i.variant_label}` : ""} × {i.quantity}
                </span>
                <span className="tabular-nums">{formatFcfa(i.unit_price_fcfa * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Sous-total</dt><dd className="tabular-nums">{formatFcfa(o.subtotal_fcfa)}</dd></div>
            {o.discount_fcfa > 0 && (
              <div className="flex justify-between"><dt className="text-ink-soft">Réduction {o.promo_code ? `(${o.promo_code})` : ""}</dt><dd className="tabular-nums">− {formatFcfa(o.discount_fcfa)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-ink-soft">Livraison</dt><dd className="tabular-nums">{formatFcfa(o.delivery_fee_fcfa)}</dd></div>
            <div className="display flex justify-between pt-2 text-2xl"><dt>Total</dt><dd className="tabular-nums">{formatFcfa(o.total_fcfa)}</dd></div>
          </dl>
          <div className="mt-8 border-t border-line pt-6">
            <OrderActions orderId={o.id} status={o.status} cod={pay?.provider === "cash_on_delivery"} hasCourier={Boolean((delivery as { courier_id?: string | null } | null)?.courier_id)} />
          </div>
        </section>

        <aside className="space-y-4 text-sm">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="eyebrow">Client et livraison</p>
            <p className="mt-2 font-medium">{o.delivery_name}</p>
            <a href={`tel:${o.delivery_phone}`} className="text-accent-ink underline underline-offset-4">{o.delivery_phone}</a>
            <p className="mt-2">{o.delivery_commune}{o.delivery_quartier ? `, ${o.delivery_quartier}` : ""}</p>
            <p className="text-ink-soft">{o.delivery_address}</p>
            {o.delivery_landmark && <p className="text-ink-soft">Repère : {o.delivery_landmark}</p>}
            {o.delivery_notes && <p className="mt-2 text-ink-soft">Note : {o.delivery_notes}</p>}
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="eyebrow">Paiement</p>
            <p className="mt-2">{pay ? PAY[pay.provider] : "—"}</p>
            <p className="text-accent-ink">{pay ? PAY_STATUS[pay.status] : ""}</p>
            {delivery?.cash_collected_fcfa != null && <p className="mt-1 text-ink-soft">Encaissé : {formatFcfa(delivery.cash_collected_fcfa)}</p>}
          </div>
        </aside>
      </div>
    </>
  );
}

export default function AdminOrder({ params }: PageProps<"/admin/commandes/[number]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
