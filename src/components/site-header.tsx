import Link from "next/link";
import { CartLink } from "@/components/cart-link";
import { Logo } from "@/components/logo";
import { SearchBox } from "@/components/search-box";

/** `overlay` : transparent, texte clair, posé sur la photo d'entrée. */
export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const tone = overlay ? "text-white" : "text-ink";
  return (
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-30 text-white"
          : "sticky top-0 z-30 border-b border-line/70 bg-background/85 text-ink backdrop-blur-md"
      }
    >
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] sm:grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:h-20 sm:px-8">
        <nav aria-label="Navigation principale" className={`flex items-center gap-3 whitespace-nowrap text-[12px] sm:gap-8 sm:text-sm ${tone}`}>
          <Link href="/boutique" className="underline-offset-8 hover:underline">
            Boutique
          </Link>
          <Link href="/compte" className="underline-offset-8 hover:underline">
            Espace client
          </Link>
        </nav>
        <div className="justify-self-center"><Logo light={overlay} href="/" /></div>
        <div className={`flex items-center justify-end gap-1 ${tone}`}>
          <SearchBox light={overlay} />
          <CartLink />
        </div>
      </div>
    </header>
  );
}
