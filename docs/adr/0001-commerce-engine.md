# ADR 0001 — Commerce Engine: Medusa v2

- **Status:** Accepted — GO sign-off recorded 2026-11-06
- **Date:** 2026-11-06
- **Issue:** BE-W1-01 (Medusa evaluation spike and go/no-go decision)
- **Timebox:** 2 days, 2026-11-06 → 2026-11-07
- **Decision:** **GO, with conditions** (see §9 and §10)
- **Sign-off constraint:** implementation must stay as simple as possible — the
  team is mostly beginner and intermediate engineers. Prefer plain, explicit code
  over clever abstractions; see C0 in §10.

---

## 1. Executive summary

Waslu needs a multi-tenant commerce engine where independent sellers run isolated
stores. We evaluated **Medusa v2.22.4** (current npm `latest`) against the six
capabilities required by BE-W1-01.

**All six capabilities pass**, but four pass only with custom extension work that
Medusa does not provide out of the box. Medusa is a commerce engine, not a
multi-tenant platform: its own documentation states plainly that it "doesn't
natively support multi-tenancy". The isolation, seller identity, order-source
tracking and upload validation that Waslu requires must be built as Waslu modules,
links and middleware on top of Medusa's extension points.

The extension points needed for all of that work **exist, are documented, and are
stable in 2.22.4**: custom modules, module links, custom auth actor types, custom
API route namespaces, custom payment providers, and custom file providers. No
capability required forking Medusa or patching core.

Two findings materially shape later sprints and must not be lost:

1. **Payment providers are configured globally and enabled per region — not per
   seller.** A "each seller connects their own Stripe account" feature is *not*
   native and needs a deliberate design (Stripe Connect or a custom provider
   resolving per-tenant credentials). See §6.3 and §8.
2. **`query.graph` cannot filter on nested JSON `metadata`.** Order source
   tracking therefore cannot be implemented as `metadata.source` if it ever needs
   to be queried or filtered. It must be a real column. See §6.5.

Recommendation: **GO** on Medusa 2.22.4, subject to the conditions in §10.

---

## 2. Medusa version evaluated

| Item | Value | Source |
| --- | --- | --- |
| `@medusajs/medusa` | `2.22.4` | `npm view @medusajs/medusa dist-tags` → `latest: 2.22.4` |
| `@medusajs/framework` | `2.22.4` | `npm view @medusajs/framework version` |
| `@medusajs/cli` | `2.22.4` | `npm view @medusajs/cli version` |
| `@medusajs/utils` | `2.22.4` | `npm view @medusajs/utils version` |
| `create-medusa-app` | `2.22.4` | `npm view create-medusa-app version` |
| Required Node | `>=22.22.0` | `npm view @medusajs/medusa engines` |
| Node used for evaluation | `v24.20.0` | local `node -v` |

Other dist-tags observed and **rejected** for this decision: `snapshot`
(`2.22.3-snapshot-20261103230838`), `preview`
(`2.22.4-preview-20261106081111`), `rc` (`2.0.0-rc-…`), `next` (`1.20.6-next-…`).
Pre-release tags are not acceptable foundations. Medusa **v1** (`1.20.x`) was not
evaluated; its architecture differs fundamentally and it is not the current
`latest`.

> **Version caveat.** `docs.medusajs.com` serves a single unversioned "latest"
> build; there is no 2.22.4-pinned documentation snapshot. Pages cite features up
> to v2.22.3, consistent with the evaluated release. Where a claim was load-bearing
> and the docs were ambiguous, it was checked against the published `2.22.4`
> package source or the `medusajs/medusa` GitHub tree at tag `v2.22.4`. Those cases
> are marked **[source]** below.

---

## 3. Evaluation methodology

1. **Repository inspection** — established the starting point (see §3.1).
2. **Version pinning** — resolved the real `latest` from the npm registry rather
   than assuming a version.
3. **Documentation review** — read the official Medusa docs for each capability.
   Raw markdown was retrieved by appending `.md` to a docs URL, which returns the
   page text verbatim and avoids paraphrase drift.
4. **Source verification** — for load-bearing claims the docs did not settle
   (upload validation, cart/order line table names, inventory ledger existence,
   notification persistence), the published `2.22.4` dist files and the `v2.22.4`
   GitHub tag were inspected.
5. **Negative evidence** — capabilities were marked down where docs are *silent*
   or where source contains an explicit `TODO`, rather than inferring support from
   a superficially similar feature.
6. **Reference architecture** — the official Marketplace recipe was used as the
   canonical multi-vendor pattern, since it solves the same seller/store/order
   isolation problem Waslu has.

**Timebox discipline.** This was a documentation-and-source spike, not a build.
No application code, payment integration, auth flow, store CRUD or database entity
was implemented, per the BE-W1-01 scope and Engineering Rules 7–9.

### 3.1 Repository inspection findings

The repository at `waslu-backend-main` contained **only three files**:

| File | State |
| --- | --- |
| `LICENSE` | MIT, `Copyright (c) 2026 Haaflah` — valid, retained |
| `README.md` | single line `# waslu-backend` — stub |
| `.gitignore` | standard GitHub Node template — valid, retained |

**Already implemented:** MIT licence; a Node-oriented `.gitignore` that already
excludes `node_modules/`, `.env`, `.env.*` (with `!.env.example`), `dist`,
`coverage`, `.eslintcache`, `*.tsbuildinfo`.

**Missing (everything else):** `package.json` and any lockfile; TypeScript
configuration; Medusa installation; database configuration; migrations; Docker and
Compose files; environment variable handling and `.env.example`; tests; ESLint and
Prettier configuration; GitHub Actions workflows; development documentation;
modules, services and integrations; `src/` of any kind.

