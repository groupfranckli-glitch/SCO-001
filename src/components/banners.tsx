import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getBanners } from "@/lib/site-media";

async function List({ placement }: { placement: "home" | "boutique" }) {
  const banners = await getBanners(placement);
  if (!banners.length) return null;
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-5 py-6" data-testid="banners">
      {banners.map((b) => {
        const img = (
          <div className="relative aspect-[16/6] overflow-hidden rounded-[1.5rem] bg-muted sm:aspect-[16/5]">
            <Image src={b.url} alt={b.alt || b.title} fill sizes="(min-width: 1152px) 1100px, 100vw" className="object-cover" />
          </div>
        );
        if (!b.href) return <div key={b.id}>{img}</div>;
        const external = b.href.startsWith("https://");
        return (
          <Link key={b.id} href={b.href} className="block" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {img}
          </Link>
        );
      })}
    </div>
  );
}

/** Bannières publicitaires gérées depuis l'admin (actives et dans leurs dates seulement : filtré par la base). */
export function Banners({ placement }: { placement: "home" | "boutique" }) {
  return (
    <Suspense fallback={null}>
      <List placement={placement} />
    </Suspense>
  );
}
