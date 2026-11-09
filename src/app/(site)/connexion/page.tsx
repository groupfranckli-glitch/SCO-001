import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { PageSkeleton } from "@/components/page-skeleton";
import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Connexion" };

async function Content({ searchParams }: { searchParams: PageProps<"/connexion">["searchParams"] }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = safeNext(one(sp.next));
  const mode = one(sp.mode) === "inscription" ? "inscription" : "connexion";

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(next);

  return (
    <>
      <h1 className="display mt-3 text-center text-5xl">{mode === "connexion" ? "Connexion" : "Créer un compte"}</h1>
      <AuthForm mode={mode} next={next} />
    </>
  );
}

export default function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 text-center sm:px-8 sm:pt-16">
      <p className="eyebrow">Espace client</p>
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