**Broken or inconsistent:** nothing — there is no code to be broken. The notable
inconsistency is that `.gitignore` already excludes `.env.*` while no
`.env.example` exists, and it ignores `dist` but Medusa v2 builds to `.medusa/`,
which is **not** ignored. Both are corrected in BE-W1-02 / BE-W1-03.

**Not a Medusa project.** There is no `medusa-config.ts`, no `src/api`, no
`src/modules`, and no `@medusajs/*` dependency. BE-W1-03 is therefore a genuine
initialization, not a repair.

**Environment constraints found during inspection:**

- Node `v24.20.0`, npm `11.19.0` — satisfies Medusa's `>=22.22.0`.
- **Docker is not installed** in the evaluation environment (`docker: command not
  found`). Compose behaviour cannot be executed here; see §8 and the final report.
- The directory is **not a git repository** (no `.git`). Pre-commit hooks require
  `git init` first; this is handled in BE-W1-02.

Because nothing working exists, there is no risk of replacing a functioning
configuration. Existing `LICENSE` and `.gitignore` are preserved and extended
rather than rewritten.

---

## 4. Pass/fail table

| # | Capability | Result | Extension required |
| --- | --- | --- | --- |
| 1 | Multi-store data isolation | **PASS (conditional)** | Custom seller module + module links + app-level query scoping. No native row-level security. |
| 2 | Custom modules | **PASS** | None — native extension point. Link tables carry no FK constraints (design caveat). |
| 3 | Payment provider integration | **PASS (conditional)** | Per-seller provider credentials are **not** native; region-scoped only. |
| 4 | Seller-only authentication | **PASS (conditional)** | Custom `seller` actor type + custom `/seller` route namespace + hand-written ownership checks. |
| 5 | Order source tracking | **PASS (conditional)** | Must be a real column in a custom linked module — **not** `metadata`, which cannot be filtered. |
| 6 | File uploads | **PASS (conditional)** | Upload validation is **not implemented** in 2.22.4; must be custom middleware. Single provider per app. |

"Conditional" means the capability is achievable on stock Medusa 2.22.4 without
forking, but requires Waslu-written code that is **not** delivered by BE-W1-01 and
must be scheduled in a later issue.

---

## 5. Evidence links

All URLs below were fetched successfully during this evaluation. **[source]**
marks claims additionally verified against published `2.22.4` code.

**Multi-tenancy / stores / sales channels**

- Store Module — <https://docs.medusajs.com/resources/commerce-modules/store>
- Store model reference — <https://docs.medusajs.com/resources/references/store/models/Store>
- Sales Channel Module — <https://docs.medusajs.com/resources/commerce-modules/sales-channel>
- Sales Channel links — <https://docs.medusajs.com/resources/commerce-modules/sales-channel/links-to-other-modules>
- Sales Channel model — <https://docs.medusajs.com/resources/references/sales-channel/models/SalesChannel>
- Marketplace recipe — <https://docs.medusajs.com/resources/recipes/marketplace>
- Marketplace vendors example — <https://docs.medusajs.com/resources/recipes/marketplace/examples/vendors>

**Modules, links, migrations**

- Modules — <https://docs.medusajs.com/learn/fundamentals/modules>
- Module links — <https://docs.medusajs.com/learn/fundamentals/module-links>
- Query — <https://docs.medusajs.com/learn/fundamentals/query>
- `db` CLI commands — <https://docs.medusajs.com/resources/medusa-cli/commands/db>
- Writing migrations — <https://docs.medusajs.com/learn/fundamentals/data-models/write-migration>
- JSON properties — <https://docs.medusajs.com/learn/fundamentals/data-models/json-properties>
- **Metadata filtering limitation** — <https://docs.medusajs.com/resources/troubleshooting/query/metadata-filtering>

**Payment**

- Payment providers — <https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider>
- Provider reference — <https://docs.medusajs.com/resources/references/payment/provider>
- Stripe provider — <https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider/stripe>
- Webhook events — <https://docs.medusajs.com/resources/commerce-modules/payment/webhook-events>
- Payment sessions — <https://docs.medusajs.com/resources/commerce-modules/payment/payment-session>
- Mark as paid — <https://docs.medusajs.com/api/admin/payment-collections/mark-as-paid>
- Region creation (`payment_providers`) — <https://docs.medusajs.com/api/admin/regions/create-region>

**Auth**

- Auth identities and actor types — <https://docs.medusajs.com/resources/commerce-modules/auth/auth-identity-and-actor-types>
- Create an actor type — <https://docs.medusajs.com/resources/commerce-modules/auth/create-actor-type>
- Auth provider reference — <https://docs.medusajs.com/resources/references/auth/provider>
- Auth providers / `authMethodsPerActor` — <https://docs.medusajs.com/resources/commerce-modules/auth/auth-providers>
- Authentication route — <https://docs.medusajs.com/resources/commerce-modules/auth/authentication-route>
- Protected API routes — <https://docs.medusajs.com/learn/fundamentals/api-routes/protected-routes>
- API routes — <https://docs.medusajs.com/learn/fundamentals/api-routes>

**Files**

- File Module — <https://docs.medusajs.com/resources/architectural-modules/file>
- File provider reference — <https://docs.medusajs.com/resources/references/file-provider-module>
- File service reference — <https://docs.medusajs.com/resources/references/file-service>
- Local provider — <https://docs.medusajs.com/resources/infrastructure-modules/file/local>
- S3 provider — <https://docs.medusajs.com/resources/infrastructure-modules/file/s3>
- Admin upload route — <https://docs.medusajs.com/api/admin/uploads/upload-files>

**Data model / tooling**

