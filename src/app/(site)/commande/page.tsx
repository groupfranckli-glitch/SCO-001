import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { PageSkeleton } from "@/components/page-skeleton";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Commande" };

async function Content() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return (
      <div className="mx-auto mt-12 max-w-md rounded-3xl border border-line bg-surface px-6 py-12 text-center" data-testid="checkout-gate">
        <p className="display text-3xl">Connectez-vous pour commander</p>
        <p className="mt-3 text-sm text-ink-soft">
          Un compte nous permet de suivre votre commande et votre livraison. Votre panier est conservé.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/connexion?next=/commande" className="pill">
            Se connecter
          </Link>
          <Link href="/connexion?mode=inscription&next=/commande" className="pill pill-ghost">
            Créer un compte
          </Link>
        </div>
      </div>
    );
  }

  const [{ data: zones }, { data: profile }] = await Promise.all([
    createPublicClient().from("delivery_zones").select("commune,fee_fcfa").eq("is_active", true).order("position"),
    supabase.from("profiles").select("full_name,phone").eq("id", auth.user.id).maybeSingle(),
  ]);

  return (
    <CheckoutForm
      zones={(zones ?? []).map((z) => ({ commune: z.commune as string, fee: z.fee_fcfa as number }))}
      defaults={{ name: profile?.full_name ?? "", phone: profile?.phone ?? "" }}
    />
  );
}

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-8 sm:pt-16">
      <p className="eyebrow">Finaliser</p>
      <h1 className="display mt-3 text-5xl sm:text-6xl">Commande</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}
