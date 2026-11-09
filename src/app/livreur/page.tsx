import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CourierDeliver } from "@/components/courier-deliver";
import { Logo } from "@/components/logo";
import { PageSkeleton } from "@/components/page-skeleton";
import { formatFcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Espace livreur", robots: { index: false, follow: false } };

async function Content() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion?next=/livreur");
  const { data: profile } = await supabase.from("profiles").select("role,full_name").eq("id", auth.user.id).maybeSingle();
  if (!profile || !["courier", "admin"].includes(profile.role as string)) notFound();

  const { data } = await supabase
    .from("deliveries")
    .select("order_id,orders(id,order_number,status,total_fcfa,delivery_name,delivery_phone,delivery_commune,delivery_address,delivery_landmark,delivery_notes,payments(provider))")
    .eq("courier_id", auth.user.id)
    .in("status", ["assigned", "picked_up"]);
  type O = { id: string; order_number: string; status: string; total_fcfa: number; delivery_name: string; delivery_phone: string; delivery_commune: string; delivery_address: string; delivery_landmark: string | null; delivery_notes: string | null; payments: { provider: string }[] };
  const orders = (data ?? []).map((d) => d.orders as unknown as O).filter((o) => o && o.status !== "cancelled");

  return (
    <>
      <h1 className="display mt-3 text-4xl">Mes livraisons</h1>
      <ul className="mt-6 space-y-4" data-testid="courier-orders">
        {orders.length === 0 && <li className="rounded-3xl border border-line bg-surface px-6 py-10 text-center text-ink-soft">Aucune livraison attribuée.</li>}
        {orders.map((o) => {
          const cod = o.payments.some((p) => p.provider === "cash_on_delivery");
          const ready = o.status === "out_for_delivery";
          return (
            <li key={o.id} className="rounded-3xl border border-line bg-surface p-5" data-testid="courier-order">
              <p className="text-xs text-ink-soft">{o.order_number}</p>
              <p className="mt-1 text-lg">{o.delivery_name}</p>
              <p className="text-sm"><a className="underline underline-offset-4" href={`tel:${o.delivery_phone}`}>{o.delivery_phone}</a></p>
              <p className="mt-2 text-sm">{o.delivery_commune} · {o.delivery_address}{o.delivery_landmark ? ` (${o.delivery_landmark})` : ""}</p>
              {o.delivery_notes && <p className="mt-1 text-sm text-ink-soft">{o.delivery_notes}</p>}
              <p className="mt-3 text-sm">{cod ? <>À encaisser : <strong>{formatFcfa(o.total_fcfa)}</strong></> : "Déjà payée en ligne"}</p>
              {ready ? <CourierDeliver orderId={o.id} total={o.total_fcfa} cod={cod} /> : <p className="mt-3 text-sm text-ink-soft">En préparation : la remise sera confirmée par la boutique.</p>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function Page() {
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Logo href="/livreur" />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}
