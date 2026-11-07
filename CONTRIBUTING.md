# Contributing to Waslu Backend

Thanks for contributing. This guide is the source of truth for how we work in
this repository. It is written to be followable on your first day.

The backend is a [Medusa v2](https://docs.medusajs.com) application. Read
[ADR 0001](docs/adr/0001-commerce-engine.md) before proposing architectural
changes — it records why we chose Medusa and what it does **not** give us for free.

---

## 1. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | **>= 22.22.0** | Medusa 2.22.4 requires it. Node 24 LTS is what we develop on. |
| npm | >= 10 | Ships with Node. We use npm, not yarn or pnpm. |
| Docker + Docker Compose | Recent | Easiest way to run PostgreSQL and Redis. |
| Git | Any recent | |

Check yourself:

```bash
node -v      # must be >= 22.22.0
npm -v
docker --version
docker compose version
```

## 2. First-time setup

```bash
git clone <repository-url>
cd waslu-backend
cp .env.example .env      # then edit .env if needed
npm install               # also installs the Git pre-commit hook
docker compose up -d postgres redis
npm run db:migrate
npm run dev
```

The API is then at <http://localhost:9000> and the admin dashboard at
<http://localhost:9000/admin>. See the [README](README.md) for the full walkthrough,
including running the whole stack in Docker.

**`npm install` must succeed cleanly.** It runs `husky`, which installs the
pre-commit hook. If you cloned before the hook existed, run `npm run prepare`.

## 3. Everyday commands

```bash
npm run dev            # start with hot reload
npm run lint           # ESLint — must pass
npm run lint:fix       # ESLint with autofix
npm run format         # Prettier — writes changes
npm run format:check   # Prettier — check only (this is what CI runs)
npm run typecheck      # tsc --noEmit — must pass
npm test               # Vitest unit tests — must pass
npm run build          # medusa build
npm run db:migrate     # apply pending migrations + sync module links
npm run seed           # development seed (safe, idempotent)
```

Before opening a pull request, run all four checks locally:

```bash
npm run lint && npm run format:check && npm run typecheck && npm test
```

## 4. TypeScript standards

`tsconfig.json` has **`strict: true`**. Do not weaken it to make code compile.

- **No `any`.** ESLint rejects it. Use `unknown` for data you have not validated
  yet, then narrow it with a type guard before use.
- **Type public interfaces explicitly.** Exported functions, route handlers and
  service methods should have explicit parameter and return types.
- **Validate data at the boundary.** Anything arriving from HTTP, the database or
  an external API is untrusted until validated. Internal code can trust its
  callers.
- **Let Medusa's types do the work.** Import request/response and DTO types from
  `@medusajs/framework/http` and `@medusajs/framework/types` rather than
  redeclaring them.
- **Consistent imports.** Node built-ins first, then external packages, then
  local files. Prettier and ESLint keep formatting uniform; do not hand-format.

## 5. Code quality tooling

| Tool | Config | Purpose |
| --- | --- | --- |
| ESLint | `eslint.config.mjs` | Correctness and `no-explicit-any` |
| Prettier | `.prettierrc.json` | Formatting — no style debates |
| EditorConfig | `.editorconfig` | Editor defaults (LF, 2 spaces, UTF-8) |
| husky | `.husky/pre-commit` | Runs the hook on `git commit` |
| lint-staged | `package.json` | Runs ESLint + Prettier on **staged files only** |

The pre-commit hook runs `npx lint-staged`, which formats and lints only what you
staged. It is fast and it auto-fixes formatting. If it modifies files, re-stage
them and commit again.

Do not bypass the hook with `--no-verify`. If it is genuinely broken, fix the hook
or raise it with the maintainers.

## 6. Environment variables

`.env.example` documents **every** variable the app reads, with a description and
a safe development placeholder. `.env` is gitignored and must never be committed.

### Adding a new environment variable

Do all four steps in the same pull request:

1. **Add it to `.env.example`** with a comment explaining what it does, whether it
   is required, its default, and a safe placeholder. Never put a real credential
   in `.env.example`.
2. **Read it in one place.** Application configuration is centralized — add it to
   the environment validation module (`src/lib/env.ts`) and to `medusa-config.ts`
   only as needed. Do not sprinkle `process.env.FOO` across route handlers.
3. **Validate it.** If it is required, make startup fail with a readable message
   naming the variable. Validation must never print the value of a secret.
4. **Document it** in the README if contributors need to set it to run the app.

If the variable is only used by Docker Compose (like `POSTGRES_PASSWORD`), say so
in the comment — contributors should not expect the app to read it.

### Secrets

- Never commit secrets, API keys, tokens or real connection strings.
- Never log a secret value. Log the variable **name** if you must report a problem.
- Production secrets come from the deployment platform's secret store, not from
  files in this repository.

## 7. Git conventions

### Branch naming

Use lowercase, hyphen-separated names prefixed by type:

```
<type>/<short-description>
```

| Prefix | Use for | Example |
| --- | --- | --- |
| `feat/` | New functionality | `feat/seller-store-module` |
| `fix/` | Bug fixes | `fix/health-redis-timeout` |
| `chore/` | Tooling, deps, config | `chore/bump-medusa-2.22.5` |
| `docs/` | Documentation only | `docs/adr-payment-scoping` |
| `refactor/` | No behaviour change | `refactor/env-validation` |
| `test/` | Tests only | `test/store-isolation` |

Include the issue ID when there is one: `feat/BE-W2-03-seller-auth`.

Never commit directly to `main`.

### Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<optional scope>): <imperative summary>

<optional body — explain WHY, not what>

<optional footer — e.g. Closes #123>
```

- **Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`,
  `perf`, `revert`.
- Summary in the imperative mood ("add", not "added"), lowercase, no trailing
  period, **72 characters or fewer**.
- Use the body to explain the reason and any trade-off. The diff already shows
  what changed.
- Breaking changes: add `!` after the type (`feat(api)!: ...`) and a
  `BREAKING CHANGE:` footer describing the migration.

Examples:

```
feat(health): check PostgreSQL and Redis before reporting healthy

A 200 from the app alone hid broken dependencies during local setup.
The endpoint now returns 503 when either dependency is unreachable.

Closes #42
```

```
chore(deps): pin @medusajs packages to 2.22.4

ADR 0001 condition C1 — caret ranges could pull an unreviewed minor.
```

### Keep commits reviewable

One logical change per commit. Prefer several small commits over one large one.
Do not mix a refactor with a feature.

## 8. Pull requests

Every change goes through a pull request. Fill in the
[PR template](.github/pull_request_template.md) completely.

**Requirements before review:**

- Branch is up to date with `main` and merges cleanly.
- `npm run lint`, `npm run format:check`, `npm run typecheck` and `npm test` all
  pass locally.
- CI is green (see below).
- The PR description explains **why** the change is needed and links its issue.
- New behaviour has tests. Bug fixes have a test that fails before the fix.
- Documentation and `.env.example` are updated if the change affects them.
- No secrets, no `.env`, no `node_modules`, no `.medusa/` in the diff.
- The change is small enough to review. If it is not, split it.

**Review requirements:**

- **At least one approving review** from a [CODEOWNER](.github/CODEOWNERS).
- All review conversations resolved.
- Approval is invalidated by new commits — re-request review after pushing fixes.
- Authors do not approve or merge their own PRs.

**Merging:** squash-merge into `main`, keeping the Conventional Commit format in
the squash message. Delete the branch after merge.

## 9. Required CI checks

The workflow in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every
pull request and on pushes to `main`. These jobs are **required**:

| Job | What it does |
| --- | --- |
| `quality` | ESLint, Prettier check, TypeScript type check, Vitest unit tests |
| `build` | `medusa build` |
| `migrations` | Applies migrations against a disposable PostgreSQL service container |
| `contract` | Spectral OpenAPI lint — **skipped** while `contracts/openapi.yaml` is absent |

A failing job fails the whole workflow. Do not merge red.

The `contract` job is conditional on purpose: the OpenAPI contract does not exist
yet, and CI must not fail because of that. The moment `contracts/openapi.yaml` is
added, the job starts running and will fail on an invalid spec.

## 10. Branch protection

`main` must be protected in **Settings → Branches → Branch protection rules** with
at least:

- ✅ **Require a pull request before merging**
- ✅ **Require approvals: 1** (minimum one review)
- ✅ **Dismiss stale pull request approvals when new commits are pushed**
- ✅ **Require review from Code Owners**
- ✅ **Require status checks to pass before merging**, with these checks selected:
  - `quality`
  - `build`
  - `migrations`
  - `contract` (see note below)
- ✅ **Require branches to be up to date before merging**
- ✅ **Do not allow bypassing the above settings** (include administrators)
- ❌ Allow force pushes — **disabled**
- ❌ Allow deletions — **disabled**

> **Note on `contract`:** because that job is skipped until the OpenAPI contract
> exists, GitHub may not report it as a status check. If a required check never
> appears, the PR cannot merge. Until `contracts/openapi.yaml` lands, either leave
> `contract` out of the required list, or configure the job to report a neutral
> success when skipped. Re-add it as required once the contract exists.

Maintainers are responsible for applying these settings; they cannot be enforced
from files in the repository.

## 11. Migration rules

Medusa owns the migration mechanism. **Do not add a second one** (no Prisma
Migrate, TypeORM CLI, Knex or hand-rolled SQL runners) — ADR 0001 condition C2.

- Generate migrations with `npm run db:generate -- <module-name>`. Commit the
  generated file; never hand-edit a migration that has already been applied to a
  shared database.
- Apply with `npm run db:migrate`. This runs core Medusa migrations, custom module
  migrations **and** syncs module link definitions.
- Generated migrations include a `down()`. Keep migrations **reversible**. If you
  must delete a migration file, roll it back first (`npm run db:rollback`).
- **Never run migrations concurrently.** One process at a time. In Docker Compose
  and CI, migration runs are a single dedicated step, not something each app
  replica does on boot.
- **Schema ownership is per issue.** Only the issue that owns an entity changes
  its schema. Never modify another issue's entity without coordinating first.
- Module link tables have **no foreign key constraints** (ADR 0001 §6.2). Delete
  linked records through `link.delete` so cascades are handled, and do not assume
  the database will stop you creating orphans.
- Do not create Waslu domain entities outside their owning issue. Week 1
  deliberately creates none.

## 12. Architecture rules

From ADR 0001 and the sprint engineering rules:

1. Follow Medusa's official architecture and extension patterns. Do not invent
   Medusa APIs — check the docs or the installed source first.
2. Do not duplicate native Medusa functionality without a written justification.
3. Keep configuration centralized (`medusa-config.ts`, `src/lib/env.ts`).
4. Separate infrastructure, domain logic and application configuration.
5. Do not pull later-sprint business features into an unrelated PR.
6. Document important architectural decisions as a new ADR in `docs/adr/`.
7. Prefer the simple, maintainable solution. This team is mostly beginner and
   intermediate engineers — clever abstractions are a cost, not a win.

### Multi-tenant isolation is a correctness obligation

Medusa does **not** enforce store isolation for us. Every seller-facing route must
derive its scope from `req.auth_context.actor_id`, never from a store or channel ID
supplied by the client. See ADR 0001 §6.1 and condition C8. If you add a
seller-facing route, add a test proving seller A cannot read seller B's data.

## 13. Getting help

- Open a [question in the issue tracker](../../issues) for anything unclear.
- Propose architecture changes with a draft ADR before writing code.
- If you are blocked, say so early — do not silently work around a broken hook,
  failing check or unclear requirement.

## 14. Working on GitHub Issues

This is the step-by-step workflow for picking up an issue and getting it merged.
Follow it in order.

### 1. Pick an issue

- Only work on an issue that is **assigned to you**. If you want one that is not
  assigned, comment on it and wait for a maintainer to assign it.
- Note the issue ID in the title (for example `BE-W1-03`). You will use it in your
  branch name and pull request.

### 2. Check its prerequisites

- Read the whole issue: summary, files, and acceptance criteria.
- Check the **Depends on** line. If a listed issue is not merged yet, do not start
  — ask in the issue whether you should wait or coordinate.
- Make sure you can run the project locally (see [First-time setup](#2-first-time-setup)).

### 3. Ask questions before starting

If anything is unclear — scope, files, expected behaviour — comment on the issue
**before** writing code. It is much cheaper to clarify first than to rework a PR.

### 4. Create a branch

Start from an up-to-date `main` and include the issue ID in the branch name
(see [Branch naming](#branch-naming)):

```bash
git checkout main
git pull
git checkout -b feat/BE-W1-03-medusa-config
```

Every branch for an issue must contain its issue ID, e.g. `BE-W1-03-medusa-config`.

### 5. Make your changes

- Change only what the issue asks for. Keep commits small and use
  [Conventional Commits](#commit-messages).
- Run the four local checks before pushing:

```bash
npm run lint           # ESLint
npm run format:check   # Prettier check
npm run typecheck      # TypeScript (tsc --noEmit)
npm test               # Vitest unit tests
```

Fix anything that fails (`npm run lint:fix` and `npm run format` can help).

### 6. Open a pull request

```bash
git push -u origin feat/BE-W1-03-medusa-config
```

Then open a pull request against `main` on GitHub and fill in the
[PR template](.github/pull_request_template.md):

- **Link the issue.** Put the issue ID in the PR title (e.g.
  `docs: BE-W1-03 document issue and PR workflow`) and add `Closes #<issue-number>`
  in the description so GitHub links the PR and closes the issue on merge.
- **Describe the changes** — what you changed and why.
- **List the tests you ran** — e.g. the four checks above, plus any manual testing.
- **Request review** from a [CODEOWNER](.github/CODEOWNERS) using the
  "Reviewers" panel.

### 7. Respond to review and merge

- Push fixes to the same branch and re-request review (new commits dismiss
  earlier approvals).
- Once approved and CI is green, the PR is merged using the squash-merge rule in
  [Pull requests](#8-pull-requests): squash-merge into `main` with a Conventional
  Commit squash message, then delete the branch.
