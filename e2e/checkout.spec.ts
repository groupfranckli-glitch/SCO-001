import { expect, test, type Page } from "@playwright/test";

const BASE = "http://127.0.0.1:3100";
const MOCK = "http://127.0.0.1:54321";
const VARIANT = "00000000-0000-4000-8000-000000000009";

async function adult(page: Page) {
  await page.context().addCookies([{ name: "sp_age_ok", value: "1", url: BASE }]);
}

async function login(page: Page) {
  const session = {
    access_token: "test-token", refresh_token: "r", token_type: "bearer",
    expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: { id: "11111111-1111-4111-8111-111111111111", email: "awa@example.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" },
  };
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  await page.context().addCookies([{ name: "sb-127-auth-token", value, url: BASE }]);
}

async function withCart(page: Page) {
  await page.addInitScript((variant) => {
    // n'amorce le panier qu'une fois : il doit rester vide après une commande
    if (localStorage.getItem("seeded")) return;
    localStorage.setItem("seeded", "1");
    localStorage.setItem(
      "scopuff-cart-v1",
      JSON.stringify([{ variantId: variant, productSlug: "nexbar-10k", productName: "NexBAR 10K", label: "Peach Ice", unitPrice: 10000, quantity: 2, maxQty: 20, image: "/products/nexbar-peach-ice.jpg" }]),
    );
  }, VARIANT);
}

test.beforeEach(async ({ page, request }) => {
  await adult(page);
  await request.get(`${MOCK}/__reset`);
});

test.describe("accès à la commande", () => {
  test("visiteur : invité à se connecter, panier conservé", async ({ page }) => {
    await withCart(page);
    await page.goto("/commande");
    await expect(page.locator('[data-testid="checkout-gate"]:visible')).toBeVisible();
    await page.getByRole("link", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/connexion\?next=\/commande/);
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
    await page.getByRole("link", { name: "Créer un compte" }).click();
    await expect(page.getByRole("button", { name: "Créer mon compte" })).toBeVisible();
    await expect(page.getByLabel("Nom complet")).toBeVisible();
  });

  test("l'espace client renvoie un visiteur vers la connexion", async ({ page }) => {
    await page.goto("/compte");
    await expect(page).toHaveURL(/\/connexion/);
  });

  test("connecté : la page de connexion redirige vers sa destination", async ({ page }) => {
    await login(page);
    await page.goto("/connexion?next=/compte");
    await expect(page).toHaveURL(/\/compte$/);
    await expect(page.getByRole("heading", { name: /Awa Koné/ })).toBeVisible();
  });
});

test.describe("commande en une page", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await withCart(page);
  });

  test("récapitulatif, frais selon la commune, code promo, paiements non opérationnels désactivés", async ({ page }, info) => {
    await page.goto("/commande");
    const form = page.getByTestId("checkout-form");
    await expect(form).toBeVisible();

    const mobile = info.project.name === "mobile";
    const scope = mobile ? page.getByTestId("recap-mobile") : form.locator("aside");
    if (mobile) {
      await expect(scope).not.toHaveAttribute("open", "");
      await scope.locator("summary").click();
    }
    await expect(scope.getByTestId("recap-line")).toHaveCount(1);
    await expect(scope.getByTestId("recap-fee")).toHaveText("choisissez la commune");

    await form.getByTestId("commune").selectOption("Marcory");
    await expect(scope.getByTestId("recap-fee")).toHaveText(/1\s500\sFCFA/);
    await expect(scope.getByTestId("recap-total")).toHaveText(/21\s500\sFCFA/);

    await form.getByPlaceholder("Votre code").fill("welcome10");
    await form.getByRole("button", { name: "Appliquer" }).click();
    await expect(form.getByRole("status")).toContainText("WELCOME10 appliqué");
    await expect(scope.getByTestId("recap-total")).toHaveText(/19\s500\sFCFA/);

    await form.getByPlaceholder("Votre code").fill("FAUX123");
    await form.getByRole("button", { name: "Appliquer" }).click();
    await expect(form.getByRole("alert")).toContainText("pas valable");

    await expect(form.getByRole("radio", { name: /Wave/ })).toBeDisabled();
    await expect(form.getByRole("radio", { name: /Orange Money/ })).toBeDisabled();
    await expect(form.getByTestId("pay-cod")).toHaveAttribute("aria-checked", "true");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over).toBeLessThanOrEqual(0);
  });

  test("sans confirmation d'âge, aucune commande n'est envoyée", async ({ page, request }) => {
    await page.goto("/commande");
    await page.getByLabel("Nom complet").fill("Awa Koné");
    await page.getByLabel("Téléphone").fill("07 00 00 00 00");
    await page.getByTestId("commune").selectOption("Cocody");
    await page.getByLabel("Adresse précise").fill("Rue 12, porte 3");
    await page.locator('[data-testid^="submit-"]:visible').click();
    await expect(page).toHaveURL(/\/commande$/);
    const calls = await (await request.get(`${MOCK}/__last`)).json();
    expect(calls.orders).toHaveLength(0);
  });

  test("commande validée : un seul envoi, prix absents du message, confirmation « à encaisser »", async ({ page, request }) => {
    await page.goto("/commande");
    await page.getByLabel("Nom complet").fill("Awa Koné");
    await page.getByLabel("Téléphone").fill("07 00 00 00 00");
    await page.getByTestId("commune").selectOption("Cocody");
    await page.getByLabel("Quartier").fill("Riviera");
    await page.getByLabel("Adresse précise").fill("Rue 12, porte 3");
    await page.getByLabel("Point de repère").fill("Près de la pharmacie");
    await page.getByTestId("adult").check();
    const submit = page.locator('[data-testid^="submit-"]:visible');
    await submit.dblclick();

    await expect(page).toHaveURL(/\/compte\/commandes\/SP-TEST-0001$/);
    await expect(page.getByRole("heading", { name: "Merci pour votre commande" })).toBeVisible();
    await expect(page.getByTestId("payment-status")).toHaveText("À encaisser à la livraison");

    const calls = await (await request.get(`${MOCK}/__last`)).json();
    expect(calls.orders).toHaveLength(1);
    const body = calls.orders[0];
    expect(body.p_provider).toBe("cash_on_delivery");
    expect(body.p_commune).toBe("Cocody");
    expect(body.p_phone).toBe("0700000000");
    expect(body.p_lines).toEqual([{ variant_id: VARIANT, quantity: 2 }]);
    expect(JSON.stringify(body)).not.toMatch(/price|unit|total/i);

    // le panier est vidé après la commande
    await page.goto("/panier");
    await expect(page.getByTestId("cart-empty")).toBeVisible();
  });

  test("robot : le champ piège rempli est refusé", async ({ page, request }) => {
    await page.goto("/commande");
    await page.getByLabel("Nom complet").fill("Bot");
    await page.getByLabel("Téléphone").fill("07 00 00 00 00");
    await page.getByTestId("commune").selectOption("Cocody");
    await page.getByLabel("Adresse précise").fill("Rue 12, porte 3");
    await page.getByTestId("adult").check();
    await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => (el.value = "http://spam.example"));
    await page.locator('[data-testid^="submit-"]:visible').click();
    await expect(page.getByTestId("checkout-error")).toContainText("Requête refusée");
    const calls = await (await request.get(`${MOCK}/__last`)).json();
    expect(calls.orders).toHaveLength(0);
  });
});
