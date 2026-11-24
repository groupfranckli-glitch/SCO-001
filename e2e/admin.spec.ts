import { expect, test, type Page } from "@playwright/test";

const BASE = "http://127.0.0.1:3100";
const MOCK = "http://127.0.0.1:54321";
const ADMIN_ID = "22222222-2222-4222-8222-222222222222";

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
const asAdmin = (page: Page) => login(page, "admin-token", ADMIN_ID, "admin@scopuff.test");

test.beforeEach(async ({ request }) => {
  await request.get(`${MOCK}/__reset`);
});

test.describe("accès à l'administration", () => {
  test("visiteur : renvoyé vers la connexion", async ({ page }) => {
    await page.context().addCookies([{ name: "sp_age_ok", value: "1", url: BASE }]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/connexion\?next=\/admin/);
  });

  test("client simple : l'espace admin n'existe pas pour lui (404), même sur les sous-pages", async ({ page }) => {
    await login(page, "test-token", "11111111-1111-4111-8111-111111111111", "awa@example.com");
    for (const path of ["/admin", "/admin/commandes", "/admin/stock"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
      await expect(page.getByText("Chiffre d'affaires").filter({ visible: true })).toHaveCount(0);
    }
  });
});

test.describe("administrateur", () => {
  test.beforeEach(async ({ page }) => asAdmin(page));

  test("tableau de bord : indicateurs, stock à surveiller, dernières commandes, sans débordement", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Bonjour, Administrateur" })).toBeVisible();
    await expect(page.getByTestId("kpi-revenue").filter({ visible: true })).toContainText("30 000");
    await expect(page.getByTestId("kpi-orders").filter({ visible: true })).toHaveText("2");
    await expect(page.getByTestId("kpi-average").filter({ visible: true })).toHaveText(/15\s000\sFCFA/);
    await expect(page.getByTestId("kpi-active").filter({ visible: true })).toContainText("1");
    await expect(page.getByTestId("stock-watch").filter({ visible: true })).toContainText("épuisé");
    await expect(page.getByRole("link", { name: /Awa Koné/ })).toBeVisible();
    await page.getByRole("link", { name: "7 j" }).click();
    await expect(page).toHaveURL(/p=7/);
    await expect(page.getByTestId("kpi-orders").filter({ visible: true })).toHaveText("2");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over).toBeLessThanOrEqual(0);
  });

  test("commandes : liste, filtre, détail, passage en « confirmée » (l'acteur vient du serveur)", async ({ page, request }) => {
    await page.goto("/admin/commandes");
    await expect(page.getByTestId("order-list").filter({ visible: true }).getByRole("link")).toHaveCount(2);
    await page.getByRole("link", { name: "Livrée", exact: true }).click();
    await expect(page.getByTestId("order-list").filter({ visible: true }).getByRole("link")).toHaveCount(1);

    await page.goto("/admin/commandes/SP-TEST-0001");
    await expect(page.getByTestId("order-status").filter({ visible: true })).toContainText("Reçue");
    await expect(page.getByText("Paiement à la livraison").filter({ visible: true })).toBeVisible();
    await page.getByRole("button", { name: "Confirmer la commande" }).click();
    await expect.poll(async () => (await (await request.get(`${MOCK}/__last`)).json()).admin.length).toBe(1);
    const call = (await (await request.get(`${MOCK}/__last`)).json()).admin[0];
    expect(call).toMatchObject({ fn: "status", p_order: "00000000-0000-4000-8000-0000000000b1", p_status: "confirmed", p_actor: ADMIN_ID });
  });

  test("annulation : demande une confirmation puis envoie « cancelled »", async ({ page, request }) => {
    await page.goto("/admin/commandes/SP-TEST-0001");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect.poll(async () => (await (await request.get(`${MOCK}/__last`)).json()).admin.length).toBe(1);
    expect((await (await request.get(`${MOCK}/__last`)).json()).admin[0].p_status).toBe("cancelled");
  });

  test("commande livrée : aucune action possible", async ({ page }) => {
    await page.goto("/admin/commandes/SP-TEST-0002");
    await expect(page.getByText("Commande clôturée").filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Encaissé : 11 000").filter({ visible: true })).toBeVisible();
  });

  test("stock : une section par produit, dans l'ordre des pages ; recharges sans couleur ; kit en grille", async ({ page }) => {
    await page.goto("/admin/stock");
    const sections = page.getByTestId("stock-section").filter({ visible: true });
    await expect(sections).toHaveCount(4);
    await expect(sections.locator("h2")).toHaveText(["Kit NexPOD", "Batterie NexPOD", "Recharges NexPOD", "NexBAR 10K"]);
    const rec = sections.nth(2);
    await expect(rec.getByTestId("stock-input")).toHaveCount(2);
    await expect(rec.getByText("Aucune couleur")).toHaveCount(0);
    await expect(rec.getByLabel("Nouvelle saveur")).toBeVisible();
    await expect(rec.getByLabel(/couleur/i)).toHaveCount(0);
    await expect(sections.nth(1).getByLabel("Nouvelle couleur")).toBeVisible();
    const kit = sections.nth(0);
    await expect(kit.locator("table th", { hasText: "Noir" })).toBeVisible();
    await expect(kit.locator("table th", { hasText: "Bleu" })).toBeVisible();
    await expect(sections.nth(3).getByText(/1 option désactivée/)).toBeVisible();
  });

  test("stock : modification groupée (écarts calculés), « Mettre tout à »", async ({ page, request }) => {
    await page.goto("/admin/stock");
    const rec = page.getByTestId("stock-section").filter({ visible: true }).nth(2);
    await rec.getByLabel("Stock Mint").fill("20"); // 8 → 20 : +12
    await rec.getByTestId("stock-save").click();
    await expect.poll(async () => (await (await request.get(`${MOCK}/__last`)).json()).admin.length).toBe(1);
    expect((await (await request.get(`${MOCK}/__last`)).json()).admin[0]).toMatchObject({ fn: "stock", p_delta: 12, p_note: "Mise à jour du stock", p_actor: ADMIN_ID });
    await expect(rec.getByRole("status")).toContainText("1 modification");
  });

  test("stock : « Mettre tout à » remplit toutes les cases du kit", async ({ page }) => {
    await page.goto("/admin/stock");
    const kit = page.getByTestId("stock-section").filter({ visible: true }).first();
    await kit.getByLabel("Quantité pour tout remplir").fill("15");
    await kit.getByRole("button", { name: "Remplir" }).click();
    for (const i of [0, 1, 2]) await expect(kit.getByTestId("stock-input").nth(i)).toHaveValue("15");
  });

  test("stock : nouvelle saveur de recharge (sans couleur) puis nouvelle saveur de kit créée pour toutes les couleurs", async ({ page, request }) => {
    await page.goto("/admin/stock");
    const rec = page.getByTestId("stock-section").filter({ visible: true }).nth(2);
    await rec.getByLabel("Nouvelle saveur").fill("Mango Ice");
    await rec.getByLabel("Prix FCFA").fill("6000");
    await rec.getByLabel("Stock de départ").fill("12");
    await rec.getByRole("button", { name: "Ajouter" }).click();
    await expect.poll(async () => (await (await request.get(`${MOCK}/__last`)).json()).admin.length).toBeGreaterThanOrEqual(2);
    const admin = (await (await request.get(`${MOCK}/__last`)).json()).admin as Record<string, unknown>[];
    expect(admin.find((c) => c.fn === "write" && c.table === "product_variants")).toMatchObject({ method: "POST", body: { sku: "NP-REC-MANGOICE", color: null, flavor: "Mango Ice", price_fcfa: 6000 } });
    expect(admin.find((c) => c.fn === "stock")).toMatchObject({ p_delta: 12, p_note: "Stock initial", p_actor: ADMIN_ID });
  });

  test("stock : une nouvelle saveur de kit est créée pour toutes les couleurs", async ({ page, request }) => {
    await page.goto("/admin/stock");
    const kit = page.getByTestId("stock-section").filter({ visible: true }).first();
    await kit.getByLabel("Nouvelle saveur (créée pour toutes les couleurs)").fill("Mango Ice");
    await kit.getByLabel("Prix FCFA").first().fill("11000");
    await kit.getByLabel("Stock par couleur").fill("5");
    await kit.getByRole("button", { name: "Ajouter la saveur" }).click();
    await expect.poll(async () => (await (await request.get(`${MOCK}/__last`)).json()).admin.filter((c: { fn: string }) => c.fn === "write" && true).length).toBeGreaterThanOrEqual(2);
    const admin = (await (await request.get(`${MOCK}/__last`)).json()).admin as { fn: string; table?: string; method?: string; body?: Record<string, unknown> }[];
    const created = admin.filter((c) => c.fn === "write" && c.table === "product_variants" && c.method === "POST").map((c) => `${c.body?.color}|${c.body?.flavor}`);
    expect(created.sort()).toEqual(["Bleu|Mango Ice", "Noir|Mango Ice"]);
  });
});
