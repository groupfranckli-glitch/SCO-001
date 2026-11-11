"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Tableau de bord", exact: true },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/livraisons", label: "Livraisons" },
  { href: "/admin/livreurs", label: "Livreurs" },
  { href: "/admin/paiements", label: "Paiements" },
  { href: "/admin/catalogue", label: "Catalogue" },
  { href: "/admin/medias", label: "Médias & bannières" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/promos", label: "Codes promo" },
  { href: "/admin/statistiques", label: "Statistiques" },
  { href: "/admin/reglages", label: "Réglages" },
  { href: "/admin/equipe", label: "Équipe" },
  { href: "/admin/journal", label: "Journal" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Administration" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {ITEMS.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition ${
              active ? "bg-[#1c1230] text-white" : "text-ink-soft hover:bg-muted"
            }`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
