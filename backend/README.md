# IEMA CRM — Backend

Express 5 + TypeScript + Sequelize (MySQL) API.

## Quick start

```bash
cp .env.example .env              # fill in DB credentials and a JWT secret (openssl rand -hex 32)
yarn install
yarn migrate                      # create tables + seed default roles
ADMIN_PASSWORD='<12+ chars>' yarn create-admin --email you@iema.org --first-name Ada --last-name Obi
yarn dev                          # http://localhost:8080
```

The process refuses to start if any required env var is missing or invalid.

## Scripts

| Script | Purpose |
| --- | --- |
| `yarn dev` | Run with reload (tsx) |
| `yarn build` / `yarn start` | Compile to `dist/` / run compiled build |
| `yarn test` | Unit + HTTP tests (no database required) |
| `yarn typecheck` | Strict type-check of src and tests |
| `yarn migrate` / `migrate:down` / `migrate:status` | Schema migrations (umzug). `migrate:prod` runs from `dist/` |
| `yarn create-admin` | Bootstrap a system administrator |

## Architecture

```
src/
  index.ts            entrypoint: connect DB, listen, graceful shutdown
  app.ts              createApp(): middleware stack, routes, error handling (no I/O; testable)
  bootstrap.ts        composition root: the only place that wires concrete implementations
  config/             zod-validated environment config (fail fast)
  domain/             entities + repository interfaces (no framework imports)
  services/           business logic; depends only on domain interfaces
  repository/         Sequelize implementations of the repository interfaces
  models/             Sequelize models + associations
  controllers/        HTTP adapters: parse input → call service → shape response
  routes/             router factories
  middleware/         authentication/authorisation, error handling
  infrastructure/     logger, password hashing, JWT
  database/           migrator + ordered migrations
  dto/                request schemas (zod) and their inferred types
  errors/             AppError hierarchy → HTTP status codes
```

Dependencies point inwards: controllers → services → domain interfaces ← repositories.
Services never import Express or Sequelize, so they are tested with in-memory fakes (`test/support/fakes.ts`).

## API (v1)

| Method | Path | Requires |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | public, rate-limited |
| POST | `/api/v1/auth/logout` | public |
| GET | `/api/v1/users/me` | signed in (includes the caller's `role.permissions`) |
| GET | `/api/v1/users` | `users:read` — `?search=&role=<title>&status=active\|inactive&page=&pageSize=` → `{ items, total, page, pageSize }` |
| GET | `/api/v1/users/metrics` | `users:read` — `{ total, active, inactive, signedInLast30Days }` |
| POST | `/api/v1/users` | `users:manage` |
| GET | `/api/v1/users/:id` | `users:read` |
| GET | `/api/v1/roles` | signed in (each role with its permissions) |
| PUT | `/api/v1/roles/:id/permissions` | `roles:manage` — body `{ "permissions": [...] }` replaces the set |
| GET | `/api/v1/permissions` | `roles:manage` — permission catalog |
| POST | `/api/v1/enquiries` | `enquiries:write` |
| GET | `/api/v1/enquiries/:id` | `enquiries:read` |
| GET | `/api/v1/applications` | `applications:read` or `applications:review` — `?search=&status=&grade=&page=&pageSize=` → `{ items, total, page, pageSize }`; review-only callers see only applications that reached the Committee |
| GET | `/api/v1/applications/metrics` | same — `{ total, awaitingScreening, withCommittee, approved, rejected }` |
| GET | `/api/v1/organisations` | `persons:read` — `?search=&type=&sector=&size=&page=&pageSize=` → `{ items, total, page, pageSize }` |
| GET | `/api/v1/organisations/metrics` | `persons:read` — `{ total, corporateMembers, institutionalMembers, partners, employers }` |
| GET | `/api/v1/organisations/:id` | `persons:read` → `{ organisation }` |
| POST | `/api/v1/organisations` | `persons:write` → 201 `{ organisation }`; 409 `{ code: "DUPLICATE", existingId }` if the name or registration reference is taken |
| GET | `/health`, `/ready` | public (liveness / readiness) |

Errors are always JSON: `{ message, code, details?, requestId }`. Every response carries `X-Request-Id`.

## Roles and permissions

Routes check **permissions**, never role names: `requirePermission(PERMISSIONS.X)` in a router, or
`hasPermission(principal, ...)` inside a service for per-record rules.

- The catalog of permission keys lives in `src/domain/permissions.ts`.
- Which role holds which permission lives in the database (`role_permissions`). Defaults come from migration
  0005, and a holder of `roles:manage` can change them with `PUT /roles/:id/permissions`. Changes apply on the
  affected users' next request.
- `system administrator` is a superuser: it always holds **every** permission, including ones added later,
  and its grants can't be edited (`PUT` returns 409). This also means nobody can lock everyone out.

To add a permission:
1. Add the key and its description to `PERMISSIONS` / `PERMISSION_DESCRIPTIONS` (and to `DEFAULT_ROLE_PERMISSIONS` if other roles get it by default; the system administrator gets it automatically).
2. Add a migration that inserts the key into `permissions` and any default grants into `role_permissions`.
3. Protect the route with `requirePermission(...)`.

## Security notes

- Sessions: JWT (HS256, pinned) in an `HttpOnly; Secure; SameSite` cookie, or `Authorization: Bearer`.
  The token carries only the user id; the account and role are re-loaded per request, so deactivation
  takes effect immediately. There is no server-side token revocation yet (logout clears the cookie only).
- CSRF: cookie auth + JSON-only bodies + strict CORS allow-list. If you ever accept form posts or set
  `COOKIE_SAME_SITE=none`, add CSRF tokens.
- Login responses are identical (and similarly timed) for unknown email / wrong password / disabled account.
- The login rate limiter is in-memory: with more than one instance, switch to a shared store (e.g. Redis).

## Deployment checklist

- `NODE_ENV=production`, `TRUST_PROXY_HOPS` set to the number of proxies, TLS terminated in front.
- Run `yarn migrate:prod` as a release step before starting new instances (never `sequelize.sync()`).
- Send `SIGTERM` to stop; the server drains in-flight requests (10 s deadline).
- Point liveness probes at `/health` and readiness at `/ready`.
