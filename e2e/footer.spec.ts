import { expect, test } from "@playwright/test";

const BASE = "http://127.0.0.1:3100";

test("pied de page : carré de contacts avec liens WhatsApp et e-mail, sans débordement", async ({ page }) => {
  await page.context().addCookies([{ name: "sp_age_ok", value: "1", url: BASE }]);
  await page.goto("/boutique");
  const box = page.getByTestId("footer-contact");
  await box.scrollIntoViewIfNeeded();
  await expect(box.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", "https://wa.me/2250711223344");
  await expect(box.getByRole("link", { name: /contact@scopuff\.test/ })).toHaveAttribute("href", "mailto:contact@scopuff.test");
  await expect(box).toContainText("Tous les jours");
  await expect(box).toContainText("Service client");
  await expect(box.getByRole("link", { name: "+225 07 55 66 77 88" })).toHaveAttribute("href", "tel:+2250755667788");
  const socials = page.getByTestId("footer-socials");
  await expect(socials.getByRole("link", { name: "Instagram" })).toHaveAttribute("href", "https://www.instagram.com/scopuff");
  await expect(socials.getByRole("link", { name: "Instagram" })).toHaveAttribute("rel", /noopener/);
  await expect(socials.getByRole("link", { name: "Facebook" })).toHaveCount(0); // lien d'un domaine tiers : refusé
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
});
