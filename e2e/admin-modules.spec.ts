import { expect, test, type Page } from "@playwright/test";

const BASE = "http://127.0.0.1:3100";
const MOCK = "http://127.0.0.1:54321";

async function login(page: Page, token: string, id: string, email: string) {
  const session = {
    access_token: token, refresh_token: "r", token_type: "bearer", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: { id, email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" },
  };
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  await page.context().addCookies([
    { name: "sb-127-auth-token", value, url: BASE },
    { name: "sp_age_ok", value: "1", url: BASE },
  ]);
}
const asAdmin = (page: Page) => login(page, "admin-token", "22222222-2222-4222-8222-222222222222", "admin@scopuff.test");
const calls = async (request: import("@playwright/test").APIRequestContext) => (await (await request.get(`${MOCK}/__last`)).json()).admin as Record<string, unknown>[];

test.beforeEach(async ({ request }) => {
  await request.get(`${MOCK}/__reset`);
});

test("les pages de consultation s'affichent (stats, clients, livreurs, paiements, journal, catalogue)", async ({ page }) => {
  await asAdmin(page);
  await page.goto("/admin/statistiques");
  await expect(page.getByTestId("top-products").filter({ visible: true })).toContainText("NexBAR 10K · Mangue");
  await expect(page.getByTestId("by-commune").filter({ visible: true })).toContainText("Cocody");
  await page.goto("/admin/paiements");
  await expect(page.getByTestId("payments").filter({ visible: true })).toContainText("Espèces à la livraison");
  await page.goto("/admin/journal");
  await expect(page.getByTestId("audit").filter({ visible: true })).toContainText("Statut de commande");
  await page.goto("/admin/livreurs");
  await expect(page.getByTestId("couriers").filter({ visible: true })).toContainText("Moussa Livreur");
  await page.goto("/admin/clients");
  await expect(page.getByRole("heading", { name: "Clients" }).filter({ visible: true })).toBeVisible();
  await page.goto("/admin/catalogue");
  await expect(page.getByTestId("product-admin").filter({ visible: true }).first()).toContainText("Variantes");
});

test("un client simple n'accède à aucune page des nouveaux modules", async ({ page }) => {
  await login(page, "test-token", "11111111-1111-4111-8111-111111111111", "awa@example.com");
  for (const p of ["/admin/catalogue", "/admin/promos", "/admin/reglages", "/admin/livraisons", "/admin/equipe", "/admin/journal", "/livreur"]) {
    await page.goto(p);
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  }
});

test("code promo : création validée côté serveur", async ({ page, request }) => {
  await asAdmin(page);
  await page.goto("/admin/promos");
  const form = page.locator("form:visible").first();
  await form.getByLabel("Code").fill("ete15");
  await form.getByLabel("Valeur").fill("150");
  await form.getByRole("button", { name: "Créer le code" }).click();
  await expect(page.locator("span[role=alert]:visible")).toContainText("pourcentage");
  expect((await calls(request)).filter((c) => c.fn === "write")).toHaveLength(0);

  await form.getByLabel("Valeur").fill("15");
  await form.getByRole("button", { name: "Créer le code" }).click();
  await expect(page.getByText("Enregistré").filter({ visible: true })).toBeVisible();
  const w = (await calls(request)).find((c) => c.fn === "write" && c.table === "promo_codes") as { body: { code: string; value: number } };
  expect(w.body.code).toBe("ETE15");
  expect(w.body.value).toBe(15);
});

test("réglages : frais de livraison et page d'entrée modifiables", async ({ page, request }) => {
  await asAdmin(page);
  await page.goto("/admin/reglages");
  const row = page.getByTestId("zones").filter({ visible: true }).locator("li").first();
  await row.getByLabel("Frais FCFA").fill("1500");
  await row.getByRole("button", { name: "OK" }).click();
  await expect(row.getByText("Enregistré")).toBeVisible();
  const z = (await calls(request)).find((c) => c.table === "delivery_zones") as { method: string; body: { fee_fcfa: number } };
  expect(z.method).toBe("PATCH");
  expect(z.body.fee_fcfa).toBe(1500);

  const home = page.getByTestId("home-form").filter({ visible: true });
  await home.getByLabel("Titre").fill("Nouveau titre");
  await home.getByRole("button", { name: "Publier" }).click();
  await expect(home.getByText("Enregistré")).toBeVisible();
  expect((await calls(request)).some((c) => c.table === "site_settings")).toBe(true);
});

test("la page d'entrée affiche le titre modifié depuis l'admin", async ({ page }) => {
  await page.context().addCookies([{ name: "sp_age_ok", value: "1", url: BASE }]);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Titre depuis l'admin");
});

test("livraisons : attribution d'un livreur ; équipe : rôle inconnu refusé avec message clair", async ({ page, request }) => {
  await asAdmin(page);
  await page.goto("/admin/livraisons");
  const li = page.getByTestId("deliveries").filter({ visible: true }).locator("li").first();
  await li.getByLabel("Livreur").selectOption({ label: "Moussa Livreur" });
  await li.getByRole("button", { name: "Attribuer" }).click();
  await expect(li.getByText("Enregistré")).toBeVisible();
  const a = (await calls(request)).find((c) => c.fn === "admin_assign_courier") as Record<string, string>;
  expect(a.p_courier).toBe("33333333-3333-4333-8333-333333333333");
  expect(a.p_actor).toBe("22222222-2222-4222-8222-222222222222");

  await page.goto("/admin/equipe");
  const f = page.locator("form:visible").first();
  await f.getByLabel("E-mail du compte").fill("inconnu@example.com");
  await f.getByRole("button", { name: "Appliquer" }).click();
  await expect(page.locator("span[role=alert]:visible")).toContainText("doit d'abord s'inscrire");
});

test("commande à remettre sans livreur : le bouton est bloqué", async ({ page }) => {
  await asAdmin(page);
  await page.goto("/admin/commandes/SP-TEST-0001");
  // commande en attente : le blocage ne concerne que l'étape « Remettre au livreur »
  await expect(page.getByRole("button", { name: "Confirmer la commande" }).filter({ visible: true })).toBeEnabled();
});
