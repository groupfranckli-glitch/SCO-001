/** Agrégations du tableau de bord : fonctions pures, testées, indépendantes de Supabase. */
export type DashOrder = {
  order_number: string;
  status: string;
  total_fcfa: number;
  created_at: string;
  delivery_name: string;
  payments: { provider: string; status: string }[];
  deliveries: { status: string; cash_collected_fcfa: number | null } | { status: string; cash_collected_fcfa: number | null }[] | null;
};

export type StockRow = { productName: string; label: string; available: number };

const DAY = 86_400_000;

export function buildDashboard(orders: DashOrder[], stock: StockRow[], days: 7 | 30 | 90, now: Date) {
  const since = now.getTime() - days * DAY;
  const inRange = orders.filter((o) => new Date(o.created_at).getTime() >= since);
  const live = inRange.filter((o) => o.status !== "cancelled");

  const revenue = live.reduce((s, o) => s + o.total_fcfa, 0);
  const count = live.length;
  const average = count ? Math.round(revenue / count) : 0;

  // Courbe du chiffre d'affaires par jour
  const daily = Array.from({ length: days }, (_, i) => ({ day: new Date(since + (i + 1) * DAY), revenue: 0 }));
  for (const o of live) {
    const idx = Math.min(days - 1, Math.max(0, Math.floor((new Date(o.created_at).getTime() - since) / DAY)));
    daily[idx].revenue += o.total_fcfa;
  }

  // Commandes par tranche de 3 jours (10 barres)
  const buckets = Array.from({ length: 10 }, () => 0);
  const span = (days * DAY) / buckets.length;
  for (const o of live) {
    const i = Math.min(buckets.length - 1, Math.max(0, Math.floor((new Date(o.created_at).getTime() - since) / span)));
    buckets[i] += 1;
  }

  const toProcess = { pending: 0, confirmed: 0, preparing: 0, out_for_delivery: 0 };
  for (const o of orders) if (o.status in toProcess) toProcess[o.status as keyof typeof toProcess] += 1;

  const deliveryOf = (o: DashOrder) => (Array.isArray(o.deliveries) ? o.deliveries[0] : o.deliveries);
  const delivered = live.filter((o) => o.status === "delivered");
  const collected = delivered.reduce((s, o) => s + (deliveryOf(o)?.cash_collected_fcfa ?? 0), 0);
  const cashToCollect = live
    .filter((o) => o.status !== "delivered" && o.payments.some((p) => p.provider === "cash_on_delivery" && p.status === "pending"))
    .reduce((s, o) => s + o.total_fcfa, 0);
  const paidRevenue = live.filter((o) => o.payments.some((p) => p.status === "paid")).reduce((s, o) => s + o.total_fcfa, 0);

  const split: Record<string, number> = {};
  for (const o of live) {
    const provider = o.payments[0]?.provider ?? "inconnu";
    split[provider] = (split[provider] ?? 0) + o.total_fcfa;
  }

  return {
    revenue,
    count,
    average,
    daily,
    buckets,
    toProcess,
    deliveredCount: delivered.length,
    deliveredPct: count ? Math.round((delivered.length / count) * 100) : 0,
    paidPct: revenue ? Math.round((paidRevenue / revenue) * 100) : 0,
    collected,
    cashToCollect,
    split,
    latest: [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    watch: stock.filter((s) => s.available <= 5).sort((a, b) => a.available - b.available).slice(0, 6),
  };
}

/** Date ISO de début de fenêtre (appelée côté serveur, hors rendu React). */
export function sinceIso(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() - days * DAY).toISOString();
}
