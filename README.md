# Waslu Backend

Waslu is an open-source tool that lets small sellers open an online store in minutes: add a product from a photo, share a link, and get paid. This repository holds the **backend**: the commerce engine, APIs and data layer that power the seller dashboard and the storefront. The frontend lives in a separate repository (`waslu-frontend`).

> **Status: Week 1 of a 5-week sprint.** The repository foundation is in place (standards, Docker, environment validation, health logic, and the engine decision). The Medusa app itself is still being wired — it cannot boot until `medusa-config.ts` and the first routes land (BE-W1-03). See [What exists today](#what-exists-today).

## Contents

- [What exists today](#what-exists-today)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Project structure](#project-structure)
- [Commands](#commands)
- [Environment variables](#environment-variables)
- [Working with the code](#working-with-the-code)
- [Testing and CI](#testing-and-ci)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [License](#license)

## What exists today

| Part                                                       | State                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------- |
| Repo standards (lint, format, typecheck, hooks, templates) | Done                                                    |
| Docker Compose (PostgreSQL, Redis, migrations, backend)    | Done                                                    |
| Environment validation (fails fast on missing config)      | Done                                                    |
| Health-check logic                                         | Done and unit tested, but no HTTP route is wired yet    |
| Engine decision (ADR 0001: build on Medusa v2)             | Written, awaiting tech-lead sign-off                    |
| Medusa app config (`medusa-config.ts`)                     | Not started — the app cannot boot without it (BE-W1-03) |
| API routes (health, seller, store)                         | Not started                                             |
| CI workflow                                                | Not started (BE-W1-04)                                  |
| API contract (`contracts/openapi.yaml`)                    | Not started (BE-W1-05)                                  |
| Seller auth, stores, products, carts, orders               | Not started                                             |

Right now you can start PostgreSQL and Redis and run the unit tests. The HTTP server comes online with BE-W1-03.

## Tech stack

| Tool                                         | Used for                                                |
| -------------------------------------------- | ------------------------------------------------------- |
| [Medusa](https://medusajs.com) v2.22.4       | The commerce engine (products, carts, orders, payments) |
| TypeScript (strict mode)                     | All code                                                |
| Node.js 22.22.0+ (we develop on Node 24 LTS) | Runtime                                                 |
| npm                                          | Packages and scripts (not yarn or pnpm)                 |
| PostgreSQL 17 and Redis 7                    | Database, and cache / event bus / workflow engine       |
| [Vitest](https://vitest.dev)                 | Unit tests                                              |
| ESLint and Prettier                          | Code quality and formatting                             |
| husky and lint-staged                        | Pre-commit checks on staged files                       |
| Docker and Docker Compose                    | Local PostgreSQL, Redis and the backend                 |

## Quick start

You need **Node.js 22.22.0 or newer**, **npm**, and **Docker** (with Docker Compose).

The easiest path runs everything in Docker:

```bash
# 1. Get the code
git clone https://github.com/haaflah/waslu-backend.git
cd waslu-backend

# 2. Create the settings file
cp .env.example .env

# 3. Start PostgreSQL, Redis, run migrations, and start the backend
docker compose up --build
```

Once the app is wired (BE-W1-03), it serves:

- API: http://localhost:9000
- Medusa admin dashboard: http://localhost:9000/admin
- Health check: http://localhost:9000/health

Stop everything with `Ctrl+C`.

> **Note:** today `docker compose up` starts PostgreSQL and Redis and runs migrations, but the backend container will not serve requests until `medusa-config.ts` and the first routes are added in BE-W1-03.

### Prefer to run the app on your own machine?

Run only the database and cache in Docker, and the app with hot reload locally:

```bash
cp .env.example .env
npm install                      # also installs the Git pre-commit hook
docker compose up -d postgres redis
npm run db:migrate
npm run dev
```

## Project structure

```
waslu-backend/
├── src/
│   └── lib/               Shared helpers (env validation, health check) + tests
├── docs/
│   └── adr/               Architecture decision records (start with 0001)
├── .github/               Issue and pull request templates, CODEOWNERS
├── .husky/                Pre-commit hook (runs lint-staged)
├── docker-compose.yml     PostgreSQL, Redis, one-shot migrations, backend
├── Dockerfile             Development image
├── .env.example           Settings to copy to .env
├── medusa-config.ts       App configuration (added in BE-W1-03)
└── contracts/             OpenAPI contract shared with the frontend (BE-W1-05)
```

As features land, Medusa's conventions add these folders under `src/`: `api/` (HTTP routes), `modules/` (custom data and services), `links/` (relationships between modules), `workflows/` (multi-step business logic), `subscribers/` (event handlers) and `scripts/` (the seed). The [ADR](docs/adr/0001-commerce-engine.md) and [CONTRIBUTING.md](CONTRIBUTING.md) explain how they fit together.

## Commands

Run these from the repository root. We use **npm**.

| Command                | What it does                                            |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Starts the backend with hot reload                      |
| `npm run build`        | Builds the app for production                           |
| `npm run start`        | Runs the production build                               |
| `npm run seed`         | Runs the development seed (safe to run twice)           |
| `npm run db:migrate`   | Applies pending migrations and syncs module links       |
| `npm run db:generate`  | Generates a migration for a module's schema changes     |
| `npm run db:rollback`  | Reverts the last migration                              |
| `npm run lint`         | Checks code style and common mistakes                   |
| `npm run typecheck`    | Checks TypeScript types                                 |
| `npm test`             | Runs all unit tests                                     |
| `npm run format:check` | Checks formatting with Prettier (does not change files) |

To fix formatting, run `npm run format`. To auto-fix lint problems, run `npm run lint:fix`.

## Environment variables

The app reads a single `.env` file at the repository root. Copy `.env.example` to `.env` to start. Every variable is documented in [.env.example](.env.example); the table below is a summary. After you change a value, restart the app.

| Variable        | Default                 | Meaning                                                      |
| --------------- | ----------------------- | ------------------------------------------------------------ |
| `NODE_ENV`      | `development`           | One of `development`, `test`, `production`                   |
| `PORT`          | `9000`                  | Port the HTTP server listens on                              |
| `DATABASE_URL`  | local PostgreSQL        | Connection string the app uses. Required.                    |
| `REDIS_URL`     | local Redis             | Connection string for cache / events / workflows. Required.  |
| `JWT_SECRET`    | dev placeholder         | Signs JWTs. Required; use a long random value in production. |
| `COOKIE_SECRET` | dev placeholder         | Signs the session cookie. Must differ from `JWT_SECRET`.     |
| `STORE_CORS`    | `http://localhost:8000` | Origins allowed to call the public storefront API            |
| `ADMIN_CORS`    | `http://localhost:9000` | Origins allowed to call the admin API                        |
| `AUTH_CORS`     | local origins           | Origins allowed to call the authentication API               |

`POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` are read only by Docker Compose to initialise the database container — the app itself uses `DATABASE_URL`. Keep them consistent.

Configuration is validated at startup by [src/lib/env.ts](src/lib/env.ts): a missing or invalid variable stops the app with one readable message that names the variable (never its value).

## Working with the code

### Reading and adding configuration

Read settings from the validated config, not from `process.env` scattered around the code. When you add a new variable, do all four steps in the same pull request: add it to `.env.example` with a comment, read it in `src/lib/env.ts`, validate it, and document it in the README if contributors need it. Full rules: [CONTRIBUTING.md §6](CONTRIBUTING.md).

### Where a feature goes

Follow Medusa's extension patterns rather than inventing new ones:

- An HTTP endpoint goes in `src/api/` (for example `src/api/seller/products/route.ts`).
- Custom data and its service go in a module under `src/modules/`.
- Multi-step logic goes in a workflow under `src/workflows/`.
- Relationships between modules go in `src/links/`.

Check the installed Medusa source or the official docs before using an API — the [ADR's Appendix A](docs/adr/0001-commerce-engine.md) lists common assumptions that are wrong in v2.

### Migrations

Medusa owns migrations. Generate them with `npm run db:generate -- <module>`, apply with `npm run db:migrate`, and keep them reversible. Do not add a second migration system, and never run migrations from two pull requests at the same time. Only the issue that owns an entity may change its schema. Details: [CONTRIBUTING.md §11](CONTRIBUTING.md).

### Store isolation is a correctness rule

Medusa does not enforce multi-store isolation for us. Every seller-facing route must derive its store scope from the signed-in seller (`req.auth_context.actor_id`), never from a store ID sent by the client. If you add a seller route, add a test proving seller A cannot read seller B's data. This is the single biggest correctness risk in the design — see [ADR §6.1](docs/adr/0001-commerce-engine.md).

## Testing and CI

Before you push, run:

```bash
npm run lint && npm run format:check && npm run typecheck && npm test
```

The CI workflow (`.github/workflows/ci.yml`) is added in BE-W1-04. Once it lands, every pull request runs these jobs, and a pull request should only merge when they are green:

| Job          | What it does                                                               |
| ------------ | -------------------------------------------------------------------------- |
| `quality`    | ESLint, Prettier check, TypeScript type check, Vitest unit tests           |
| `build`      | `medusa build`                                                             |
| `migrations` | Applies migrations against a disposable PostgreSQL container               |
| `contract`   | Lints the OpenAPI contract — skipped until `contracts/openapi.yaml` exists |

Unit tests use Vitest. Medusa's own integration harness is Jest-based and is deferred, so that deviation is recorded in the ADR rather than hidden.

## Contributing

1. Pick one issue and say so in its comments. Issues are named like `BE-W1-03` (backend, week 1, item 3) and are released week by week.
2. Create a branch from `main`, for example `feat/BE-W1-03-medusa-setup`.
3. Keep the pull request to that one issue.
4. Run the checks above, then open a pull request and fill in the checklist.
5. Ask for one review from a CODEOWNER.

Never commit directly to `main`, and do not bypass the pre-commit hook. The full workflow — branch naming, commit messages, review and merge rules — is in [CONTRIBUTING.md](CONTRIBUTING.md).

## Troubleshooting

| Problem                                         | Fix                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm install` complains about the Node version  | Install Node.js 22.22.0 or newer (we use Node 24 LTS)                                                  |
| "Port 9000 is already in use"                   | Stop the other program using it, or stop an old `npm run dev` / `docker compose`                       |
| The backend container cannot reach the database | Inside Docker use the service names `postgres` and `redis`, not `localhost`. Compose sets this for you |
| Startup fails naming a missing variable         | Copy `.env.example` to `.env` and fill in the value it names                                           |
| The app will not boot / no HTTP server          | `medusa-config.ts` and the first routes are not added yet — they come in BE-W1-03                      |
| `npm run seed` says the file is not found       | The seed script is a placeholder until BE-W1-03; real demo data comes in BE-W4-04                      |
| Migrations fail or seem to run twice            | Run only one migration process at a time; `docker compose` uses a dedicated one-shot step              |
| Lint or type errors after pulling new code      | Run `npm install` again                                                                                |

## Roadmap

Planned over five weeks, in the order the issues are released:

1. **Week 1, foundations:** boot the Medusa app, CI, the API contract, seller sign-up and store creation.
2. **Week 2, core commerce:** products, variants, images, the public storefront API, cart, checkout and the Stripe payment adapter.
3. **Week 3, what makes Waslu different:** order management, buy links (a product link that opens checkout directly), recording sales made outside the platform, store homepage templates, manual payments, notifications and the first AI drafting prototype.
4. **Week 4, integration and quality:** snap-to-list hardening, security and logging, demo seed data, and the hosted demo deployment.
5. **Week 5, launch:** fixes from pilot sellers, documentation, security and performance passes, version 0.1.0.

## License

MIT. See [LICENSE](LICENSE).
