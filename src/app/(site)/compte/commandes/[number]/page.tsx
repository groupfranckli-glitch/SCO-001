import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { ORDER_STATUS_LABEL } from "@/lib/checkout";
import { formatFcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ma commande" };

const PAYMENT_LABEL: Record<string, string> = {
  cash_on_delivery: "Paiement à la livraison (espèces)",
  wave: "Wave",
  orange_money: "Orange Money",
};
const PAYMENT_STATUS: Record<string, string> = {
  pending: "À encaisser à la livraison",
  initiated: "En attente de paiement",
  paid: "Payé",
  failed: "Échec du paiement",
  cancelled: "Annulé",
  refunded: "Remboursé",
};

async function Content({ params }: { params: PageProps<"/compte/commandes/[number]">["params"] }) {
  const { number } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/connexion?next=${encodeURIComponent(`/compte/commandes/${number}`)}`);

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id,order_number,status,subtotal_fcfa,delivery_fee_fcfa,discount_fcfa,total_fcfa,delivery_commune,delivery_quartier,delivery_address,delivery_landmark,order_items(product_name,variant_label,unit_price_fcfa,quantity),payments(provider,status)",
    )
    .eq("order_number", number)
    .eq("customer_id", auth.user.id)
    .maybeSingle();
  if (!order) notFound();

  const pay = order.payments?.[0];
  return (
    <>
      <h1 className="display mt-3 text-5xl">Merci pour votre commande</h1>
      <p className="mt-4 text-ink-soft" data-testid="order-number">
        Commande {order.order_number} · {ORDER_STATUS_LABEL[order.status] ?? order.status}
      </p>

      <div className="card mt-10 p-6 sm:p-8">
        <ul className="divide-y divide-line">
          {order.order_items.map((i, k) => (
            <li key={k} className="flex justify-between gap-4 py-3 text-sm">
              <span>
                {i.product_name}
                {i.variant_label ? ` · ${i.variant_label}` : ""} × {i.quantity}
              </span>
              <span className="tabular-nums">{formatFcfa(i.unit_price_fcfa * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Sous-total</dt>
            <dd className="tabular-nums">{formatFcfa(order.subtotal_fcfa)}</dd>
          </div>
          {order.discount_fcfa > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-soft">Réduction</dt>
              <dd className="tabular-nums">− {formatFcfa(order.discount_fcfa)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-soft">Livraison</dt>
            <dd className="tabular-nums">{formatFcfa(order.delivery_fee_fcfa)}</dd>
          </div>
          <div className="display flex justify-between pt-2 text-2xl">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatFcfa(order.total_fcfa)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="eyebrow">Livraison</p>
          <p className="mt-2">
            {order.delivery_commune}
            {order.delivery_quartier ? `, ${order.delivery_quartier}` : ""}
          </p>
          <p className="text-ink-soft">{order.delivery_address}</p>
          {order.delivery_landmark && <p className="text-ink-soft">Repère : {order.delivery_landmark}</p>}
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="eyebrow">Paiement</p>
          <p className="mt-2">{pay ? PAYMENT_LABEL[pay.provider] : "—"}</p>
          <p className="text-accent-ink" data-testid="payment-status">
            {pay ? PAYMENT_STATUS[pay.status] : ""}
          </p>
        </div>
      </div>

      <div className="mt-10 flex gap-3">
        <Link href="/compte" className="pill pill-ghost">
          Mes commandes
        </Link>
        <Link href="/boutique" className="pill">
          Continuer mes achats
        </Link>
      </div>
    </>
  );
}

export default function OrderPage({ params }: PageProps<"/compte/commandes/[number]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-8 sm:pt-16">
      <p className="eyebrow">Confirmation</p>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}
