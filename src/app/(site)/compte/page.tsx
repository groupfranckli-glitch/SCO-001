import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/app/auth-actions";
import { PageSkeleton } from "@/components/page-skeleton";
import { ORDER_STATUS_LABEL } from "@/lib/checkout";
import { formatFcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Espace client" };

async function Content() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion?next=/compte");

  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", auth.user.id).maybeSingle(),
    supabase
      .from("orders")
      .select("order_number,status,total_fcfa,created_at")
      .eq("customer_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <>
      <h1 className="display mt-3 text-5xl sm:text-6xl">Bonjour{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
      <p className="mt-3 text-ink-soft">{auth.user.email}</p>

      <h2 className="display mt-14 text-3xl">Mes commandes</h2>
      {!orders || orders.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-line bg-surface px-6 py-12 text-center" data-testid="no-orders">
          <p className="text-ink-soft">Vous n&apos;avez pas encore passé de commande.</p>
          <Link href="/boutique" className="pill mt-6">
            Découvrir la boutique
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {orders.map((o) => (
            <li key={o.order_number}>
              <Link href={`/compte/commandes/${o.order_number}`} className="flex items-center justify-between gap-4 py-4 hover:bg-muted/40">
                <span>
                  <span className="block text-sm font-medium">{o.order_number}</span>
                  <span className="text-xs text-ink-soft">{new Date(o.created_at).toLocaleDateString("fr-FR")}</span>
                </span>
                <span className="text-right">
                  <span className="block text-sm tabular-nums">{formatFcfa(o.total_fcfa)}</span>
                  <span className="text-xs text-accent-ink">{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form action={signOut} className="mt-12">
        <button type="submit" className="pill pill-ghost">
          Se déconnecter
        </button>
      </form>
    </>
  );
}

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-8 sm:pt-16">
      <p className="eyebrow">Espace client</p>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}
