# elite

Next.js monorepo (Turborepo) for the trading/investment platform.

- `apps/web` — Next.js 16 app: marketing pages, auth, user dashboard, admin console, API routes, Prisma/SQLite.
- `packages/ui` — shared shadcn/Tailwind v4 component library and design tokens.
- `packages/eslint-config`, `packages/typescript-config` — shared configs.

## Develop

```bash
npm install
npm run dev        # turbo dev
```

## Common tasks

```bash
npm run build      # turbo build
npm run typecheck
npm run lint
```

App-level scripts live in `apps/web/package.json` (`db:seed`, `test` via Playwright).
