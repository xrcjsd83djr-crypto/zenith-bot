# Zenith Staff Management

A professional Discord bot + web dashboard for ERLC staff management — applications, ranks, strikes, LOAs, promotions, and meetings. Premium is granted manually via Robux ticket + `/give-premium` command.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/discord-bot run dev` — Discord bot (tsx watch)
- `pnpm --filter @workspace/discord-bot run deploy-commands` — register slash commands
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

Required env vars:
- `DATABASE_URL` — Postgres connection string (set as Replit secret)
- `SESSION_SECRET` — Express session secret (set as Replit secret)
- `DISCORD_TOKEN` — Bot token (bot only)
- `DISCORD_CLIENT_ID` — Application client ID (bot + API)
- `DISCORD_CLIENT_SECRET` — OAuth2 secret (API only)
- `DISCORD_REDIRECT_URI` — OAuth2 callback URL (API only)
- `SUPPORT_SERVER_ID` — Support server ID for premium tickets (API only)
- `PREMIUM_ADMIN_IDS` — Comma-separated Discord user IDs who can grant premium (API only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + express-session (Discord OAuth2)
- Bot: discord.js v14 (slash commands, modals, select menus)
- DB: PostgreSQL + Drizzle ORM + nanoid IDs
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (OpenAPI → React Query hooks + Zod schemas)
- Dashboard: React + Vite + shadcn/ui + wouter + TanStack Query
- Build: esbuild (API CJS bundle)

## Where things live

- `lib/db/src/schema/` — Drizzle schema (guilds, ranks, divisions, staff, applications, strikes, LOAs, promotions, activityLogs, applicationQuestions, meetings)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — Generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — Generated Zod schemas
- `artifacts/api-server/src/routes/` — Express route handlers (auth, guilds, staff, ranks, divisions, applications, strikes, loas, promotions, meetings, premium)
- `artifacts/discord-bot/src/commands/` — Slash commands (apply, roster, promote, demote, strike, strikes, unstrike, loa, config, give-premium)
- `artifacts/dashboard/src/pages/` — Dashboard pages (LandingPage, Overview, Staff, Ranks, Applications, Discipline, Settings)

## Architecture decisions

- Contract-first API: OpenAPI spec is written first, then Orval generates the client hooks and Zod validators — never write types by hand
- Session-based Discord OAuth2 (not JWT) — simpler for a web dashboard, server controls session lifetime
- Premium is manual: no payment processor — support staff issues via `/give-premium <guild_id>` after Robux payment verified in ticket
- nanoid(21) for all IDs — URL-safe, no UUID overhead
- Bot and API share the same `@workspace/db` package — consistent data access patterns

## Product

- **Discord bot**: `/apply` (modal application), `/roster`, `/promote`, `/demote`, `/strike`, `/strikes`, `/unstrike`, `/loa`, `/config`, `/give-premium`
- **Web dashboard**: Landing page with Free/Premium comparison, full CRUD for staff/ranks/divisions/applications/discipline/settings
- **Auth**: Discord OAuth2 — login with Discord button → server selection → dashboard

## User preferences

- No payment processor — premium granted manually after Robux ticket in Discord
- Hosted on Railway (planned), code at github.com/dududuuuruc-hue
- Discord bot uses slash commands only (no prefix commands)

## Gotchas

- Do NOT run `pnpm dev` at workspace root — no root dev script by design
- After any OpenAPI change, run `pnpm --filter @workspace/api-spec run codegen` and restart API server
- Orval's zod output target must be an absolute path (no `workspace:` option) to avoid generating bad barrel `index.ts`
- `SESSION_SECRET` must be set before API server starts — it throws on missing
- Bot needs `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DATABASE_URL` to start

## Pointers

- See `.local/skills/pnpm-workspace/` for workspace structure and TypeScript setup
- See `.local/skills/pnpm-workspace/references/openapi.md` for codegen patterns
- See `.local/skills/pnpm-workspace/references/db.md` for schema changes
