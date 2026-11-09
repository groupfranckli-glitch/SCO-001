import type { Metadata } from "next";
import { AdminPage, Title, card } from "@/components/admin/page-shell";
import { formatFcfa } from "@/lib/format";
import { buildStats, type SoldLine } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Statistiques" };

async function Content() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("order_items")
    .select("product_name,variant_label,quantity,unit_price_fcfa,orders(status,delivery_commune)")
    .limit(10000);
  const { products, communes } = buildStats((data ?? []) as unknown as SoldLine[]);
  const max = Math.max(1, ...products.map((p) => p.revenue));
  return (
    <>
      <Title hint="Ventes cumulées (commandes non annulées) : meilleurs produits et répartition par commune.">Statistiques</Title>
      <h2 className="display mt-10 text-3xl">Meilleurs produits</h2>
      <ul className={`${card} mt-4 divide-y divide-line`} data-testid="top-products">
        {products.length === 0 && <li className="px-5 py-8 text-sm text-ink-soft">Pas encore de ventes.</li>}
        {products.map((p) => (
          <li key={p.name} className="px-5 py-3 text-sm">
            <div className="flex justify-between gap-3"><span>{p.name}</span><span className="tabular-nums">{p.quantity} × · {formatFcfa(p.revenue)}</span></div>
            <div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-[var(--accent-ink)]" style={{ width: `${(p.revenue / max) * 100}%` }} /></div>
          </li>
        ))}
      </ul>
      <h2 className="display mt-12 text-3xl">Par commune</h2>
      <ul className={`${card} mt-4 divide-y divide-line text-sm`} data-testid="by-commune">
        {communes.length === 0 && <li className="px-5 py-8 text-ink-soft">Pas encore de ventes.</li>}
        {communes.map((c) => (
          <li key={c.name} className="flex justify-between gap-3 px-5 py-3"><span>{c.name}</span><span className="tabular-nums">{c.quantity} art. · {formatFcfa(c.revenue)}</span></li>
        ))}
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
