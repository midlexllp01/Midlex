# Workspace sign-in rollout for deployed apps

The workspace backend is the identity and project-grant authority. Each existing project backend continues to own its own data. Better Auth is not part of this rollout: it would need a new supported auth database and a migration of the current Firestore-backed workspace identities. Revisit it as a separate migration if needed.

## Live frontend destinations

| Workspace project | User URL | Admin URL |
| --- | --- | --- |
| Legal management | `https://lawyer.midlex.xyz` | `https://admin.midlex.xyz` |
| Counsel workspace | `https://lawyer.midlex.xyz` | `https://admin.midlex.xyz` |
| Finance | `https://payment-portal.midlex.xyz` | `https://payment-portal.midlex.xyz` |
| CBT | `https://midlex-cbt.vercel.app` | `https://midlex-cbt-admin.vercel.app` |
| HRMS | `https://hrms.midlex.xyz` | `https://admin.hrms.midlex.xyz` |
| Realty | `https://reality.midlex.xyz` | `https://admin.reality.midlex.xyz` |
| AI | `https://ai.midlex.xyz` | `https://admin.ai.midlex.xyz` |

The URLs above came from the supplied deployment screenshots. Verify the AI and Realty backend origins separately; frontend URLs do not identify their API deployments. Do not enable projects that are not deployed yet.

## Deployment order

1. Rotate all previously committed workspace and project admin passwords and secrets. Remove those credentials from deployed environment settings where they are no longer needed. Existing workspace passwords are stored as hashes; reset affected accounts through the central identity store so previous passwords stop working.
2. Deploy the central backend with durable Firestore credentials, a unique `WORKSPACE_JWT_SECRET` of at least 32 random characters, and a different `WORKSPACE_PROJECT_<ID>_SECRET` for each enabled project. Configure `WORKSPACE_PROJECT_<ID>_USER_URL` and `_ADMIN_URL` when a deployment differs from the table.
3. Deploy the workspace frontend with `WORKSPACE_API_URL` set to the central backend HTTPS origin. The workspace no longer accepts local fixed accounts or generates browser-trusted SSO payloads.
4. For each project being enabled, deploy its updated frontend and API together. Set server-only `WORKSPACE_URL`, `WORKSPACE_API_URL`, and `WORKSPACE_PROJECT_SECRET` on the frontend; set `WORKSPACE_API_URL` on a separate project API. The project secret must match the central backend's secret for that project.
   Realty's API also requires a unique `JWT_SECRET` of at least 32 characters for marketplace user sessions. Direct Realty admin password login is disabled by default. `ALLOW_LEGACY_ADMIN_LOGIN=true` temporarily restores it only when `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `JWT_SECRET` are configured; remove that flag after the workspace rollout.
5. Test one staff User grant and one Admin grant per enabled project. Verify that unassigned, suspended and downgraded accounts are refused by both pages and APIs, and that a handoff code cannot be reused.

Only code-based handoffs are supported. The one-use code is redeemed by the project server, which checks the current grant. Existing project components still copy a project token to local storage for compatibility with their older API helpers. Migrating those helpers to server-side sessions is the next security improvement before treating this as a complete authentication modernization.

The public Realty marketplace has a separate email/Google sign-in flow that currently accepts browser-supplied profile fields. It is outside staff workspace SSO and needs verified Google ID tokens before it can be treated as a secure customer login.
