import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { buildDashboard, sinceIso, type DashOrder } from "@/lib/dashboard";
import { ORDER_STATUS_LABEL } from "@/lib/checkout";
import { formatFcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const PROVIDER_LABEL: Record<string, string> = { cash_on_delivery: "À la livraison", wave: "Wave", orange_money: "Orange Money", inconnu: "Autre" };
const PROVIDER_COLOR: Record<string, string> = { cash_on_delivery: "#8c78d6", wave: "#1c1230", orange_money: "#c28b3c", inconnu: "#cfc8bb" };

const dark = "rounded-[1.75rem] bg-gradient-to-br from-[#33204f] to-[#170e26] p-6 text-white shadow-[0_24px_50px_-30px_rgb(23_14_38/0.8)]";
const light = "rounded-[1.75rem] border border-line bg-surface p-6 shadow-[0_18px_40px_-30px_rgb(21_18_15/0.35)]";

function Line({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const w = 600;
  const h = 140;
  const pts = values.map((v, i) => [(i / Math.max(values.length - 1, 1)) * w, h - (v / max) * (h - 10) - 5]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 h-36 w-full" preserveAspectRatio="none" role="img" aria-label="Chiffre d'affaires par jour">
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="rgb(255 255 255 / 0.08)" />
      <path d={d} fill="none" stroke="#cdbdf5" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.p) ? sp.p[0] : sp.p;
  const days = (raw === "7" ? 7 : raw === "90" ? 90 : 30) as 7 | 30 | 90;

  const supabase = await createClient();
  const [{ data: orders }, { data: variants }] = await Promise.all([
    supabase
      .from("orders")
      .select("order_number,status,total_fcfa,created_at,delivery_name,payments(provider,status),deliveries(status,cash_collected_fcfa)")
      .gte("created_at", sinceIso(90))
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from("product_variants").select("color,flavor,stock_on_hand,stock_reserved,products(name)").eq("is_active", true),
  ]);

  const stock = (variants ?? []).map((v) => ({
    productName: (v.products as unknown as { name: string } | null)?.name ?? "",
    label: v.color ?? v.flavor ?? "",
    available: Math.max(v.stock_on_hand - v.stock_reserved, 0),
  }));
  const now = new Date();
  const d = buildDashboard((orders ?? []) as unknown as DashOrder[], stock, days, now);
  const hello = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const maxBar = Math.max(...d.buckets, 1);
  const splitTotal = Object.values(d.split).reduce((a, b) => a + b, 0) || 1;
  const active = Object.values(d.toProcess).reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow first-letter:uppercase">{hello}</p>
          <h1 className="display mt-2 text-5xl">Bonjour, Administrateur</h1>
        </div>
        <div className="inline-flex rounded-full bg-muted p-1 text-sm" role="group" aria-label="Période">
          {([7, 30, 90] as const).map((n) => (
            <Link
              key={n}
              href={`/admin?p=${n}`}
              aria-current={n === days ? "true" : undefined}
              className={`rounded-full px-4 py-1.5 ${n === days ? "bg-surface shadow-sm" : "text-ink-soft"}`}
            >
              {n} j
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <section className={`${dark} lg:col-span-2`} aria-label="Chiffre d'affaires">
          <p className="text-xs text-white/70">Chiffre d&apos;affaires · {days} derniers jours</p>
          <p className="display mt-3 text-6xl" data-testid="kpi-revenue">
            {new Intl.NumberFormat("fr-FR").format(d.revenue)} <span className="text-xl not-italic text-white/60">FCFA</span>
          </p>
          <Line values={d.daily.map((x) => x.revenue)} />
        </section>

        <div className="grid gap-5">
          <section className={light} aria-label="Commandes">
            <p className="text-xs text-ink-soft">Commandes · par tranche de {days / 10} jours</p>
            <p className="display mt-2 text-5xl" data-testid="kpi-orders">
              {d.count}
            </p>
            <div className="mt-4 flex h-20 items-end gap-1.5" aria-hidden="true">
              {d.buckets.map((b, i) => (
                <div key={i} className="flex-1 rounded-t bg-accent/50" style={{ height: `${Math.max((b / maxBar) * 100, 4)}%` }} />
              ))}
            </div>
          </section>
          <section className={light} aria-label="Panier moyen">
            <p className="text-xs text-ink-soft">Panier moyen · par commande</p>
            <p className="display mt-2 text-4xl" data-testid="kpi-average">
              {formatFcfa(d.average)}
            </p>
          </section>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className={light} aria-label="À traiter">
          <div className="flex justify-between text-xs text-ink-soft">
            <span>À traiter</span>
            <Link href="/admin/commandes" className="underline underline-offset-4">
              Voir
            </Link>
          </div>
          <p className="display mt-2 text-5xl" data-testid="kpi-active">
            {active} <span className="text-lg not-italic text-ink-soft">commande{active > 1 ? "s" : ""}</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {(["pending", "confirmed", "preparing", "out_for_delivery"] as const).map((s) => (
              <li key={s} className="flex justify-between">
                <span className="text-ink-soft">{ORDER_STATUS_LABEL[s]}</span>
                <span className="tabular-nums">{d.toProcess[s]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={light} aria-label="Stock à surveiller">
          <div className="flex justify-between text-xs text-ink-soft">
            <span>Stock à surveiller</span>
            <Link href="/admin/stock" className="underline underline-offset-4">
              Gérer
            </Link>
          </div>
          {d.watch.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">Aucune variante sous le seuil de 5 unités.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm" data-testid="stock-watch">
              {d.watch.map((w, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {w.productName} · {w.label}
                  </span>
                  <span className={`shrink-0 text-xs ${w.available === 0 ? "text-danger" : "text-accent-ink"}`}>
                    {w.available === 0 ? "épuisé" : `${w.available} en stock`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={dark} aria-label="Encaissement et livraison">
          <p className="text-xs text-white/70">Encaissement et livraison</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/60">Encaissé</p>
              <p className="display text-4xl" data-testid="kpi-paid">
                {d.paidPct} %
              </p>
              <p className="text-xs text-white/60">{formatFcfa(d.collected)} en espèces</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Livrées</p>
              <p className="display text-4xl">{d.deliveredPct} %</p>
              <p className="text-xs text-white/60">
                {d.deliveredCount} sur {d.count}
              </p>
            </div>
          </div>
          <p className="mt-4 border-t border-white/15 pt-3 text-xs text-white/70">
            Espèces à encaisser par les livreurs : <span className="text-white">{formatFcfa(d.cashToCollect)}</span>
          </p>
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className={light} aria-label="Dernières commandes">
          <div className="flex justify-between text-xs text-ink-soft">
            <span>Dernières commandes</span>
            <Link href="/admin/commandes" className="underline underline-offset-4">
              Tout voir
            </Link>
          </div>
          {d.latest.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft" data-testid="no-orders">
              Aucune commande pour le moment.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {d.latest.map((o) => (
                <li key={o.order_number}>
                  <Link href={`/admin/commandes/${o.order_number}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-muted/40">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{o.delivery_name}</span>
                      <span className="text-xs text-ink-soft">{o.order_number}</span>
                    </span>
                    <span className="text-right">
                      <span className="block tabular-nums">{formatFcfa(o.total_fcfa)}</span>
                      <span className="text-xs text-accent-ink">{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={light} aria-label="Répartition des paiements">
          <p className="text-xs text-ink-soft">Répartition des paiements</p>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            {Object.entries(d.split).map(([k, v]) => (
              <div key={k} style={{ width: `${(v / splitTotal) * 100}%`, background: PROVIDER_COLOR[k] ?? "#cfc8bb" }} />
            ))}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {Object.entries(d.split).length === 0 && <li className="text-ink-soft">Aucun paiement sur la période.</li>}
            {Object.entries(d.split).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PROVIDER_COLOR[k] ?? "#cfc8bb" }} />
                  {PROVIDER_LABEL[k] ?? k}
                </span>
                <span className="tabular-nums text-ink-soft">{Math.round((v / splitTotal) * 100)} %</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

export default function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
