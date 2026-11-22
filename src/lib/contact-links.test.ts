import { describe, expect, it } from "vitest";
import { parseExtra, socialUrl } from "@/lib/contact-links";

describe("liens des réseaux sociaux", () => {
  it("accepte un identifiant ou un lien officiel https", () => {
    expect(socialUrl("instagram", "@scopuff")).toBe("https://www.instagram.com/scopuff");
    expect(socialUrl("instagram", "scopuff")).toBe("https://www.instagram.com/scopuff");
    expect(socialUrl("instagram", "https://www.instagram.com/scopuff/")).toBe("https://www.instagram.com/scopuff/");
    expect(socialUrl("tiktok", "@scopuff")).toBe("https://www.tiktok.com/@scopuff");
  });
  it("refuse tout le reste : http, javascript:, domaine tiers, faux sous-domaine, identifiants intégrés", () => {
    for (const bad of ["http://instagram.com/x", "javascript:alert(1)", "https://evil.com/instagram.com", "https://instagram.com.evil.com/x", "https://user:pw@instagram.com/x", "data:text/html,x", "<script>", "a b"]) {
      expect(socialUrl("instagram", bad)).toBeNull();
    }
    expect(socialUrl("instagram", "https://www.facebook.com/x")).toBeNull();
    expect(socialUrl("instagram", "")).toBeNull();
  });
});

describe("contacts supplémentaires", () => {
  it("transforme numéros, e-mails et liens https", () => {
    const { ok, items } = parseExtra("Service client | +225 07 00 00 00 00\nBoutique | boutique@scopuff.com\nCarte | https://maps.example.com/x\nHoraires | 9h-21h");
    expect(ok).toBe(true);
    expect(items.map((i) => i.href)).toEqual(["tel:+2250700000000", "mailto:boutique@scopuff.com", "https://maps.example.com/x", null]);
  });
  it("n'active jamais un lien dangereux et signale les lignes invalides", () => {
    expect(parseExtra("X | javascript:alert(1)").items[0].href).toBeNull();
    expect(parseExtra("X | http://insecure.example").items[0].href).toBeNull();
    expect(parseExtra("sans séparateur").ok).toBe(false);
    expect(parseExtra(Array.from({ length: 9 }, (_, i) => `L${i} | v`).join("\n")).ok).toBe(false);
  });
});
