# Midlex One Workspace

One internal sign-in with separate `/developer`, `/admin`, and `/staff` landing pages. The existing Midlex LLP public website, client portal and Flutter app are unchanged.

## What the developer controls

- Create admin and staff identities with temporary passwords. Password replacement is required before accessing projects.
- Assign **No access**, **User**, or **Admin** independently for each project. Being a workspace admin does not imply project access.
- Change workspace roles, suspend/reactivate accounts, reset passwords and review recent audit events.
- Permission changes appear on the member's existing workspace within 30 seconds or when the tab regains focus. Changing project access invalidates previous project sessions without signing the person out of their workspace. Suspension, password reset and global sign-out revoke the workspace session too.

Admins and staff see their assigned projects and an **Access project** button. A project opens in a **new tab**, exchanges a one-use code, restores its existing session format and enters the appropriate project view. No second password prompt is needed.

## Local setup

From `Midlex-LLP`:

```powershell
npm --prefix backend install
npm --prefix workspace install
npm run setup:workspace -- your-developer-email@example.com
npm run dev:workspace
```

Open `http://localhost:3011`. The generated developer password is in `workspace/.local-access.md`, excluded from Git. Setup appends missing environment settings without replacing existing ones. It never resets an existing developer password. `dev:workspace` deliberately runs the backend with an isolated local JSON database under `backend/data/workspace-preview`; it does not connect to an existing Firebase database. That local data persists between restarts.

Run the target project as well before clicking its card. Install that project's dependencies first. Do not run duplicate copies on the same port.

| Project | Default folder | Local port |
| --- | --- | --- |
| Legal management | `admin` | 3002 |
| Counsel workspace | `lawyers` | 3003 |
| Assessment centre | `cbt` | 3004 |
| Internship programme | `mip` | 3005 |
| People & HR | `hrms` | 3006 |
| Analytics & publishing | `midlex-analytics` | 3007 |
| Media | `midlex-media` | 3008 |
| Realty | `midlex-realty` | 3009 |
| Finance | `payment management portal` | 3010 |
| Central workspace | `workspace` | 3011 |
| AI | sibling `midlex-ai-main` | 5173, API 5000 |

The finance development port changed from 3004 to 3010 to avoid colliding with CBT. The sibling Next.js copies in `../mip`, `../midlex-media`, `../midlex-analytics`, `../midlex-realty`, `../cbt/frontend`, and `../hrms/frontend` also contain the same bridge. The separate `../cbt/admin`, `../hrms/admin`, and `../midlex-reality-admin` frontends require an Admin project grant; they cannot be used with User access. Point the optional `WORKSPACE_PROJECT_<ID>_ADMIN_URL` at these deployments to select them instead of the combined app. Their existing local ports overlap other applications; use explicit ports or separate runs when testing them.

The AI server loads its server-local `.env` and the existing root environment. Its public research interface remains available; its admin API now requires the developer-assigned AI Admin grant. Start it using `npm run backend:start` in the AI folder and run Vite separately. The project's existing external AI service keys are still required for those features.

## Production configuration

Deploy `workspace` as a separate Next.js application and deploy the updated central backend and participating project apps. This change does not deploy anything automatically.

