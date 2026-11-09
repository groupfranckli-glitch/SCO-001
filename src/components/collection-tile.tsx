import Image from "next/image";
import Link from "next/link";
import type { Tile } from "@/lib/collections";

export function CollectionTile({
  tile,
  className = "",
  priority = false,
}: {
  tile: Tile;
  className?: string;
  priority?: boolean;
}) {
  const dark = tile.tone === "dark";
  const label = (
    <>
      <p className={`eyebrow ${dark ? "!text-white/80" : ""}`}>{tile.eyebrow}</p>
      <h3 className="display mt-2 text-4xl sm:text-5xl">{tile.title}</h3>
      <p className={`mt-2 text-sm ${dark ? "text-white/85" : "text-ink-soft"}`}>{tile.subtitle}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
        Découvrir
        <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
          →
        </span>
      </span>
    </>
  );
  const image = (
    <Image
      src={tile.image}
      alt=""
      fill
      priority={priority}
      sizes="(min-width: 1024px) 40vw, 100vw"
      className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
      style={{ objectPosition: tile.position }}
    />
  );

  if (!dark) {
    // Tuile claire : la photo occupe le haut, le texte repose sur un bandeau uni (jamais sur le produit).
    return (
      <Link
        href={tile.href}
        data-testid="collection-tile"
        className={`group flex flex-col overflow-hidden rounded-[2rem] border border-line bg-surface text-ink ${className}`}
      >
        <div className="relative min-h-[10rem] flex-1 overflow-hidden bg-white">{image}</div>
        <div className="p-5 sm:p-6">{label}</div>
      </Link>
    );
  }

  return (
    <Link
      href={tile.href}
      data-testid="collection-tile"
      className={`group relative isolate block overflow-hidden rounded-[2rem] bg-muted text-white ${className}`}
    >
      <div className="absolute inset-0 -z-10">{image}</div>
      <div className="absolute inset-0 -z-[5] bg-gradient-to-t from-black/75 via-black/10 to-black/10" />
      <div className="flex h-full min-h-[inherit] flex-col justify-end p-6 sm:p-8">{label}</div>
    </Link>
  );
}
