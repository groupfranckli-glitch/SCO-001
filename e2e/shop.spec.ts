import { expect, test, type Page } from "@playwright/test";

const BASE = "http://127.0.0.1:3100";

async function adult(page: Page) {
  await page.context().addCookies([{ name: "sp_age_ok", value: "1", url: BASE }]);
}

async function noOverflow(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(0);
}

async function imagesLoaded(page: Page, scope = "main") {
  await page.waitForFunction(
    (sel) => {
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>(`${sel} img`)).filter((i) => !i.closest("[data-testid=banners]"));
      return imgs.length > 0 && imgs.every((i) => i.complete && i.naturalWidth > 0);
    },
    scope,
    { timeout: 15_000 },
  );
}

test.describe("contrôle d'âge", () => {
  test("bloque la boutique tant que la majorité n'est pas déclarée", async ({ page }) => {
    await page.goto("/boutique");
    const gate = page.getByRole("dialog");
    await expect(gate).toBeVisible();
    await gate.getByRole("button", { name: /moins de 18 ans/ }).click();
    await expect(gate.getByRole("alert")).toContainText("réservé aux adultes");
    await expect(gate.getByRole("button", { name: /18 ans ou plus/ })).toHaveCount(0);
  });

  test("ouvre la boutique après déclaration de majorité, et s'en souvient", async ({ page }) => {
    await page.goto("/boutique");
    await page.getByRole("button", { name: /Oui, j'ai 18 ans/ }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("collection-tile").first()).toBeVisible();
  });
});

test.describe("parcours visuel", () => {
  test.beforeEach(async ({ page }) => adult(page));

  test("page d'entrée : menu, logo, recherche, panier et bouton vers la boutique", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Boutique" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Espace client" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /SCO PUFF — accueil/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Rechercher" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Panier" })).toBeVisible();
    await imagesLoaded(page, "body");
    await noOverflow(page);
    await page.getByRole("link", { name: "Découvrir la boutique" }).click();
    await expect(page).toHaveURL(/\/boutique$/);
  });

  test("boutique : grille éditoriale de 5 tuiles, images chargées, sans débordement", async ({ page }) => {
    await page.goto("/boutique");
    await expect(page.getByTestId("collection-tile")).toHaveCount(5);
    await imagesLoaded(page);
    await noOverflow(page);
    await page.getByTestId("collection-tile").filter({ hasText: "NexBAR" }).click();
    await expect(page).toHaveURL(/\/boutique\/nexbar$/);
  });

  test("catégorie NexPOD : fiches alternées, variante → prix, stock et photo", async ({ page }) => {
    await page.goto("/boutique/nexpod");
    await expect(page.getByTestId("product-sheet")).toHaveCount(3);
    await imagesLoaded(page, "main article:first-of-type");
    await noOverflow(page);

    const sheet = page.getByTestId("product-sheet").first();
    await expect(sheet.getByRole("heading", { name: "Batterie NexPOD" })).toBeVisible();
    await expect(sheet.getByTestId("price")).toHaveText(/10\s000\sFCFA/);

    const img = sheet.locator("img").first();
    await sheet.getByRole("radio", { name: "Rouge" }).click();
    await expect(img).toHaveAttribute("src", /battery-rouge/);
    await sheet.getByRole("radio", { name: "Noir" }).click();
    await expect(img).toHaveAttribute("src", /battery-noir/);

    await sheet.getByRole("radio", { name: /Violet/ }).click();
    await expect(sheet.getByTestId("stock")).toHaveText("Épuisé");
    await expect(sheet.getByTestId("add-to-cart")).toBeDisabled();
    await expect(sheet.getByTestId("order-now")).toBeDisabled();
  });

  test("NexBAR : une variante désactivée n'est pas proposée", async ({ page }) => {
    await page.goto("/boutique/nexbar");
    const sheet = page.getByTestId("product-sheet");
    await expect(sheet.getByTestId("variant-option")).toHaveCount(3);
    await expect(sheet.getByRole("radio", { name: /Desactivee/ })).toHaveCount(0);
    await sheet.getByRole("radio", { name: "Peach Ice" }).click();
    await expect(sheet.locator("img").first()).toHaveAttribute("src", /peach-ice/);
  });

  test("panier : ajout, plafond de stock, persistance, quantité, retrait", async ({ page }) => {
    await page.goto("/boutique/nexpod");
    const sheet = page.getByTestId("product-sheet").first();
    // Bleu est la 1re couleur vendable (stock 3)
    await expect(sheet.getByTestId("stock")).toHaveText("Plus que 3 en stock");
    const plus = sheet.getByRole("button", { name: "Augmenter la quantité" });
    await plus.click();
    await plus.click();
    await expect(sheet.getByTestId("qty")).toHaveText("3");
    await expect(plus).toBeDisabled();

    await sheet.getByTestId("add-to-cart").click();
    await expect(sheet.getByRole("status")).toContainText("Ajouté au panier");
    await expect(page.getByTestId("cart-count")).toHaveText("3");

    await page.reload();
    await expect(page.getByTestId("cart-count")).toHaveText("3");

    await page.goto("/panier");
    await expect(page.getByTestId("cart-line")).toHaveCount(1);
    await expect(page.getByTestId("subtotal")).toHaveText(/30\s000\sFCFA/);
    const up = page.getByRole("button", { name: "Augmenter la quantité" });
    await up.click(); // plafonné au stock connu
    await expect(page.getByTestId("line-qty")).toHaveText("3");
    await page.getByRole("button", { name: "Diminuer la quantité" }).click();
    await expect(page.getByTestId("subtotal")).toHaveText(/20\s000\sFCFA/);
    await noOverflow(page);

    await page.getByRole("button", { name: "Retirer" }).click();
    await expect(page.getByTestId("cart-empty")).toBeVisible();
  });

  test("« Commander » ajoute au panier puis ouvre le panier", async ({ page }) => {
    await page.goto("/boutique/nexbar");
    await page.getByTestId("order-now").click();
    await expect(page).toHaveURL(/\/panier$/);
    await expect(page.getByTestId("cart-line")).toHaveCount(1);
    await page.getByTestId("checkout-link").click();
    await expect(page).toHaveURL(/\/commande$/);
    await expect(page.getByRole("heading", { name: /commande/i })).toBeVisible();
  });

  test("un panier falsifié dans le navigateur est ignoré", async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        "scopuff-cart-v1",
        JSON.stringify([{ variantId: "x", productSlug: "s", productName: "N", label: "L", unitPrice: -1, quantity: 9999, maxQty: 1 }]),
      ),
    );
    await page.goto("/panier");
    await expect(page.getByTestId("cart-empty")).toBeVisible();
  });

  test("recherche : trouve par saveur, gère l'absence de résultat", async ({ page }) => {
    await page.goto("/recherche?q=peach");
    await expect(page.locator('[data-testid="search-summary"]:visible')).toContainText("1 résultat");
    await expect(page.getByTestId("product-card")).toHaveCount(1);
    await page.goto("/recherche?q=zzzz");
    await expect(page.locator('[data-testid="search-summary"]:visible')).toContainText("0 résultat");
    await page.goto("/recherche");
    await expect(page.locator("p:visible", { hasText: "Saisissez une saveur" })).toBeVisible();
  });

  test("la boîte de recherche du menu mène aux résultats", async ({ page }) => {
    await page.goto("/boutique");
    await page.getByRole("button", { name: "Rechercher" }).click();
    await page.getByRole("searchbox").fill("mint");
    await page.getByRole("button", { name: "Chercher", exact: true }).click();
    await expect(page).toHaveURL(/\/recherche\?q=mint/);
    await expect(page.getByTestId("product-card")).toHaveCount(1);
  });

  test("pages inconnues : 404 propre, jamais de page blanche", async ({ page }) => {
    const res = await page.goto("/n-importe-quoi");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
    // Routes dynamiques : la page est diffusée en streaming, le statut est déjà parti (200) ;
    // Next ajoute alors <meta name="robots" content="noindex"> pour que Google ne l'indexe pas.
    for (const path of ["/boutique/inconnue", "/produit/inconnu"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
      expect(await page.locator('meta[name="robots"][content*="noindex"]').count()).toBeGreaterThan(0);
    }
  });

  test("espace client : un visiteur est conduit à la connexion, sans page blanche", async ({ page }) => {
    await page.goto("/compte");
    await expect(page).toHaveURL(/\/connexion\?next=\/compte/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });
});
