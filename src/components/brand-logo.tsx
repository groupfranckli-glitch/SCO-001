import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { getSlotImages } from "@/lib/site-media";

async function Resolved({ light, href }: { light: boolean; href?: string }) {
  const img = await getSlotImages();
  return <Logo light={light} href={href} imageUrl={light ? (img.logo_light ?? img.logo) : img.logo} />;
}

/** Logo du site : celui téléversé depuis l'admin, sinon le logo par défaut (aussi affiché pendant le chargement). */
export function BrandLogo({ light = false, href }: { light?: boolean; href?: string }) {
  return (
    <Suspense fallback={<Logo light={light} href={href} />}>
      <Resolved light={light} href={href} />
    </Suspense>
  );
}