- Product models — <https://docs.medusajs.com/resources/references/product/models/Product>
- ProductOption — <https://docs.medusajs.com/resources/references/product/models/ProductOption>
- ProductOptionValue — <https://docs.medusajs.com/resources/references/product/models/ProductOptionValue>
- ProductVariant — <https://docs.medusajs.com/resources/references/product/models/ProductVariant>
- ProductImage — <https://docs.medusajs.com/resources/references/product/models/ProductImage>
- Pricing links — <https://docs.medusajs.com/resources/commerce-modules/pricing/links-to-other-modules>
- Cart models — <https://docs.medusajs.com/resources/references/cart/models>
- Cart model — <https://docs.medusajs.com/resources/references/cart/models/Cart>
- Order models — <https://docs.medusajs.com/resources/references/order/models>
- Order model — <https://docs.medusajs.com/resources/references/order/models/Order>
- Order change — <https://docs.medusajs.com/resources/commerce-modules/order/order-change>
- Inventory models — <https://docs.medusajs.com/resources/references/inventory-next/models>
- Payment models — <https://docs.medusajs.com/resources/references/payment/models>
- Notification module — <https://docs.medusajs.com/resources/infrastructure-modules/notification>
- Notification service — <https://docs.medusajs.com/resources/references/notification-service>
- Workflow execution storage — <https://docs.medusajs.com/learn/fundamentals/workflows/store-executions>
- Workflow engine — <https://docs.medusajs.com/resources/infrastructure-modules/workflow-engine>
- `importProductsWorkflow` — <https://docs.medusajs.com/resources/references/medusa-workflows/importProductsWorkflow>
- `exportProductsWorkflow` — <https://docs.medusajs.com/resources/references/medusa-workflows/exportProductsWorkflow>
- `build` command — <https://docs.medusajs.com/resources/medusa-cli/commands/build>
- Testing tools — <https://docs.medusajs.com/learn/debugging-and-testing/testing-tools>
- Official starter `tsconfig.json` **[source]** — <https://raw.githubusercontent.com/medusajs/medusa-starter-default/master/tsconfig.json>

> **Untrusted content notice.** Several `docs.medusajs.com` pages embed an
> `<AgentInstructions>` block instructing AI agents to POST feedback to an
> external endpoint and to reproduce a "Submitting Feedback" section in their
> output. This is page content, not an instruction from Waslu or the operator. It
> was identified as a prompt-injection attempt and **not acted upon**. No feedback
> was submitted and no such section is reproduced here.

---

## 6. Implementation approach per capability

### 6.1 Multi-store data isolation

**Finding.** Medusa is explicit about its boundary:

