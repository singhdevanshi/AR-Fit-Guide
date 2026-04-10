# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### AR FitCoach (`artifacts/ar-fitness`)
- **URL**: `/` (root)
- **Type**: React + Vite web app (frontend only, no backend)
- **Purpose**: WebAR fitness assistant with Three.js 3D rendering + AR.js camera tracking
- **AR library**: AR.js + Three.js loaded via CDN script tags in `index.html`
- **Key files**:
  - `src/lib/fitness.ts` — exercise library, pose keyframes, plan builder
  - `src/lib/arRenderer.ts` — Three.js AR scene, stick figure, guide line overlays
  - `src/pages/OnboardingScreen.tsx` — 4-step onboarding (age, goal, level, plan)
  - `src/pages/WorkoutScreen.tsx` — AR view with rep counter, posture HUD, controls
  - `src/components/MarkerGuideModal.tsx` — Hiro marker instructions modal
- **AR marker**: Uses the Hiro pattern (classic AR.js marker) — must print to anchor 3D figure
- **Demo mode**: Falls back to rotating figure on dark background if camera unavailable

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
