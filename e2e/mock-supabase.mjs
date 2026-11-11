// Faux PostgREST pour les tests e2e : jamais utilisé en production.
import http from "node:http";

const v = (id, sku, o) => ({ id, sku, is_active: true, color: null, flavor: null, stock_reserved: 0, ...o });
const cat = { nexpod: { slug: "nexpod", name: "NexPOD" }, nexbar: { slug: "nexbar", name: "NexBAR" } };

const products = [
  {
    id: "p1", slug: "nexpod-batterie", name: "Batterie NexPOD", kind: "nexpod_battery", puffs: null,
    description: "Batterie rechargeable compatible avec toutes les recharges NexPOD.", categories: cat.nexpod,
    product_variants: [
      v("v1", "NP-B-NOIR", { color: "Noir", price_fcfa: 10000, stock_on_hand: 12 }),
      v("v2", "NP-B-BLEU", { color: "Bleu", price_fcfa: 10000, stock_on_hand: 3 }),
      v("v3", "NP-B-VIOLET", { color: "Violet", price_fcfa: 10000, stock_on_hand: 0 }),
      v("v4", "NP-B-ROUGE", { color: "Rouge", price_fcfa: 10000, stock_on_hand: 30 }),
    ],
  },
  {
    id: "p2", slug: "nexpod-recharge", name: "Recharge NexPOD", kind: "nexpod_refill", puffs: 5000,
    description: "Recharge préremplie, prête à l'emploi.", categories: cat.nexpod,
    product_variants: [
      v("v5", "NP-R-MINT", { flavor: "Mint", price_fcfa: 6000, stock_on_hand: 8 }),
      v("v6", "NP-R-3M", { flavor: "Three Melons", price_fcfa: 6000, stock_on_hand: 8 }),
    ],
  },
  {
    id: "p3", slug: "nexpod-kit", name: "Kit NexPOD", kind: "nexpod_kit", puffs: 5000,
    description: "Batterie et recharge, prêts à l'emploi.", categories: cat.nexpod,
    product_variants: [v("v7", "NP-K-NOIR", { color: "Noir", price_fcfa: 11000, stock_on_hand: 5 })],
  },
  {
    id: "p4", slug: "nexbar-10k", name: "NexBAR 10K", kind: "nexbar", puffs: 10000,
    description: "Puff jetable 10 000 puffs.", categories: cat.nexbar,
    product_variants: [
      v("v8", "NB-SK", { flavor: "Strawberry Kiwi", price_fcfa: 10000, stock_on_hand: 20 }),
      v("v9", "NB-PI", { flavor: "Peach Ice", price_fcfa: 10000, stock_on_hand: 20 }),
      v("v10", "NB-DA", { flavor: "Double Apple", price_fcfa: 10000, stock_on_hand: 20 }),
      v("v11", "NB-OFF", { flavor: "Desactivee", price_fcfa: 10000, stock_on_hand: 20, is_active: false }),
    ],
  },
];
const categories = [
  { slug: "nexpod", name: "NexPOD", position: 1 },
  { slug: "nexbar", name: "NexBAR", position: 2 },
];

const eq = (url, key) => {
  const raw = url.searchParams.get(key);
  return raw?.startsWith("eq.") ? raw.slice(3) : null;
};