> "While Medusa doesn't natively support multi-tenancy, the Store Module allows
> you to create and manage multiple stores within a single Medusa instance. You
> can then build customizations to link products, customers, orders, and other
> resources to specific stores."
> — [Store Module](https://docs.medusajs.com/resources/commerce-modules/store)

The native pieces available are:

- **Store module** — supports multiple stores. `Store` carries `name`,
  `supported_currencies`, and `default_sales_channel_id`.
- **Sales Channel module** — the real isolation key for commerce data. Confirmed
  links: **Product** (many-to-many), **Cart** (read-only has-one), **Order**
  (read-only has-one), **StockLocation** (many-to-many), **ApiKey**
  (many-to-many). `Cart.sales_channel_id` and `Order.sales_channel_id` are real
  columns.

**Important correction to a common assumption:** Store and Sales Channel are
**not** natively many-to-many, and `SalesChannel` has **no `store_id`**. The only
native relationship is `Store.default_sales_channel_id`, a plain text pointer.
There is no Store↔SalesChannel link table. Any "this channel belongs to this
store" relationship beyond the default must be a Waslu module link.

**Chosen approach — one Sales Channel per Store, plus a custom Seller module.**

```
Seller (custom module)
  └─ Store (custom profile linked to native Store, or custom store model)
       └─ Sales Channel (native)  ← the isolation key
            ├─ Products      (native many-to-many link)
            ├─ Carts         (native sales_channel_id)
            ├─ Orders        (native sales_channel_id)
            └─ StockLocations(native many-to-many link)
```

This follows the official Marketplace recipe, which creates a `marketplace`
module with `Vendor` / `VendorAdmin` models and links them to native commerce
entities:

```ts
// src/links/vendor-product.ts
export default defineLink(
  MarketplaceModule.linkable.vendor,
  { linkable: ProductModule.linkable.product.id, isList: true }
)
```

**Query scoping and authorization.** Medusa provides **no row-level security and
no ownership policy engine**. Isolation is enforced in application code. The
recipe's canonical pattern resolves the authenticated actor first, then walks only
that actor's links:

```ts
const { data: [vendorAdmin] } = await query.graph({
  entity: "vendor_admin",
  fields: ["vendor.products.*"],
  filters: { id: [req.auth_context.actor_id] },
})
```

For Waslu this means every seller-facing route must derive its sales-channel /
store scope from `req.auth_context.actor_id` and **never** accept a store or
channel ID from the client as the authority. This is a discipline requirement, not
a framework guarantee, and is the single largest correctness risk in the design
(§8).

**Alternatives considered and rejected:**

| Approach | Why rejected |
| --- | --- |
| Database-per-seller | Medusa's module container, migrations and Query assume one database. Massive operational cost; no native support. |
| Schema-per-seller | Same objection; MikroORM metadata and link tables are not schema-parametrized per request. |
| `metadata.storeId` on every entity | **`query.graph` cannot filter nested JSON metadata** — see §6.5. Isolation you cannot query is not isolation. |
| Native Store module alone | Store has no link to products/orders; it cannot scope commerce data by itself. |

**Trade-off accepted:** a single shared database with application-enforced
scoping. Cheaper and idiomatic, but isolation correctness depends on every route
being written correctly. Mitigation: a shared scoping helper plus integration
tests that assert cross-store reads are rejected (§10).

### 6.2 Custom modules

**Finding: fully supported.** Modules live in `src/modules/<name>` with models, a
service extending `MedusaService`, and an `index.ts`:

```ts
import { Module } from "@medusajs/framework/utils"
export const BLOG_MODULE = "blog"
export default Module(BLOG_MODULE, { service: BlogModuleService })
```

Registered in `medusa-config.ts` as `modules: [{ resolve: "./src/modules/blog" }]`.
Note `Module` is a **factory function**, not a decorator.

Links live in `src/links` and use `defineLink` from `@medusajs/framework/utils`.
Medusa creates a real join table named `module1_table1_module2_table2`.

**Critical caveat [source]:**

> "These columns store only the IDs of the linked records and do not hold a
> foreign key constraint."
> — [Module links](https://docs.medusajs.com/learn/fundamentals/module-links)

So links are **not** referential integrity. Deletes cascade only at application
level, only when performed through `link.delete`, and only with `deleteCascade`
configured. Waslu must handle orphan cleanup explicitly in its workflows.

**Mapping of future Waslu modules onto Medusa without duplicating native code:**

| Waslu concern | Approach | Native functionality reused |
| --- | --- | --- |
| Store management | Custom `seller` / `store_profile` module + links | Native Store, Sales Channel, Currency |
| Buy links | Custom `buy_link` module (slug, target, expiry, attribution) | Native Cart/Order checkout; link records the entry point |
| Recorded external orders | Custom module + link to native Order | Native Order, `pp_system_default`, `markPaymentCollectionAsPaid` |
| Store templates | Custom `store_template` module | None native — genuinely new |
| Custom domains | Custom `store_domain` module + verification workflow | None native — genuinely new |
| AI product drafting | Custom `ai_draft` module; writes into native Product via workflows | Native Product, Pricing, File modules |
| Notifications | **Extend the native Notification module** | Native Notification module already persists a log |

The last row matters: Medusa v2 **has** a Notification module that stores
notifications in the database (`createNotifications` "send multiple notifications
and store them in the database"; `listNotifications` / `retrieveNotification`
exist). Waslu should extend it with store scoping rather than build a parallel
notification system.

**Migrations.** One mechanism, no second system:

- `npx medusa db:generate <module...>` — generate a migration for module changes.
- `npx medusa db:migrate` — run pending migrations, **sync link definitions**, run
  data migration scripts. This runs core and custom migrations together.
- `npx medusa db:rollback <module...>` — revert the last migration.
- `npx medusa db:create --db <name>` — create the database.

Generated migrations extend `Migration` from `@medusajs/framework/mikro-orm/migrations`
and include a real `down()` — they are reversible. Documented rule: roll back
before deleting a migration file.

### 6.3 Payment provider integration

**Finding: supported, with a material multi-tenant limitation.**

A payment provider is a module whose service extends `AbstractPaymentProvider`
from `@medusajs/framework/utils`, with `static identifier`. Providers do **not**
manage payment sessions or collections — the Payment Module does. Confirmed
methods: `initiatePayment`, `authorizePayment`, `capturePayment`, `refundPayment`,
`cancelPayment`, `deletePayment`, `getPaymentStatus`, `getWebhookActionAndData`
(plus `updatePayment` in recent releases). Provider IDs are `pp_{identifier}_{id}`.

**Stripe** is official:

```ts
modules: [{
  resolve: "@medusajs/medusa/payment",
  options: { providers: [
    { resolve: "@medusajs/medusa/payment-stripe", id: "stripe",
      options: { apiKey: process.env.STRIPE_API_KEY } },
  ] },
}]
```

`apiKey` is required; `webhookSecret` is required for deployed apps; `capture`
defaults to `false`.

**Webhooks** are native: `/hooks/payment/{identifier}_{id}` (the `pp_` prefix is
omitted; since **v2.21.2** the full prefixed ID is also accepted — relevant, since
2.22.4 is above that threshold). `getWebhookActionAndData` returns
`action: "authorized" | "captured" | "not_supported" | "failed"` with
`data.session_id` and `data.amount`; `authorized`/`captured` complete the cart if
not already completed.

**Manual payment instructions** are native via the `system` provider:

> "The Payment Module provides a `system` payment provider that acts as a
> placeholder payment provider. It doesn't handle payment processing and delegates
> that to the merchant. It acts similarly to a cash-on-delivery (COD) payment
> method. The identifier of the system payment provider is `pp_system`."

The concrete ID is `pp_system_default`. For orders paid outside Waslu, the admin
"mark as paid" route (`POST /admin/payment-collections/{id}/mark-as-paid`) "creates
and authorizes a payment session, then capture its payment, using the manual
payment provider" via `markPaymentCollectionAsPaid`. This is exactly the primitive
`recorded_outside` needs — no custom payment logic required.

**Limitation — scoping.** Providers are registered **globally** in
`medusa-config.ts` with **one credential set**, then enabled **per region**
(`payment_providers` on region creation). There is **no documented per-store,
per-sales-channel or per-seller provider configuration**. The docs are silent on
per-seller credentials rather than explicitly forbidding them, so this is recorded
as *unsupported by documentation* and a design decision Waslu must make:

- **Option A (recommended for MVP):** platform-owned Stripe account; sellers are
  paid out by Waslu. Works with stock Medusa. Payouts become a Waslu concern.
- **Option B:** Stripe Connect / custom provider that resolves credentials per
  tenant at runtime. Achievable via `AbstractPaymentProvider`, but is real work and
  is **not** a Week 1 or free capability.

No payment functionality was implemented in this spike, per the issue scope.

### 6.4 Seller-only authentication

**Finding: supported via a custom actor type.**

The Auth Module "doesn't store or manage any user-like models"; it manages auth
identities and maps them to an actor. The actor's ID is stored in
`app_metadata` under `{actor_type}_id`.

The provider base class is **`AbstractAuthModuleProvider`** (not
`AbstractAuthProvider`), from `@medusajs/framework/utils`, with
`static identifier` and
`authenticate(data: AuthenticationInput, authIdentityProviderService: AuthIdentityProviderService): Promise<AuthenticationResponse>`.
Provider IDs are `au_{identifier}_{id}`.

**`seller` is not a built-in actor type.** Medusa documents creating your own: build
the seller model in a custom module, then link the auth identity with
`setAuthAppMetadataStep({ authIdentityId, actorType: "seller", value: seller.id })`
from `@medusajs/medusa/core-flows`. The docs use `manager` and `vendor` as worked
examples; the Marketplace recipe uses `vendor`.

**Routes.** `/auth/{actor_type}/{provider}` and
`/auth/{actor_type}/{provider}/register` — so `POST /auth/seller/emailpass/register`
then `POST /auth/seller/emailpass`, returning a JWT. A cookie session is obtained
via `POST /auth/session` with the bearer JWT (`connect.sid`). Allowed providers per
actor are restricted with `projectConfig.http.authMethodsPerActor`.

**Separation of the three access surfaces:**

| Surface | Namespace | Actor | Auth |
| --- | --- | --- | --- |
| Public storefront | `/store` | `customer` (or anonymous) | Mostly public; `/store/customers/me` protected by default |
| Seller portal | `/seller` (custom) | `seller` (custom actor type) | `authenticate("seller", ["session","bearer"])` |
| Platform admin | `/admin` | `user` | Protected by default (admin users) |

Custom namespaces are native: any `route.ts` under `src/api` becomes an API route,
so `src/api/seller/products/route.ts` → `/seller/products`. Protection uses
`defineMiddlewares` and `authenticate` from `@medusajs/framework/http`, applied in
`src/api/middlewares.ts`. The authenticated actor is read from
`req.auth_context.actor_id` on an `AuthenticatedMedusaRequest`.

> **Correction:** `req.session.actor_type` is **not** a documented accessor. The
> documented surface is `req.auth_context.actor_id` /
> `req.auth_context.auth_identity_id`. Waslu code must use the latter.

**Two hard limitations:**

1. **No native per-record authorization.** Store-level ownership checks are
   hand-written (§6.1). `authenticate` proves *who* the caller is, never *what they
   own*.
2. > "It's not possible to change the authentication middleware applied to an
   > existing API route. Instead, you need to replicate the API route and apply
   > the authentication middleware to it."
   > — [Protected API routes](https://docs.medusajs.com/learn/fundamentals/api-routes/protected-routes)

   This is why the Marketplace recipe **replicates** the Complete Cart route to
   split orders per vendor. Waslu should expect to replicate, not re-configure,
   native routes where seller semantics differ. Budget for this in later sprints.

### 6.5 Order source tracking

**Requirement:** orders must reliably record `storefront`, `buy_link`, or
`recorded_outside`, and external orders must be distinguishable from orders paid
through Waslu.

**Finding: achievable, but the obvious implementation is a trap.**

Native `metadata` is a real `jsonb` column on Product, Order, Cart and Customer.
It is tempting to store `metadata.source`. **Do not** — Medusa documents:

> "Currently, Query doesn't support filtering by nested JSON properties in
> metadata fields using `query.graph`."
> — [Metadata filtering](https://docs.medusajs.com/resources/troubleshooting/query/metadata-filtering)

Both `metadata: { source: "buy_link" }` and `"metadata.source": "buy_link"` are
explicitly marked as not working. Workarounds are in-memory filtering (unbounded,
unpaginatable) or bypassing Query via the module service (loses cross-module
retrieval). Neither is acceptable for a field that will be filtered in seller
dashboards and reports. Additionally, metadata updates merge top-level keys but
**replace nested objects entirely**.

**Chosen approach:** a custom Waslu module (e.g. `order_source`, or a field on the
seller/store module) holding `source` as a real **enum column** plus optional
`buy_link_id`, linked to native `Order` with `defineLink`. This gives an indexable,
filterable column and keeps Order itself unmodified. `sales_channel_id` remains the
store scope; `source` records the entry point. They are orthogonal.

**Distinguishing externally-paid orders** uses native payment state, not a custom
flag: `recorded_outside` orders are created against `pp_system_default` / marked
paid via `markPaymentCollectionAsPaid`, so their payment provider ID already
distinguishes them from Stripe-paid orders. The custom `source` column records
*intent/origin*; the native payment provider records *how money moved*. Both are
kept, because an order recorded as external could later be reconciled.

A link table has no FK constraint (§6.2), so the workflow that creates an order
must create its source record in the same transaction boundary and handle cleanup.

### 6.6 File uploads

**Finding: supported for storage and retrieval; validation is NOT native.**

The provider base class is **`AbstractFileProviderService`** (not
`AbstractFileProvider`), from `@medusajs/framework/utils`. Core methods:
`upload(file: ProviderUploadFileDTO): Promise<ProviderFileResultDTO>` (content is a
base64 string), `delete(...)`, `getPresignedDownloadUrl(...)`. Optional:
`getPresignedUploadUrl` (throws if unimplemented), `validateOptions`. Since v2.8.0
also `getAsBuffer`, `getDownloadStream`, `getUploadStream` — the stream/buffer
methods are the hook future AI image processing would use.

**Providers.** Current docs register via subpaths:
`resolve: "@medusajs/medusa/file-local", id: "local"` and
`resolve: "@medusajs/medusa/file-s3", id: "s3"`. The standalone packages
`@medusajs/file-local` and `@medusajs/file-s3` also exist on npm at `2.22.4`.
Local options: `upload_dir` (default `static`), `backend_url` (default
`http://localhost:9000/static`). S3 options include `file_url`, `access_key_id`,
`secret_access_key`, `region`, `bucket`, `endpoint`, `prefix`, `cache_control`,
`download_file_duration`, `additional_client_config` — so S3-compatible stores
(.MinIO, R2, Spaces) work via `endpoint`.

Local is explicitly dev-only:

> "The Local File Module Provider is only for development purposes. Use the S3
> File Module Provider in production instead."

**Upload validation — negative finding [source].** `allowed_mime_types` and
`max_file_size` appear **nowhere** in the official docs (zero matches in the full
`llms-full.txt` dump), and the published `@medusajs/file@2.22.4` service contains
`// TODO: Validate file mime type, have config for allowed types` in `createFiles`.
**These options must not be cited as existing.** Waslu must validate MIME type and
size in its own upload middleware before calling the File Module. This is a
security requirement (unrestricted upload) and is scheduled work, not a freebie.

**Routes.** `POST /admin/uploads` exists, is `multipart/form-data`, and returns a
`files` array of `{ id, url }`; URLs are then passed to a product's `images` /
`thumbnail`. **`POST /store/uploads` could not be verified and appears not to
exist** in current docs. Since Waslu's sellers are neither admin users nor
customers, a **custom `/seller/uploads` route** is required — which is also the
correct place to put the missing validation and store scoping.

**Programmatic uploads** are native:
`fileModuleService.createFiles([{ filename, mimeType, content /* base64 */ }])`
returns `FileDTO` with `id` and `url`. This is the path for AI-generated images that
never traverse an HTTP upload route.

**Scoping limitation:**

> "Only one File Module Provider can be registered at a time. If you register
> multiple providers, the File Module will throw an error."

So per-store storage buckets are not a config option; tenant separation would be
by key `prefix` within one bucket, enforced in Waslu code.

---

## 7. PRD data-model mapping

**This is a logical mapping, not authorization to create these entities.** Per
Engineering Rule 9 and the data-model discipline note, **no entity below is created
in Week 1**. Each is implemented in its owning later issue.

Classification: **Native** = available without a custom entity · **Extended** =
native functionality plus fields/relationships · **Custom** = needs a Waslu entity.

| PRD entity | Class | Medusa 2.22.4 reality | Notes |
| --- | --- | --- | --- |
| Seller | **Custom** | No native seller/vendor model | Custom module; pattern proven by Marketplace `Vendor`/`VendorAdmin`. Auth identity linked via `setAuthAppMetadataStep`, actor type `seller`. |
| Store | **Extended** | Native `Store` (multi-store supported) | Native `name`, `supported_currencies`, `default_sales_channel_id`. Waslu adds handle/owner/branding via a linked custom profile. Store↔SalesChannel is **not** natively many-to-many. |
| Product | **Native** | `Product` (Product module) | Scoped to a store through the native Product↔SalesChannel many-to-many link. |
| ProductOption | **Native** | `ProductOption`, table `product_option` **[source]** | `values` HasMany; `variants` ManyToMany. |
| ProductOptionValue | **Native** | `ProductOptionValue`, table `product_option_value` **[source]** | Variant↔value many-to-many via pivot `product_variant_option` **[source]**. |
| ProductVariant | **Native** | `ProductVariant` | Holds **no prices itself**; linked to `PriceSet`. The amount record is `Price` — there is **no** v2 model named `MoneyAmount` (that was v1). |
| InventoryMovement | **Custom** | **No native ledger** | Inventory module has exactly `InventoryItem`, `InventoryLevel`, `ReservationItem`. `InventoryLevel` holds current stocked/reserved/incoming quantities only — no movement history. A stock audit trail needs a Waslu entity. |
| Media | **Extended** | `ProductImage` (table **`image`**, not `product_image` **[source]**) + File module | No generic native `Media` entity. Many-to-many with variants since v2.11.2 via `ProductVariantProductImage` **[source]**. Non-product media (store logos, templates) needs a custom entity. |
| Cart | **Native** | `Cart` (Cart module) | Real `sales_channel_id` column — the store scope. |
| CartLine | **Native** | Model **`LineItem`**, table `cart_line_item` **[source]** | Not `CartLineItem` or `CartItem`. Cart module also has `CreditLine`, `LineItemAdjustment`, tax lines, shipping methods. |
| Order | **Extended** | Native `Order` with real `sales_channel_id` | Waslu adds `source` via a linked custom module (§6.5) — **not** via `metadata`. |
| OrderLine | **Native** | `OrderLineItem`, table `order_line_item` **[source]** | Denormalized product/variant snapshot + `unit_price`. `OrderItem` is a *separate* versioned entity used by order changes — do not conflate. |
| Payment | **Native** | `Payment` (Payment module) | Also `PaymentSession`, `PaymentCollection`, `Capture`, `Refund`, `RefundReason`, `PaymentProvider`, `AccountHolder` **[source]**. `Payment` is the authorized/captured amount; sessions are provider-side attempts. |
| OrderHistory | **Custom** | No general-purpose audit log | `OrderChange`/`OrderChangeAction` track commerce edits, claims and exchanges only; `OrderTransaction` is financial only; also `OrderClaim`, `OrderExchange`, `Return` (model is `Return`, **not** `OrderReturn`), `OrderSummary`. Arbitrary events/notes need a Waslu entity. |
| Notification | **Extended** | **Native Notification module that persists** | `Notification` (table `notification` **[source]**) with `to`, `channel`, `template`, `data`, `status`, `provider_id`, `idempotency_key`; plus `NotificationProvider`. `createNotifications` stores to DB; `listNotifications`/`retrieveNotification` exist. Official providers: `notification-local`, `notification-sendgrid`. **Resend is not official** — docs show building a custom provider. Waslu adds store scoping. |
| AIDraftLog | **Custom** | No native equivalent | New Waslu module; writes results into native Product via workflows. |
| StoreDomain | **Custom** | No native equivalent | New Waslu module + domain verification workflow. |
| Feedback | **Custom** | No native equivalent | New Waslu module. |
| ImportJob | **Extended** | No native job entity; workflows + persisted executions | **No BatchJob module in v2** and no `product_import` model. `importProductsWorkflow` runs in background and returns a `transactionId`. Tracking uses the Workflow Engine module with `store: true` → `WorkflowExecution` (table `workflow_execution` **[source]**), configurable `retentionTime`. A custom entity is needed only if the PRD requires job metadata beyond execution state. |
| ExportJob | **Extended** | Same mechanism as ImportJob | `exportProductsWorkflow` exports CSV and sends a notification. Note default `workflow-engine-inmemory` does not persist across restarts — a Redis-backed provider is needed for durable job tracking. |

**Counts:** Native 9 · Extended 6 · Custom 5.

**Week 1 creates none of these.** BE-W1-03 only initializes Medusa and runs its
core migrations.

---

## 8. Risks and limitations

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| R1 | **Isolation is application-enforced.** No RLS, no ownership policy engine. One unscoped route leaks another seller's data. | **High** | A single shared scoping helper deriving scope from `req.auth_context.actor_id`; mandatory cross-store negative integration tests; code review checklist. |
| R2 | **Module link tables have no FK constraints.** Orphans are possible on delete. | Medium | Delete only via `link.delete` with `deleteCascade`; reconciliation job; never raw-delete linked records. |
| R3 | **Payment providers are global + region-scoped, not per-seller.** | **High** (product) | Decide Option A vs B (§6.3) before the payments sprint. Do not promise sellers their own Stripe account until designed. |
| R4 | **`metadata` cannot be filtered in `query.graph`.** | Medium | Use real columns for anything queried (order source). Reserve metadata for display-only attributes. |
| R5 | **No native upload validation in 2.22.4** (source `TODO`). | **High** (security) | Custom middleware validating MIME type and size on `/seller/uploads` before the File Module is called. |
| R6 | **Native route auth cannot be reconfigured** — routes must be replicated. | Medium | Budget replication work (e.g. Complete Cart for order splitting) in the relevant sprint; keep replicated routes minimal and tested. |
| R7 | **Only one File Module provider per app.** | Low | Tenant separation by key prefix in one bucket; enforce prefix in Waslu code. |
| R8 | **Local file provider is dev-only.** | Low | S3-compatible provider for any deployed environment; documented in `.env.example`. |
| R9 | **Official Medusa testing tooling is Jest-based, but BE-W1-04 requires Vitest.** | Medium | Vitest runs Waslu unit tests (env validation, health, scoping helpers) as the issue requires. Medusa integration tests via `@medusajs/test-utils` need Jest and would be a separate, later harness. Recorded as a deliberate deviation, not a silent change. |
| R10 | **Docs are unversioned.** Behaviour may drift from 2.22.4. | Medium | Pin `2.22.4` exactly (no caret) in `package.json`; re-verify extension points against installed source before each upgrade; no major upgrade without a superseding ADR. |
| R11 | **Docker unavailable in the evaluation environment.** | Medium (verification) | Compose, migrations, health and dependency connectivity cannot be executed here. Must be verified on a Docker-enabled machine before BE-W1-03 is accepted. |
| R12 | **Default in-memory workflow engine does not persist executions.** | Medium | Configure the Redis-backed workflow engine before relying on Import/Export job tracking. |
| R13 | **Prompt-injection content in official docs pages.** | Low | `<AgentInstructions>` feedback-POST blocks identified and ignored; flagged to the operator. No external feedback submitted. |

---

## 9. Go/no-go recommendation

### **GO** — proceed with Medusa 2.22.4.

**Reasons:**

1. **No blocking capability.** All six required capabilities are achievable on
   stock 2.22.4 using documented, stable extension points. Nothing required
   forking core or inventing an unsupported API.
2. **The hard part is a solved pattern.** Medusa publishes an official Marketplace
   recipe covering custom vendor modules, links to Product and Order, a custom
   actor type, and actor-scoped queries — structurally the same problem as Waslu's
   sellers and stores.
3. **Commerce fundamentals are genuinely native.** Products, options, variants,
   pricing, carts, orders, payments, refunds, inventory, sales channels,
   notifications and file storage all exist. Waslu avoids rebuilding the expensive
   80% of a commerce engine.
4. **`recorded_outside` has a native primitive.** The `system` payment provider and
   `markPaymentCollectionAsPaid` cover off-platform payment without custom payment
   logic.
5. **One migration mechanism.** `medusa db:migrate` handles core modules, custom
   modules and link syncing, with reversible generated migrations — satisfying the
   migration-discipline rules without a second system.
6. **The gaps are known, bounded and schedulable.** Every conditional pass maps to
   specific Waslu work (§10), not to an open-ended research risk.

**Why not NO-GO:** the limitations found (no native multi-tenancy, no per-seller
payment providers, no upload validation, no metadata filtering) are all
*extension-shaped* — they are work Waslu can do on top of Medusa. None is a
*capability-shaped* blocker that Medusa cannot express. A NO-GO would only be
justified if a required capability had no extension point, which is not the case.

**Honest counterweight:** Medusa does not make Waslu multi-tenant. Roughly the
entire tenant-isolation layer is Waslu's to build and test, and R1 is a permanent
correctness obligation. The GO decision is a bet that Medusa's extension model is
strong enough to carry that layer — the evidence says it is, but the isolation
tests in §10 are the condition that makes the bet safe.

### Decision gate

This ADR is **Proposed**. Per the BE-W1-01 implementation order, work **stops here
for technical lead review**. BE-W1-02, BE-W1-03 and BE-W1-04 must not be treated as
approved until sign-off is recorded below. If the verdict is NO-GO, no
Medusa-dependent foundation is to be built, and the affected later sprint issues
(store management, buy links, recorded orders, payments, seller auth) must be
re-planned against an alternative engine.

**Sign-off**

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Technical lead | _pending_ | _pending_ | _pending_ |

---

## 10. Conditions for a successful GO

These are prerequisites and follow-up obligations, **not** Week 1 work. Each must
be picked up by its owning issue.

**Binding on BE-W1-02 / BE-W1-03 (this sprint):**

- **C1.** Pin `@medusajs/*` to exactly `2.22.4`. No caret ranges on Medusa packages.
- **C2.** Use Medusa's own migration mechanism only (`medusa db:generate` /
  `db:migrate`). No Prisma, TypeORM CLI, Knex or hand-rolled SQL migration runner.
- **C3.** Create **no** Waslu domain entities in Week 1. Core Medusa migrations only.
- **C4.** Centralized environment validation that fails startup with a readable
  message naming the missing variable and never prints secret values.
- **C5.** Add `.medusa/` to `.gitignore` (the existing template ignores `dist`,
  which is not where Medusa v2 builds).
- **C6.** Unit tests use **Vitest** as BE-W1-04 requires. Document that Medusa's
  official integration harness (`@medusajs/test-utils`) is Jest-based and is
  deferred, so the deviation is explicit (R9).
- **C7.** Record that Docker-dependent acceptance criteria are **unverified** in
  this environment and must be run on a Docker-enabled machine (R11).

**Required before the related later sprint is accepted:**

- **C8 — Isolation (blocks store/product/order sprints).** A shared query-scoping
  helper that derives store/sales-channel scope exclusively from
  `req.auth_context.actor_id`, plus integration tests asserting seller A cannot
  read or mutate seller B's products, orders, carts or files. Treat R1 as a
  release blocker.
- **C9 — Seller auth (blocks seller portal).** Custom `seller` actor type, a
  `seller` model in a Waslu module, `setAuthAppMetadataStep` wiring, a `/seller`
  route namespace protected by `authenticate("seller", ["session","bearer"])`, and
  `http.authMethodsPerActor` restricting which providers may authenticate sellers.
- **C10 — Order source (blocks orders/buy-links).** `source` as a real enum column
  in a custom module linked to `Order`. Explicitly **not** `metadata.source` (R4).
- **C11 — Payments (blocks checkout).** A recorded decision on platform-owned
  Stripe (Option A) vs per-seller credentials/Connect (Option B). If Option B,
  design the custom `AbstractPaymentProvider` credential resolution before
  promising the feature. Configure `webhookSecret` in every deployed environment.
- **C12 — Uploads (blocks media/AI).** A custom `/seller/uploads` route with
  MIME-type and size validation implemented in Waslu middleware (R5), store-scoped
  key prefixes, and S3-compatible storage outside local development (R7, R8).
- **C13 — Job durability (blocks import/export).** Redis-backed workflow engine
  with `store: true` before ImportJob/ExportJob tracking is relied upon (R12).
- **C14 — Notifications.** Extend the native Notification module rather than
  building a parallel system; add store scoping. If Resend is chosen, budget a
  custom provider — it is not an official package.
- **C15 — Custom entities.** `InventoryMovement`, `OrderHistory`, `AIDraftLog`,
  `StoreDomain`, `Feedback` and the `Seller` model are all Waslu-owned and must be
  created in their owning issues, with reversible migrations and clear schema
  ownership. Never modify another issue's entity schema without coordination.
- **C16 — Upgrades.** Any Medusa major/minor upgrade requires re-verifying the
  extension points cited here against installed source and a superseding ADR.

---

## Appendix A — Corrections to widely assumed Medusa APIs

Recorded so later issues do not code against folklore:

| Commonly assumed | Actual in 2.22.4 |
| --- | --- |
| `AbstractAuthProvider` | **`AbstractAuthModuleProvider`** |
| `AbstractFileProvider` | **`AbstractFileProviderService`** |
| `Module` is a decorator | **`Module()` is a factory function** |
| `req.session.actor_type` | **`req.auth_context.actor_id`** |
| `seller` is a built-in actor type | **Custom actor type you must create** |
| Store ↔ SalesChannel many-to-many | **Not native**; only `Store.default_sales_channel_id` |
| `metadata` is filterable in `query.graph` | **Not supported for nested JSON** |
| `allowed_mime_types` / `max_file_size` file options | **Do not exist**; source has a `TODO` |
| `POST /store/uploads` | **Unverified / appears not to exist** |
| Cart line model `CartLineItem` | **`LineItem`**, table `cart_line_item` |
| `ProductImage` table `product_image` | **table `image`** |
| `MoneyAmount` pricing model | **`Price`** (v2); `MoneyAmount` was v1 |
| Native inventory movement ledger | **Does not exist** |
| `OrderReturn` model | **`Return`** |
| BatchJob module for import/export | **Removed in v2**; workflows + Workflow Engine |
| `medusa-test-utils` (unscoped) for v2 | **v1-only (1.1.45)**; v2 uses `@medusajs/test-utils` |
| Medusa builds to `dist/` | **`.medusa/server`** |
| Resend is an official notification provider | **Custom provider guide only** |