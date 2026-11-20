import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { getSlotImages } from "@/lib/site-media";

async function Resolved({ light, href }: { light: boolean; href?: string }) {
  const img = await getSlotImages();
  return <Logo light={light} href={href} imageUrl={light ? (img.logo_light ?? img.logo) : img.logo} />;
}

/** Logo du site : celui téléversé depuis l'admin, sinon le logo par défaut. Pendant un chargement exceptionnel, une réserve vide évite de montrer l\u2019ancien logo. */
export function BrandLogo({ light = false, href }: { light?: boolean; href?: string }) {
  return (
    <Suspense fallback={<span aria-hidden="true" className="inline-block h-9 w-28" />}>
      <Resolved light={light} href={href} />
    </Suspense>
  );
}
