import { cookies } from "next/headers";
import { AgeGate } from "@/components/age-gate";
import { AGE_COOKIE } from "@/lib/age";

/** Rendu à la requête (cookie lu) : le reste de la page reste préfabriqué. */
export async function AgeGateSlot() {
  const jar = await cookies();
  if (jar.get(AGE_COOKIE)?.value === "1") return null;
  return <AgeGate />;
}
