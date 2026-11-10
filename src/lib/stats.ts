/** Agrégations des modules admin (fonctions pures, testées). */
export type CustomerOrder = { customer_id: string; total_fcfa: number; status: string };
export type CourierDelivery = {
  courier_id: string | null;
  status: string;
  cash_collected_fcfa: number | null;
  orders: { total_fcfa: number; status: string; payments: { provider: string; status: string }[] } | null;
};
export type SoldLine = {
  product_name: string;
  variant_label: string | null;
  quantity: number;
  unit_price_fcfa: number;
  orders: { status: string; delivery_commune: string } | null;
};

export function customerStats(orders: CustomerOrder[]) {
  const m = new Map<string, { count: number; spent: number }>();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const c = m.get(o.customer_id) ?? { count: 0, spent: 0 };
    c.count += 1;
    c.spent += o.total_fcfa;
    m.set(o.customer_id, c);
  }
  return m;
}

export function courierStats(deliveries: CourierDelivery[]) {
  const m = new Map<string, { delivered: number; collected: number; toCollect: number; active: number }>();
  for (const d of deliveries) {
    if (!d.courier_id) continue;
    const c = m.get(d.courier_id) ?? { delivered: 0, collected: 0, toCollect: 0, active: 0 };
    if (d.status === "delivered") {
      c.delivered += 1;
      c.collected += d.cash_collected_fcfa ?? 0;
    } else if (d.status === "assigned" || d.status === "picked_up") {
      c.active += 1;
      const cod = d.orders?.payments.some((p) => p.provider === "cash_on_delivery" && p.status === "pending");
      if (cod && d.orders && d.orders.status !== "cancelled") c.toCollect += d.orders.total_fcfa;
    }
    m.set(d.courier_id, c);
  }
  return m;
}

export function buildStats(lines: SoldLine[]) {
  const products = new Map<string, { name: string; quantity: number; revenue: number }>();
  const communes = new Map<string, { quantity: number; revenue: number }>();
  for (const l of lines) {
    if (!l.orders || l.orders.status === "cancelled") continue;
    const rev = l.unit_price_fcfa * l.quantity;
    const key = `${l.product_name}${l.variant_label ? ` · ${l.variant_label}` : ""}`;
    const p = products.get(key) ?? { name: key, quantity: 0, revenue: 0 };
    p.quantity += l.quantity;
    p.revenue += rev;
    products.set(key, p);
    const c = communes.get(l.orders.delivery_commune) ?? { quantity: 0, revenue: 0 };
    c.quantity += l.quantity;
    c.revenue += rev;
    communes.set(l.orders.delivery_commune, c);
  }
  return {
    products: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    communes: [...communes.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue),
  };
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
