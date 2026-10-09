# IEMA CRM — Frontend

The staff-facing web app for the IEMA Institute CRM: enquiries, memberships and applications, events, profiles and organisations, and user/role administration. It is a [Nuxt 4](https://nuxt.com) (Vue 3) single-page dashboard that talks to the Express API in [`../backend`](../backend/README.md).

- [Requirements](#requirements)
- [Quick start (no backend needed)](#quick-start-no-backend-needed)
- [Running against the real backend](#running-against-the-real-backend)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [The mock API](#the-mock-api)
- [What's built, and what the backend still needs](#whats-built-and-what-the-backend-still-needs)
- [Project structure](#project-structure)
- [How the app works](#how-the-app-works)
- [Adding a feature](#adding-a-feature)
- [Checks before you push](#checks-before-you-push)
- [Building for production](#building-for-production)
- [Troubleshooting](#troubleshooting)

---

## Requirements

| Tool | Version | Notes |
|---|---|---|
| Node.js | **22.22.3+** or **24.15+** | Required by Nuxt 4.5. Node 22 LTS also satisfies the backend (`>=22`), so use it for both. |
| Yarn | 1.22 (classic) | The project is managed with Yarn: commit `yarn.lock`. `.yarnrc.yml` only matters if you switch to Yarn 2+ (it keeps the `node-modules` linker Nuxt needs). |
| A modern browser | Chrome, Edge or Firefox | See [Safari and secure cookies](#safari-and-secure-cookies). |

To run against real data you also need the **backend** and a **MySQL** database. See its [README](../backend/README.md). You don't need either to work on the UI: the [mock API](#the-mock-api) covers most screens.

## Quick start (no backend needed)

```bash
cd frontend
yarn install                       # also runs `nuxt prepare` (generates .nuxt types)
NUXT_PUBLIC_API_MOCK=true yarn dev # http://localhost:3000
```

Sign in as **`admin@iema.mock`** with any password. See [mock accounts](#mock-accounts) for users with fewer permissions.

## Running against the real backend

1. **Start the backend** (from `../backend`; full details in its README):

   ```bash
   cp .env.example .env              # then fill in JWT_SECRET and the MYSQL_* values
   yarn install
   yarn migrate                      # tables + default roles
   ADMIN_PASSWORD='<12+ chars>' yarn create-admin --email you@iema.org --first-name Ada --last-name Obi
   yarn dev                          # http://localhost:8080
   ```

   In the backend `.env`, make sure:
   - `CORS_ORIGINS` includes the frontend's origin: `http://localhost:3000` for local development.
   - `COOKIE_SAME_SITE=lax` (the default) works locally, because `localhost:3000` and `localhost:8080` count as the same site.
   - `COOKIE_SECURE`: see [Safari and secure cookies](#safari-and-secure-cookies).

2. **Start the frontend:**

   ```bash
   cd frontend
   yarn install
   yarn dev                          # http://localhost:3000, API at http://localhost:8080
   ```

   If the API isn't on `http://localhost:8080`, set `NUXT_PUBLIC_API_BASE` (see [Configuration](#configuration)).

3. Sign in with the administrator you created.

Some screens still have no backend endpoints, so they show their error state against the real API. See [What's built](#whats-built-and-what-the-backend-still-needs). Use mock mode to work on those.

## Configuration

Settings are Nuxt [runtime config](https://nuxt.com/docs/guide/going-further/runtime-config) (see `nuxt.config.ts`). Override them with environment variables, either in your shell or in a `frontend/.env` file (git-ignored):

| Variable | Default | Purpose |
|---|---|---|
| `NUXT_PUBLIC_API_BASE` | `http://localhost:8080` | Base URL of the backend API (no trailing slash, no `/api/v1`). |
| `NUXT_PUBLIC_API_MOCK` | `false` | `true` serves the profiles, organisations, events, applications, users/roles and sign-in endpoints from the in-browser mock. |
| `PORT` | `3000` | Port for the dev server and for a production build (`HOST` sets the interface a production build binds to). |

```bash
# frontend/.env
NUXT_PUBLIC_API_BASE=http://localhost:8080
NUXT_PUBLIC_API_MOCK=false
```

These are read when the app starts, so a production build can be pointed at a different API without rebuilding.

## Scripts

| Command | What it does |
|---|---|
| `yarn dev` | Development server with hot reload on http://localhost:3000. |
| `yarn build` | Production build into `.output/`. |
| `yarn preview` | Serves the production build locally (run `yarn build` first). |
| `yarn typecheck` | Type-checks the app, including `.vue` templates (`vue-tsc`). |
| `yarn generate` | Static pre-render. Not used: the dashboard needs a signed-in session and renders in the browser. |
| `postinstall` | Runs `nuxt prepare` automatically after `yarn install` to generate `.nuxt/` types. |

There's no automated test suite in the frontend yet; see [Checks before you push](#checks-before-you-push).

## The mock API

When `NUXT_PUBLIC_API_MOCK=true`, `plugins/api.ts` loads `composables/apiclient/mock/` and answers matching API requests in the browser, with realistic delays, validation, permissions and errors. Requests it doesn't recognise, such as enquiries, still go to `NUXT_PUBLIC_API_BASE`. The mock is loaded on demand, so it isn't in a normal build's main bundle.

It covers sign-in, profiles (with relationships, organisation links and documents), organisations, events, membership applications, users, roles and the permission catalog.

### Mock accounts

Any password works. Each account's permissions come from its role, so you can change them on **Access → Roles**.

| Email | Role | Good for testing |
|---|---|---|
| `admin@iema.mock` | System administrator | Everything |
| `reader@iema.mock` | Partnership officer | Read-only profiles; no Access menu |
| `noaccess@iema.mock` | Finance | Sections hidden, and "no permission" states |

### Behaviour and controls

- **Data lasts for the browser tab**, in `sessionStorage`, so it survives reloads. Close the tab, or run `sessionStorage.removeItem("mock:db")` in the console, to reset to the sample data. Uploaded file contents aren't kept across reloads; those files download as a placeholder PDF.
- **Changes behave like the real thing:** changing a user's role or deactivating them takes effect at their next sign-in, and editing a role's permissions affects everyone who holds it.
- **To test loading and error states,** run these in the browser console:

  ```js
  localStorage.setItem("mock:delay", "2000")          // slow every response (ms; default 300)
  localStorage.setItem("mock:fail", "/organisations") // URLs containing this fail with a 500
  localStorage.removeItem("mock:fail")                // back to normal
  ```

The sample data lives in `mock/seed.ts`, and the endpoints and their rules in `mock/index.ts`. When the backend adds an endpoint, keep the mock's behaviour in step, or remove its route so requests reach the real API.

## What's built, and what the backend still needs

The UI calls the endpoints below. **Live** means the backend already has it; **Contract** means the UI and mock are built and the backend still needs to implement the endpoint (request and response shapes are in the matching `composables/apiclient/*.ts` file).

| Section | Route | Permission to see it | API status |
|---|---|---|---|
| Sign in / sign out | `/` | — | **Live** |
| Dashboard home | `/dashboard` | signed in | Placeholder page |
| Enquiries (list, create, details) | `/dashboard/tickets` | `enquiries:read` (create: `enquiries:write`) | **Live** |
| Memberships → Members | `/dashboard/memberships/members` | signed in | UI only, no API yet |
| Memberships → Grades | `/dashboard/memberships/grades` | signed in | Placeholder page |
| Memberships → Applications | `/dashboard/memberships/applications` | `applications:read` or `applications:review` | Contract: `GET /applications`, `GET /applications/metrics` |
| Events (list, create) | `/dashboard/events` | signed in (create: `events:manage-registrations`) | Contract: `GET/POST /events`, `GET /events/metrics` |
| Profiles: list, create, edit, relationships, organisation links, documents | `/dashboard/profiles` | `persons:read` (changes: `persons:write`) | Contract: `/profiles…`, `/affiliations…` |
| Organisations | `/dashboard/organisations` | `persons:read` (changes: `persons:write`) | Contract: `/organisations…` |
| Access → Users | `/dashboard/access/users` | `users:read` (changes: `users:manage`) | Create is **Live**; `GET /users`, `GET /users/metrics`, `PATCH /users/:id` are Contract |
| Access → Roles | `/dashboard/access/roles` | `roles:manage` | List, permission catalog and permission editing are **Live**; `POST /roles` is Contract |
| Settings | `/dashboard/settings` | — | Placeholder page |

All lists use the same shape, `{ items, page, pageSize, total }`, except the existing enquiries endpoint (`{ enquiries, page, pageSize, total }`). Errors use the backend's `{ message, code, details?, requestId }`, and validation `details` (`[{ path, message }]`) appear under the matching form fields.

## Project structure

```
frontend/
├── nuxt.config.ts            # modules, runtime config, client-only dashboard routes
├── app/
│   ├── app.vue               # root: <NuxtLayout><NuxtPage/></NuxtLayout>
│   ├── global.css            # base font, form-control styles and their colour tokens
│   ├── layouts/              # authLayout (sign-in), dashboardLayout (sidebar + navbar)
│   ├── middleware/
│   │   └── auth.global.ts    # signed-out users → sign-in; signed-in users skip sign-in
│   ├── plugins/
│   │   └── api.ts            # sets the API base URL; loads the mock when enabled
│   ├── stores/
│   │   └── auth.ts           # signed-in user, login/logout, can(permission)
│   ├── pages/                # file-based routes (see the table above)
│   ├── components/
│   │   ├── common/           # reusable UI: dataTable, modal, confirmDialog, tabs, badge,
│   │   │                     #   metricCard, detailList, pageState, searchInput, recentActivity…
│   │   ├── form/             # inputs: text, choice, password, textarea, chipGroup,
│   │   │                     #   searchSelect, fileUpload, wrapper (label + hint + error)
│   │   ├── layouts/          # sidebar (navigation), navbar
│   │   └── <feature>/        # tables, forms and modals per feature (profiles/, roles/, …)
│   └── composables/
│       ├── apiclient/        # one module per resource: types, option lists, API calls
│       │   ├── api.ts        # axios wrapper → IHTTPResponse; apiErrorMessage, toQuery
│       │   └── mock/         # the mock API (index.ts) and its sample data (seed.ts)
│       ├── format.ts         # dates, ₦ amounts, file sizes, labelFor, initials
│       ├── referenceData.ts  # sectors, Nigerian states
│       ├── useQueryState.ts  # list filters/page/tab kept in the URL
│       └── useLoader.ts      # load-one-record helper for details pages
└── public/                   # logo, favicon
```

**Auto-imports:** Nuxt registers components by folder plus file name, so `components/profiles/createModal.vue` is used as `<ProfilesCreateModal>` and `components/common/dataTable.vue` as `<CommonDataTable>`. Vue APIs (`ref`, `computed`, …) and the top-level composables (`useQueryState`, `useLoader`) are auto-imported too. Files under `composables/apiclient/` are imported explicitly.

## How the app works

### Sign-in and the route guard

- The backend sets an **httpOnly session cookie** on `POST /api/v1/auth/login`. The frontend never sees the token: axios sends the cookie with `withCredentials: true`.
- `middleware/auth.global.ts` checks the session (`GET /api/v1/users/me`, once per page load) before any `/dashboard` route. Signed-out users go to `/?redirect=…`, and are sent back there after signing in. Signed-in users who open `/` go to the dashboard.
- The cookie belongs to the API's origin, so the session can only be checked in the browser. `/dashboard/**` is therefore client-rendered (`routeRules` in `nuxt.config.ts`), and only the sign-in page is server-rendered.

### Permissions in the UI

- `useAuthStore().can("persons:write")` checks the signed-in user's role permissions (from `/users/me`). Use it to **hide** controls the user can't use.
- Sidebar items take a `permission` (a string, or an array meaning "any of"). A group (an item with `children`) only shows if at least one child does.
- The UI is only a convenience: **the API enforces every permission.** A `403` is shown by the page's error state ("you do not have permission…").
- Permission keys are defined in `backend/src/domain/permissions.ts`.

### Talking to the API

- `composables/apiclient/api.ts` exports `apiClient` (`get`, `post`, `put`, `patch`, `delete`, `upload`).
- Every call resolves, never throws, to `IHTTPResponse = { statusCode, responseBody, errorMessage }`. Check `statusCode` and use `apiErrorMessage(result)` for display.
- Each resource has a module (`profile.ts`, `event.ts`, `user.ts`, …) holding its TypeScript types, the fixed option lists for dropdowns (`{ value, label }`, shown with `labelFor`), and an API object (`profileApi.list(query)`, …).

### Page patterns

| You're building… | Use |
|---|---|
| A list page | `useQueryState([...filters])` for search, filters and page in the URL; `CommonMetricCard` for the summary row; a `<Feature>Table` built on **`CommonDataTable`** (loading, empty, "no results", error and pagination states included). |
| A details page | `useLoader(fetch, pick)` plus **`CommonPageState`** for loading, not-found and error; `CommonDetailList` for label/value cards; `CommonTabs` with `useQueryTab` for `?tab=`. |
| A create form | A **modal**: `CommonModal` with the form's buttons in the `#footer` slot. When the form is shared with an edit page, give it an `inModal` prop and expose `submit`/`isSaving` (see `profiles/createModal.vue`). If an old `/…/new` URL existed, keep it as a redirect to `?new=1` (see `pages/dashboard/profiles/new.vue`). |
| A confirmation | `CommonConfirmDialog` (`danger` for destructive actions). |
| Form fields | `FormText`, `FormChoice`, `FormTextarea`, `FormPassword`, `FormChipGroup`, `FormSearchSelect`, `FormFileUpload`. Each takes `field-label`, `required`, `hint` and `error`, and wires its label and error for screen readers. Map the API's `details` to `error` and clear a field's error when it's edited. |

### Styling

- **[UnoCSS](https://unocss.dev)** utility classes (Tailwind-compatible) are written directly in templates.
- Brand colours are navy `#103260` (primary) and IEMA red `#C8102E` (focus and accents).
- **Form controls** use the shared `.form-control`, `.form-label` and `.form-error` classes in `global.css`, which copy the look of the IEMA quote form. Use the `Form*` components rather than styling inputs by hand.
- **Icons** are [Iconify](https://icon-sets.iconify.design/hugeicons/) Hugeicons via `<CommonIcon icon="hugeicons:…">`. Icons load from the Iconify API on first use, so check a name exists before using it.
- Layouts must work on phones: the dashboard stacks below the `md` breakpoint, and wide tables scroll inside their card.

## Adding a feature

1. **API module:** create `composables/apiclient/<feature>.ts` with the types, option lists and API calls. Agree the endpoint shapes with the backend; follow the existing list and error formats.
2. **Mock (if the backend isn't ready):** add routes to `mock/index.ts`, with a `permission` and the same validation as the real endpoint, and sample data to `mock/seed.ts`.
3. **Components:** add `components/<feature>/table.vue` on `CommonDataTable`, plus forms and modals as needed.
4. **Pages:** add `pages/dashboard/<feature>/index.vue` (and `[id].vue`) using the patterns above.
5. **Navigation:** add the item, with its `permission`, to `nav_menu` in `components/layouts/sidebar.vue`.
6. **Permissions:** hide write actions with `auth.can(...)`, and make sure the page handles a `403`.
7. **Check it:** run `yarn typecheck` and `yarn build`, then click through it in mock mode as an admin and as a restricted user, at phone width too.

## Checks before you push

- `yarn typecheck` passes. The only known error is `md-editor-v3` (see [Troubleshooting](#cannot-find-module-md-editor-v3)).
- `yarn build` passes.
- You've clicked through what you changed in `NUXT_PUBLIC_API_MOCK=true yarn dev`:
  - as `admin@iema.mock` and as `reader@iema.mock` or `noaccess@iema.mock`;
  - in the loading, empty and error states (`mock:delay`, `mock:fail`);
  - at phone width (about 390 px), with no sideways page scrolling.

## Building for production

```bash
yarn build                                    # → .output/
NUXT_PUBLIC_API_BASE=https://api.example.org \
  PORT=3000 node .output/server/index.mjs     # or: yarn preview
```

- `.output/` is self-contained: copy it to the server, or into a container, and run it with Node. There's no need for `node_modules`.
- Make sure `NUXT_PUBLIC_API_MOCK` is **unset or `false`** in production.
- **Cookies across domains:**
  - If the app and API are on sibling subdomains (e.g. `app.iema.org` and `api.iema.org`), keep `COOKIE_SAME_SITE=lax` on the backend and add the app's origin to `CORS_ORIGINS`.
  - If they're on unrelated domains, the backend needs `COOKIE_SAME_SITE=none` with `COOKIE_SECURE=true`.
- Serve both the app and the API over HTTPS.

## Troubleshooting

### Sign-in succeeds but I'm sent straight back to the sign-in page
The browser didn't keep the session cookie.
- **CORS:** check the backend's `CORS_ORIGINS` includes the exact frontend origin (scheme, host and port).
- **Secure cookies:** check `COOKIE_SECURE` (see the next section).
- **Different hosts:** don't mix `localhost` and `127.0.0.1` between the app and the API; cookies are tied to the host name.

### Safari and secure cookies
Chrome and Firefox accept `Secure` cookies on `http://localhost`, but Safari doesn't. For local development in Safari, set `COOKIE_SECURE=false` in the backend `.env`. Never do this in production.

### "Blocked by CORS policy" in the console
The API doesn't allow the page's origin. Add it to `CORS_ORIGINS` in the backend `.env` and restart the backend. In mock mode you can ignore this for sections the mock doesn't cover, such as enquiries.

### A page says "you do not have permission…"
The signed-in user's role lacks the permission in the [table above](#whats-built-and-what-the-backend-still-needs). An administrator can grant it on **Access → Roles**. Mock users get the change at their next sign-in.

### A page shows "Couldn't load…" against the real backend
That section's endpoints may not exist yet (status **Contract** above). Run with `NUXT_PUBLIC_API_MOCK=true`.

### Mock data looks stale or broken
Reset it: `sessionStorage.removeItem("mock:db")` in the console, or open a new tab. Also check `localStorage` for a leftover `mock:fail`.

### `Cannot find module 'md-editor-v3'`
`components/form/markdown.vue` imports a package that isn't installed. Nothing uses that component yet, so the build works; either install `md-editor-v3` or remove the component.

### `vue-tsc` crashes with `ERR_PACKAGE_PATH_NOT_EXPORTED`
`vue-tsc` doesn't support TypeScript 7 yet, so the frontend pins `typescript@~5.9`. Don't upgrade it here until `vue-tsc` supports 7. The backend uses its own TypeScript version.

### Port 3000 is already in use
Another dev server is running. Stop it, or run on another port with `PORT=3001 yarn dev`, and add `http://localhost:3001` to the backend's `CORS_ORIGINS`.
