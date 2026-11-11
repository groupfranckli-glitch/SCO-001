import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { BrandLogo } from "@/components/brand-logo";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · Admin SCO PUFF" }, robots: { index: false, follow: false } };

async function Shell({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-svh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-surface p-4 md:min-h-svh md:border-b-0 md:border-r md:p-6">
        <div className="mb-4 md:mb-8">
          <BrandLogo href="/admin" />
        </div>
        <AdminNav />
        <div className="mt-4 hidden text-xs text-ink-soft md:mt-10 md:block">
          <p>{admin.name ?? "Administrateur"}</p>
          <p className="truncate">{admin.email}</p>
          <Link href="/" className="mt-3 inline-block underline underline-offset-4">
            Voir la boutique
          </Link>
        </div>
      </aside>
      <main id="contenu" className="min-w-0 px-4 py-8 sm:px-8 md:py-10">
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-ink-soft">Chargement…</div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
