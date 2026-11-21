import { expect, test, type Page } from "@playwright/test";

const BASE = "http://127.0.0.1:3100";
const MOCK = "http://127.0.0.1:54321";
const PASSWORD = "Bon-mot-de-passe-1";

const calls = async (request: import("@playwright/test").APIRequestContext) => (await (await request.get(`${MOCK}/__last`)).json()).admin as Record<string, unknown>[];

async function open(page: Page, mode = "connexion") {
  await page.context().addCookies([{ name: "sp_age_ok", value: "1", url: BASE }]);
  await page.goto(`/connexion?mode=${mode}`);
}
const form = (page: Page) => page.locator("form").filter({ visible: true }).first();
async function fillLogin(page: Page, email: string, password: string) {
  const f = form(page);
  await f.locator("input[name=email]").fill(email);
  await f.locator("input[name=password]").fill(password);
  await f.getByRole("button", { name: "Se connecter" }).click();
}

test("connexion réussie : le client arrive dans son compte", async ({ page }) => {
  await open(page);
  await fillLogin(page, "client@test.fr", PASSWORD);
  await expect(page).toHaveURL(/\/compte/);
});

test("mauvais mot de passe : message clair, pas de crash", async ({ page }) => {
  await open(page);
  await fillLogin(page, "client@test.fr", "Mauvais-mot-de-passe-9");
  await expect(page.locator("span[role=alert]:visible, p[role=alert]:visible").first()).toContainText("E-mail ou mot de passe incorrect");
});

test("adresse non confirmée : message spécifique", async ({ page }) => {
  await open(page);
  await fillLogin(page, "nonconfirme@test.fr", PASSWORD);
  await expect(page.locator("p[role=alert]:visible").first()).toContainText("pas encore confirmée");
});

test("trop de tentatives : le visiteur est freiné", async ({ page }) => {
  await open(page);
  await fillLogin(page, "limite@test.fr", PASSWORD);
  await expect(page.locator("p[role=alert]:visible").first()).toContainText("Trop de tentatives");
});

test("inscription : un code est envoyé par e-mail, le client le saisit et arrive dans son compte", async ({ page, request }) => {
  await open(page, "inscription");
  const f = form(page);
  const email = `nouveau-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.fr`;
  await f.locator("input[name=name]").fill("Awa Koné");
  await f.locator("input[name=email]").fill(email);
  await f.locator("input[name=password]").fill(PASSWORD);
  await f.locator("input[name=adult]").check();
  await f.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByText("Vérifiez votre e-mail")).toBeVisible();
  await expect(page.getByText(email).first()).toBeVisible();
  const c = await calls(request);
  expect(c.some((x) => x.fn === "signUp" && x.email === email)).toBe(true);
  // mauvais code puis bon code
  await page.locator("input[name=token]").fill("000000");
  await page.getByRole("button", { name: "Valider le code" }).click();
  await expect(page.locator("p[role=alert]:visible").first()).toContainText("Code incorrect ou expiré");
  await page.locator("input[name=token]").fill("123456");
  await page.getByRole("button", { name: "Valider le code" }).click();
  await expect(page).toHaveURL(/\/compte/);
});

test("inscription : renvoi d'un nouveau code", async ({ page }) => {
  await open(page, "inscription");
  const f = form(page);
  await f.locator("input[name=name]").fill("Awa Koné");
  await f.locator("input[name=email]").fill(`renvoi-${Date.now()}@test.fr`);
  await f.locator("input[name=password]").fill(PASSWORD);
  await f.locator("input[name=adult]").check();
  await f.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByRole("button", { name: "Renvoyer un code" }).click();
  await expect(page.getByText("nouveau code vient d'être envoyé")).toBeVisible();
});

test("inscription : si l'envoi du code échoue, le client n'est pas bloqué (repli serveur)", async ({ page }) => {
  await open(page, "inscription");
  const f = form(page);
  await f.locator("input[name=name]").fill("Awa Koné");
  await f.locator("input[name=email]").fill(`mailko-${Date.now()}@test.fr`);
  await f.locator("input[name=password]").fill(PASSWORD);
  await f.locator("input[name=adult]").check();
  await f.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/compte/);
});

test("inscription avec une adresse déjà utilisée : message clair", async ({ page }) => {
  await open(page, "inscription");
  const f = form(page);
  await f.locator("input[name=name]").fill("Awa Koné");
  await f.locator("input[name=email]").fill("existe@test.fr");
  await f.locator("input[name=password]").fill(PASSWORD);
  await f.locator("input[name=adult]").check();
  await f.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.locator("p[role=alert]:visible").first()).toContainText("existe déjà");
});

test("un robot qui remplit le champ piège est refusé", async ({ page, request }) => {
  await open(page, "inscription");
  const f = form(page);
  const email = `robot-${Date.now()}@test.fr`;
  await f.locator("input[name=name]").fill("Robot");
  await f.locator("input[name=email]").fill(email);
  await f.locator("input[name=password]").fill(PASSWORD);
  await f.locator("input[name=adult]").check();
  await f.locator("input[name=website]").evaluate((el: HTMLInputElement) => (el.value = "http://spam"));
  await f.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.locator("p[role=alert]:visible").first()).toContainText("impossible");
  expect((await calls(request)).some((x) => x.email === email)).toBe(false);
});
