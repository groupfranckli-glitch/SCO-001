import { expect, test, type Page } from "@playwright/test";

const BASE = "http://127.0.0.1:3100";
const MOCK = "http://127.0.0.1:54321";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function asAdmin(page: Page) {
  const session = {
    access_token: "admin-token", refresh_token: "r", token_type: "bearer", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: { id: "22222222-2222-4222-8222-222222222222", email: "admin@scopuff.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" },
  };
  await page.context().addCookies([
    { name: "sb-127-auth-token", value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"), url: BASE },
    { name: "sp_age_ok", value: "1", url: BASE },
  ]);
}
const calls = async (request: import("@playwright/test").APIRequestContext) => (await (await request.get(`${MOCK}/__last`)).json()).admin as Record<string, unknown>[];

test.beforeEach(async ({ request }) => {
  await request.get(`${MOCK}/__reset`);
});

test("la page Médias liste le logo, les images du site et les bannières", async ({ page }) => {
  await asAdmin(page);
  await page.goto("/admin/medias");
  await expect(page.getByTestId("slot-logo").filter({ visible: true })).toBeVisible();
  await expect(page.getByTestId("slot-hero").filter({ visible: true })).toBeVisible();
  await expect(page.getByTestId("banner-admin").filter({ visible: true }).first()).toContainText("Enregistrer");
});

test("téléverser le logo : fichier vérifié, rangé dans le stockage, réglage enregistré", async ({ page, request }) => {
  await asAdmin(page);
  await page.goto("/admin/medias");
  const slot = page.getByTestId("slot-logo").filter({ visible: true });
  await slot.locator('input[type=file]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await slot.getByRole("button", { name: "Téléverser" }).click();
  await expect(slot.getByText("Image enregistrée")).toBeVisible();
  const c = await calls(request);
  expect(c.some((x) => x.fn === "storage" && x.method === "POST" && String(x.path).includes("/site-media/site/") && String(x.path).endsWith(".png"))).toBe(true);
  expect(c.some((x) => x.fn === "write" && x.table === "site_settings" && JSON.stringify(x.body).includes("img_logo"))).toBe(true);
});

test("un fichier qui n'est pas une image est refusé par le serveur, même renommé en .png", async ({ page }) => {
  await asAdmin(page);
  await page.goto("/admin/medias");
  const slot = page.getByTestId("slot-hero").filter({ visible: true });
  await slot.locator('input[type=file]').setInputFiles({ name: "faux.png", mimeType: "image/png", buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>") });
  await slot.getByRole("button", { name: "Téléverser" }).click();
  await expect(slot.getByRole("alert")).toContainText("Format refusé");
});

test("créer une bannière enregistre l'image puis la ligne", async ({ page, request }) => {
  await asAdmin(page);
  await page.goto("/admin/medias");
  const form = page.getByTestId("banner-new").filter({ visible: true });
  await form.locator('input[type=file]').setInputFiles({ name: "b.png", mimeType: "image/png", buffer: PNG });
  await form.locator('input[name=title]').fill("Promo de la semaine");
  await form.locator('input[name=href]').fill("/boutique/nexbar");
  await form.getByRole("button", { name: "Publier la bannière" }).click();
  await expect(form.getByText("Image enregistrée")).toBeVisible();
  const c = await calls(request);
  expect(c.some((x) => x.fn === "write" && x.table === "banners" && JSON.stringify(x.body).includes("Promo de la semaine") && JSON.stringify(x.body).includes("banners/"))).toBe(true);
});

test("un lien de bannière dangereux (javascript:) est refusé", async ({ page, request }) => {
  await asAdmin(page);
  await page.goto("/admin/medias");
  const form = page.getByTestId("banner-new").filter({ visible: true });
  await form.locator('input[type=file]').setInputFiles({ name: "b.png", mimeType: "image/png", buffer: PNG });
  await form.locator('input[name=title]').fill("Piège");
  await form.locator('input[name=href]').fill("javascript:alert(1)");
  await form.getByRole("button", { name: "Publier la bannière" }).click();
  await expect(form.getByRole("alert")).toContainText("Le lien doit commencer");
  expect((await calls(request)).some((x) => x.table === "banners" && JSON.stringify(x.body).includes("Piège"))).toBe(false);
});

test("la bannière active s'affiche sur la page d'entrée", async ({ page }) => {
  await page.context().addCookies([{ name: "sp_age_ok", value: "1", url: BASE }]);
  await page.goto("/");
  await expect(page.getByTestId("banners")).toContainText("", { timeout: 15000 });
  await expect(page.getByTestId("banners").locator("img")).toHaveCount(1);
});