1. Set `WORKSPACE_API_URL` on the workspace server to the central backend origin.
2. On the backend set a random `WORKSPACE_JWT_SECRET` of at least 32 characters, the bootstrap developer email/name/password, and a distinct `WORKSPACE_PROJECT_<ID>_SECRET` for every project. See `backend/.env.workspace.example`. Bootstrap creates the owner only when the email is absent. There is no public developer registration route.
3. Set `WORKSPACE_PROJECT_<ID>_URL` to the exact HTTPS origin of each project. IDs containing hyphens use underscores in environment keys, e.g. `LEGAL_ADMIN`. Optional `_ADMIN_URL` and `_USER_URL` override the base URL by access level.
4. On every project server set `WORKSPACE_URL`, `WORKSPACE_API_URL`, and `WORKSPACE_PROJECT_SECRET` to match its central registry entry. Keep these values server-only; never prefix secrets with `NEXT_PUBLIC_` or `VITE_`. The AI frontend needs only public `VITE_WORKSPACE_URL` and its existing API URL setting.
5. Use Firebase service-account credentials on the central backend for shared durable storage. Workspace identities, hashed handoff codes and audit events use the new `workspaceUsers`, `workspaceCodes`, and `workspaceAudit` collections through the existing database abstraction. No Prisma SQL migration is required by this codebase's Firestore implementation. Keep direct browser access to those collections denied. Local JSON mode is for one local process, not a multi-instance production service.
6. On the separate CBT, HRMS and Realty API servers set `WORKSPACE_API_URL` too. Deploy their updated guards with the frontend bridges. Legacy internal password-login endpoints no longer provide access to these protected APIs.

`WORKSPACE_JWT_SECRET` is distinct from the existing client API's `JWT_SECRET`. Client website/mobile authentication and public signup remain on their existing endpoints. Existing client identities are not automatically enrolled in the internal workspace. Matching legacy email addresses retain their existing IDs for cases and documents.

## How project authentication works

The workspace keeps its 8-hour session in a same-site HttpOnly cookie behind its own server routes. The developer creates identities through the central backend, which checks their current role on every management request.

Project launch checks the current grant and creates a random one-use code with a 60-second lifetime. The browser receives the code in a URL fragment, which the callback removes before doing any further navigation. Only the intended project's server can exchange it, using its own secret. Firestore consumes the code in a transaction; local consumption is synchronous before yielding. Wrong-project, expired, replayed, suspended and revoked handoffs fail.

The result is an 8-hour token scoped to that project. Next.js project route guards check current permissions with the backend before serving protected pages. Existing frontend components receive compatible local storage sessions and tokens. Project-scoped tokens cannot be substituted for workspace sessions, and the legal backend rejects their use against other projects' API resources. Operational data permissions still use each project's existing case assignment/business rules.

The older combined CBT, MIP, HRMS, Media and Publishing projects include browser-local demonstration data and workflows. SSO centralizes identity and gates access; it does not turn those existing local stores or demo booking forms into shared production databases. The sibling CBT/HRMS API guards enforce admin operations, bind staff submissions to the signed-in identity, redact credential fields, and restrict personal records. Data entered into an existing local-only workflow remains local to that browser until that project's persistence is migrated separately.

Project frontend tokens remain in their existing local storage for compatibility with legacy API helpers. The workspace token is never exposed to those apps. Existing project logout buttons return to the workspace flow; **Sign out everywhere** on the workspace invalidates all its project sessions. A protected page/API request detects revocation; already rendered static content is not erased from an open browser tab.

## Maintaining the integrations

The canonical Next.js bridge is in `workspace/integrations/next`. Run `npm run sync:workspace` after editing it. `node workspace/scripts/connect-backends.mjs` updates the sibling CBT/HRMS API middleware, frontend token transports, and Realty admin API guard. Scripts are idempotent. The client `frontend` and `mobile` folders are deliberately excluded.

## Verification

```powershell
cd backend
npm test -- workspace.service.spec.ts --runInBand
npm run build
cd ../workspace
npm run typecheck
npm run build
```

The workspace tests cover developer-only onboarding, explicit grants, password setup/reset, suspension, throttled sign-in, project binding, concurrent code replay, expired links, live permission changes, session-type isolation, and global logout.

Additional checks: `node workspace/scripts/check-express-guards.mjs` validates the separate API guards. With the isolated preview and MIP project running, `node workspace/scripts/smoke-test.mjs` exercises 14 real HTTP checks across the workspace, project bridge and existing legal API. It creates one temporary `workspace-qa-...@example.invalid` identity and suspends it afterward. Stop the preview backend and run `node workspace/scripts/clean-preview-qa.mjs` to remove only those temporary records, then restart it.
