import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { HOME_DEFAULTS, getHomeContent } from "@/lib/home";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

async function HomeCopy() {
  const c = await getHomeContent();
  return <HeroCopy {...c} />;
}

function HeroCopy({ title, text, cta }: { title: string; text: string; cta: string }) {
  return (
    <>
      <h1 className="display mt-5 text-5xl sm:text-6xl md:text-7xl">{title}</h1>
      <p className="mt-6 max-w-xl text-base text-white/85 sm:text-lg">{text}</p>
      <Link href="/boutique" className="pill pill-light mt-10">
        {cta}
      </Link>
    </>
  );
}

export default function Home() {
  return (
    <>
      <section className="relative isolate flex min-h-svh flex-col overflow-hidden bg-ink text-white">
        <Image
          src="/products/nexpod-dark.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-[50%_55%]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/25 to-black/65" />
        <SiteHeader overlay />
        <main id="contenu" className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-5 pb-16 pt-28 text-center">
          <p className="eyebrow !text-white/75">Abidjan · Livraison à domicile</p>
          <Suspense fallback={<HeroCopy {...HOME_DEFAULTS} />}>
            <HomeCopy />
          </Suspense>
        </main>
      </section>
      <SiteFooter />
    </>
  );
}