const zones = ["Cocody", "Marcory", "Yopougon"].map((commune, i) => ({ commune, fee_fcfa: 1000 + i * 500, position: i }));
const mkUser = (id, email) => ({ id, email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" });
const CUSTOMER = mkUser("11111111-1111-4111-8111-111111111111", "awa@example.com");
const ADMIN = mkUser("22222222-2222-4222-8222-222222222222", "admin@scopuff.test");
const ORDERS = () => [
  {
    id: "00000000-0000-4000-8000-0000000000b1", order_number: "SP-TEST-0001", status: "pending", subtotal_fcfa: 20000, delivery_fee_fcfa: 1000, discount_fcfa: 2000, promo_code: "WELCOME10", total_fcfa: 19000,
    delivery_name: "Awa Koné", delivery_phone: "0700000000", delivery_commune: "Cocody", delivery_quartier: "Riviera", delivery_address: "Rue 12", delivery_landmark: null, delivery_notes: null,
    created_at: new Date().toISOString(),
    order_items: [{ product_name: "NexBAR 10K", variant_label: "Peach Ice", unit_price_fcfa: 10000, quantity: 2 }],
    payments: [{ provider: "cash_on_delivery", status: "pending", amount_fcfa: 19000 }],
    deliveries: { status: "unassigned", cash_collected_fcfa: null },
  },
  {
    id: "00000000-0000-4000-8000-0000000000b2", order_number: "SP-TEST-0002", status: "delivered", subtotal_fcfa: 10000, delivery_fee_fcfa: 1000, discount_fcfa: 0, promo_code: null, total_fcfa: 11000,
    delivery_name: "Koffi Yao", delivery_phone: "0500000000", delivery_commune: "Marcory", delivery_quartier: null, delivery_address: "Avenue 4", delivery_landmark: null, delivery_notes: null,
    created_at: new Date().toISOString(),
    order_items: [{ product_name: "NexBAR 10K", variant_label: "Double Apple", unit_price_fcfa: 10000, quantity: 1 }],
    payments: [{ provider: "cash_on_delivery", status: "paid", amount_fcfa: 11000 }],
    deliveries: { status: "delivered", cash_collected_fcfa: 11000 },
  },
];
const VARIANT_ROWS = [
  { id: "00000000-0000-4000-8000-0000000000a1", sku: "NB-PI", color: null, flavor: "Peach Ice", stock_on_hand: 0, stock_reserved: 0, is_active: true, products: { name: "NexBAR 10K" } },
  { id: "00000000-0000-4000-8000-0000000000a2", sku: "NB-DA", color: null, flavor: "Double Apple", stock_on_hand: 40, stock_reserved: 2, is_active: true, products: { name: "NexBAR 10K" } },
];
const calls = { orders: [], admin: [] };
const userFor = (auth) => (auth === "Bearer test-token" ? CUSTOMER : auth === "Bearer admin-token" ? ADMIN : null);

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const json = (code, body) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    // PostgREST : un `maybeSingle()` demande un objet (Accept vnd.pgrst.object), sinon une liste
    const reply = (rows) => {
      if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) {
        return rows[0] ? json(200, rows[0]) : json(406, { code: "PGRST116", details: "The result contains 0 rows", message: "Cannot coerce" });
      }
      return json(200, rows);
    };
    const body = (cb) => {
      let b = "";
      req.on("data", (c) => (b += c));
      req.on("end", () => cb(JSON.parse(b || "{}")));
    };
    if (url.pathname === "/__last") return json(200, calls);
    if (url.pathname === "/__reset") { calls.orders = []; calls.admin = []; return json(200, {}); }
    if (url.pathname === "/auth/v1/user") {
      const u = userFor(req.headers.authorization ?? "");
      return u ? json(200, u) : json(401, { message: "invalid" });
    }
    if (url.pathname.startsWith("/storage/v1/object/")) {
      let n = 0;
      req.on("data", (c) => (n += c.length));
      return req.on("end", () => { calls.admin.push({ fn: "storage", method: req.method, path: url.pathname, bytes: n, type: req.headers["content-type"] }); json(200, { Key: url.pathname.replace("/storage/v1/object/", "") }); });
    }
    const table = url.pathname.replace("/rest/v1/", "");
    if (["products", "product_variants", "promo_codes", "delivery_zones", "site_settings", "audit_log", "product_images", "banners"].includes(table) && ["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
      return body((b) => { calls.admin.push({ fn: "write", table, method: req.method, query: url.search, body: b }); res.writeHead(204); res.end(); });
    }
    if (table === "products") {
      let rows = products;
      const slug = eq(url, "slug");
      if (slug) rows = rows.filter((p) => p.slug === slug);
      return reply(rows);
    }
    if (table === "categories") return json(200, categories);
    if (table === "home_sections") return json(200, []);
    if (table === "product_images") return reply([]);
    if (table === "banners") return json(200, eq(url, "placement") === "boutique" ? [] : [{ id: "44444444-4444-4444-8444-444444444444", title: "Offre test", alt: null, href: "/boutique", image_path: "banners/x.png", placement: "home", position: 0, is_active: true, starts_at: null, ends_at: null }]);
    if (table === "delivery_zones") return json(200, zones);
    if (table === "profiles") {
      if (eq(url, "role") === "courier") return reply([{ id: "33333333-3333-4333-8333-333333333333", full_name: "Moussa Livreur", phone: "0700000000", role: "courier" }]);
      const id = eq(url, "id");
      return reply([{ role: id === ADMIN.id ? "admin" : "customer", full_name: id === ADMIN.id ? "Équipe SCO PUFF" : "Awa Koné", phone: null }]);
    }
    if (table === "rpc/admin_assign_courier" || table === "rpc/admin_set_role") {
      return body((b) => {
        calls.admin.push({ fn: table.replace("rpc/", ""), ...b });
        if (table === "rpc/admin_set_role" && b.p_email === "inconnu@example.com") return json(400, { code: "P0001", message: "user_not_found" });
        res.writeHead(204); res.end();
      });
    }
    if (url.pathname === "/auth/v1/admin/users") return json(200, { users: [] });
    if (table === "deliveries") return json(200, [{ order_id: "00000000-0000-4000-8000-0000000000b1", courier_id: null, status: "unassigned", orders: { id: "00000000-0000-4000-8000-0000000000b1", order_number: "SP-TEST-0001", status: "pending", delivery_commune: "Cocody", delivery_address: "Rue 12", delivery_phone: "0700000001" } }]);
    if (table === "order_items") return json(200, [{ product_name: "NexBAR 10K", variant_label: "Mangue", quantity: 2, unit_price_fcfa: 10000, orders: { status: "delivered", delivery_commune: "Cocody" } }]);
    if (table === "payments") return json(200, [{ id: "p1", provider: "cash_on_delivery", status: "pending", amount_fcfa: 19000, created_at: "2026-11-01T10:00:00Z", orders: { order_number: "SP-TEST-0001" } }]);
    if (table === "audit_log") return json(200, [{ id: 1, action: "order.status", entity: "order", entity_id: "x", details: { to: "confirmed" }, created_at: "2026-11-01T10:00:00Z" }]);
    if (table === "site_settings") return json(200, [{ key: "home_title", value: "Titre depuis l'admin" }]);
    if (table === "promo_codes") {
      if (!eq(url, "code") && !url.search.includes("code=eq")) return json(200, [{ code: "WELCOME10", kind: "percent", value: 10, min_subtotal_fcfa: 0, max_uses: null, used_count: 3, expires_at: null, is_active: true }]);
      return reply(eq(url, "code") === "WELCOME10"
        ? [{ code: "WELCOME10", kind: "percent", value: 10, min_subtotal_fcfa: 0, max_uses: null, used_count: 0, expires_at: null, is_active: true }]
        : []);
    }
    if (table === "orders") {
      const n = eq(url, "order_number");
      const st = eq(url, "status");
      let rows = ORDERS();
      if (n) rows = rows.filter((o) => o.order_number === n);
      if (st) rows = rows.filter((o) => o.status === st);
      return reply(rows);
    }
    if (table === "product_variants") return json(200, VARIANT_ROWS);
    if (table === "stock_movements") return json(200, []);
    if (table === "rpc/create_order" && req.method === "POST") {
      return body((b) => {
        calls.orders.push(b);
        json(200, [{ r_order_id: "00000000-0000-4000-8000-0000000000b1", r_order_number: "SP-TEST-0001", r_total: 19000, r_replayed: false }]);
      });
    }
    if (table === "rpc/admin_set_order_status" && req.method === "POST") {
      return body((b) => { calls.admin.push({ fn: "status", ...b }); res.writeHead(204); res.end(); });
    }
    if (table === "rpc/admin_adjust_stock" && req.method === "POST") {
      return body((b) => {
        calls.admin.push({ fn: "stock", ...b });
        if (b.p_delta < -100) return json(400, { code: "23514", message: "violates check constraint reserved_le_on_hand" });
        res.writeHead(204); res.end();
      });
    }
    json(404, { message: "not mocked", table });
  })
  .listen(54321, "127.0.0.1", () => console.log("mock supabase on 54321"));
