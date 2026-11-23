import { expect, test, type Page } from "@playwright/test";

const BASE = "http://127.0.0.1:3100";

async function adult(page: Page) {
  await page.context().addCookies([{ name: "sp_age_ok", value: "1", url: BASE }]);
}

async function noOverflow(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(0);
}

/** Attend la fin de l'affichage progressif : plus de bloc de transition caché dans la page. */
async function settled(page: Page) {
  await page.waitForFunction(() => !document.querySelector('div[hidden][id^="S:"]'), undefined, { timeout: 15_000 });
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

  test("boutique : grille de 4 tuiles, images chargées, sans débordement", async ({ page }) => {
    await page.goto("/boutique");
    await expect(page.getByTestId("collection-tile")).toHaveCount(4);
    await imagesLoaded(page);
    await noOverflow(page);
    await expect(page.getByTestId("collection-tile")).toHaveCount(4);
    await page.getByTestId("collection-tile").filter({ hasText: "NexBAR" }).first().click();
    await expect(page).toHaveURL(/\/boutique\/nexbar$/);
  });

  test("chaque tuile mène à sa propre page, sans mélange de produits", async ({ page }) => {
    const cases: [string, string, string][] = [
      ["Kit NexPOD", "/boutique/nexpod", "Kit NexPOD"],
      ["Batteries", "/boutique/batteries", "Batterie NexPOD"],
      ["Recharges", "/boutique/recharges", "Recharges NexPOD"],
      ["NexBAR", "/boutique/nexbar", "NexBAR 10K"],
    ];
    for (const [tile, url, heading] of cases) {
      await page.goto("/boutique");
      await page.getByTestId("collection-tile").filter({ hasText: tile }).first().click();
      await expect(page).toHaveURL(new RegExp(`${url}$`));
      await expect(page.getByTestId("product-sheet")).toHaveCount(1);
      await expect(page.getByTestId("product-sheet").getByRole("heading", { name: heading })).toBeVisible();
    }
    await page.goto("/boutique/kits");
    await expect(page.getByText(/introuvable|404|n'existe pas/i).first()).toBeVisible();
  });

  test("batteries : les 4 couleurs, prix, stock et photo par couleur", async ({ page }) => {
    await page.goto("/boutique/batteries");
    await imagesLoaded(page, "main article:first-of-type");
    await noOverflow(page);
    const sheet = page.getByTestId("product-sheet");
    await expect(sheet.getByTestId("variant-option")).toHaveCount(4);
    await expect(sheet.getByTestId("price")).toHaveText(/10\s000\sFCFA/);
    const img = sheet.locator("img").first();
    await sheet.getByRole("button", { name: "Voir Rouge" }).click();
    await expect(img).toHaveAttribute("src", /battery-rouge/);
    await sheet.getByRole("button", { name: "Voir Noir" }).click();
    await expect(img).toHaveAttribute("src", /battery-noir/);
    await sheet.getByRole("button", { name: /Voir Violet/ }).click();
    await expect(sheet.getByTestId("stock")).toHaveText("Épuisé");
    await expect(sheet.getByRole("button", { name: "Augmenter Violet" })).toHaveCount(0);
    await expect(sheet.getByTestId("add-to-cart")).toBeDisabled();
    await expect(sheet.getByTestId("order-now")).toBeDisabled();
  });

  test("kit : on choisit une couleur et une saveur, plusieurs combinaisons possibles", async ({ page }) => {
    await page.goto("/boutique/nexpod");
    await settled(page);
    const sheet = page.getByTestId("product-sheet");
    await expect(sheet).toHaveCount(1);
    await expect(sheet.getByTestId("composer")).toBeVisible();
    await expect(sheet.getByTestId("color-option")).toHaveCount(2);
    await expect(sheet.getByTestId("flavor-option")).toHaveCount(2);
    await sheet.getByRole("radio", { name: "Noir" }).click();
    await sheet.getByRole("radio", { name: /Double Apple/ }).click();
    await expect(sheet.getByTestId("combo")).toContainText("Épuisé");
    await expect(sheet.getByRole("button", { name: /Augmenter Noir · Double Apple/ })).toHaveCount(0);
    await sheet.getByRole("radio", { name: /Peach Ice/ }).click();
    const plusNoir = sheet.getByRole("button", { name: "Augmenter Noir · Peach Ice" });
    await plusNoir.click();
    await plusNoir.click();
    await sheet.getByRole("radio", { name: "Bleu" }).click();
    await sheet.getByRole("button", { name: "Augmenter Bleu · Peach Ice" }).click();
    await expect(sheet.getByTestId("composer-lines")).toContainText("2 × Noir · Peach Ice");
    await expect(sheet.getByTestId("composer-lines")).toContainText("1 × Bleu · Peach Ice");
    await expect(sheet.getByTestId("selection-summary")).toContainText("3 articles");
    await sheet.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("cart-count")).toHaveText("3");
    await page.goto("/panier");
    await expect(page.getByTestId("cart-line")).toHaveCount(2);
    await expect(page.getByTestId("cart-line").first()).toContainText("Peach Ice");
  });

  test("recharges : uniquement les saveurs de recharge", async ({ page }) => {
    await page.goto("/boutique/recharges");
    const sheet = page.getByTestId("product-sheet");
    await expect(sheet).toHaveCount(1);
    await expect(sheet.getByTestId("variant-option")).toHaveCount(2);
    await expect(sheet.getByText("Mint").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Batterie NexPOD" })).toHaveCount(0);
  });

  test("NexBAR : une variante désactivée n'est pas proposée", async ({ page }) => {
    await page.goto("/boutique/nexbar");
    const sheet = page.getByTestId("product-sheet");
    await expect(sheet.getByTestId("variant-option")).toHaveCount(3);
    await expect(sheet.getByRole("button", { name: /Desactivee/ })).toHaveCount(0);
    await sheet.getByRole("button", { name: "Voir Peach Ice" }).click();
    await expect(sheet.locator("img").first()).toHaveAttribute("src", /peach-ice/);
  });

  test("panier : ajout, plafond de stock, persistance, quantité, retrait", async ({ page }) => {
    await page.goto("/boutique/batteries");
    const sheet = page.getByTestId("product-sheet").first();
    // Bleu est la 1re couleur vendable (stock 3)
    await expect(sheet.getByTestId("stock")).toHaveText("Plus que 3 en stock");
    const plus = sheet.getByRole("button", { name: "Augmenter Bleu" });
    await plus.click();
    await plus.click();
    await plus.click();
    await expect(sheet.getByTestId("option-qty").first()).toHaveText("3");
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
    await settled(page);
    await expect(page.getByTestId("product-sheet")).toHaveCount(1); // attend la fin de l'affichage progressif de la page
    await expect(page.getByTestId("order-now")).toBeDisabled(); // rien choisi
    await page.getByRole("button", { name: "Augmenter Peach Ice" }).click();
    await page.getByTestId("order-now").click();
    await expect(page).toHaveURL(/\/panier$/);
    await expect(page.getByTestId("cart-line")).toHaveCount(1);
    await page.getByTestId("checkout-link").click();
    await expect(page).toHaveURL(/\/commande$/);
    await expect(page.getByRole("heading", { name: /commande/i })).toBeVisible();
  });

  test("choix multiple : plusieurs saveurs avec leurs quantités dans un seul ajout", async ({ page }) => {
    await page.goto("/boutique/nexbar");
    await settled(page);
    const sheet = page.getByTestId("product-sheet");
    const rows = sheet.getByTestId("variant-option");
    await expect(rows).toHaveCount(3);
    const up = (i: number) => rows.nth(i).getByRole("button", { name: /^Augmenter / });
    await up(0).click();
    await up(0).click();
    await up(1).click();
    await expect(sheet.getByTestId("selection-summary")).toContainText("3 articles");
    await sheet.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("cart-count")).toHaveText("3");
    await page.goto("/panier");
    await expect(page.getByTestId("cart-line")).toHaveCount(2);
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
    await expect(page.locator('[data-testid="search-summary"]:visible')).toContainText("2 résultats"); // NexBAR et Kit NexPOD proposent Peach Ice
    await expect(page.getByTestId("product-card")).toHaveCount(2);
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
