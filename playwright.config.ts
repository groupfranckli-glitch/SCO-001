import { defineConfig, devices } from "@playwright/test";

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  NEXT_DIST_DIR: ".next-e2e",
};

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    // Chromium préinstallé dans l'environnement ; en CI standard, retirer cette ligne et lancer `playwright install`.
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    { command: "node e2e/mock-supabase.mjs", port: 54321, reuseExistingServer: false },
    {
      // Les variables NEXT_PUBLIC_* sont figées à la compilation : on compile avec l'URL du faux serveur.
      command: "npx next build && npx next start -p 3100 -H 127.0.0.1",
      port: 3100,
      timeout: 240_000,
      reuseExistingServer: false,
      env,
    },
  ],
});
