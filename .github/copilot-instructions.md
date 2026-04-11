# Copilot Instructions

> **Global rules**: See [workspace copilot-instructions](../../../.github/copilot-instructions.md)
> **Tech persona**: See [sveltekit-agent](../../../.github/agents/sveltekit-agent.md)

> 🔓 **PUBLIC REPOSITORY** — All content is publicly visible. See [Public Repo Rules](#public-repo-rules) below.

## Overview

Personal finance management app for bills, budgets, debt payoff, and cash flow forecasting. Full-stack SvelteKit 5 application with SQLite database, Docker deployment, and MIT license.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build (adapter-node) |
| `npm run preview` | Preview production build |
| `npm run check` | Svelte type checking |
| `npm run db:reset` | Reset database |

## Architecture

```
├── src/
│   ├── routes/           # SvelteKit file-based routing
│   └── lib/              # Shared components and utilities
├── data/                 # SQLite database (bills.db)
└── ...
```

**Data flow**: SvelteKit routes → server load functions / form actions → Drizzle ORM → SQLite (`./data/bills.db`)

## Tech Stack

- **Framework**: SvelteKit 5, TypeScript strict, adapter-node
- **Styling**: Tailwind CSS v4 (@tailwindcss/forms, @tailwindcss/typography)
- **Dark Mode**: Tailwind class strategy
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **Dependencies**: date-fns, lucide-svelte, ofx-data-extractor
- **License**: MIT

## Key Conventions

- Use Svelte 5 runes (`$state`, `$derived`, `$effect`, etc.)
- Strict TypeScript — no `any` types
- Dark mode support via Tailwind class strategy
- Drizzle ORM for all database operations

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PLAID_CLIENT_ID` | Plaid API client ID (bank import integration) |
| `PLAID_SECRET` | Plaid API secret |
| `PLAID_ENV` | Plaid environment (sandbox/development/production) |
| `PLAID_ENCRYPTION_KEY` | Plaid data encryption key |

> ⚠️ **Never commit actual values** — use `.env` files (gitignored) only.

## Deployment

- **Docker**: node:20-alpine multi-stage build
- **Port**: 3333
- **Healthcheck**: Container health monitoring
- **Compatible**: Unraid deployment

## Git Conventions

- Remote: `github.com/c-rw/billzzz`
- Primary branch: `main`
- **Feature branches required** — no direct commits to `main`
- **PR-based workflow only**

## Public Repo Rules

🚨 **This is a public repository. All commits and history are publicly visible.**

- **No secrets**: Never commit API keys, tokens, passwords, or connection strings
- **No personal information**: No real names, addresses, account numbers, or PII
- **No private repo references**: Do not reference private repositories, internal tools, or proprietary systems
- **PR workflow**: All changes via feature branches and pull requests — no direct pushes to `main`
- **Review before commit**: Double-check all staged changes for sensitive data before committing
