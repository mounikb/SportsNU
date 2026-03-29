# Scorecard — Design Spec
**Date:** 2026-03-29
**Status:** Approved

---

## Overview

Scorecard is a full-stack live sports dashboard. Users log in, follow their football (soccer) and cricket teams, and see a clean minimal dashboard showing only their teams' live scores, upcoming matches, and recent results. No ads, no clutter.

**Sports:** Football (Soccer) + Cricket (MVP only)
**Stack:** React 18 + Vite + TypeScript + Tailwind / Node.js + Express + TypeScript + Prisma
**Monorepo:** pnpm workspaces

---

## Project Structure

```
scorecard/
  apps/
    web/                  ← Vite + React 18 + TypeScript + Tailwind
    api/                  ← Express + Node + TypeScript + Prisma
  packages/
    types/                ← Shared interfaces (Match, Team, Sport, etc.)
  pnpm-workspace.yaml
  package.json            ← Root scripts: dev, build, lint
  README.md
  docker-compose.yml      ← For optional real Postgres/Redis later
```

### Root Scripts
- `pnpm dev` — starts both `web` (port 5173) and `api` (port 3000) concurrently
- `pnpm build` — builds both apps
- `pnpm db:migrate` — runs Prisma migrations
- `pnpm db:seed` — seeds DB with teams from mock data

---

## Shared Types (`packages/types`)

Exports the unified match schema. Both `apps/web` and `apps/api` import from `@scorecard/types`. Raw API shapes never leave the backend.

```typescript
type Sport = "football" | "cricket";
type MatchStatus = "LIVE" | "UPCOMING" | "FINISHED";

interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  sport: Sport;
}

interface FootballMatch {
  id: string;
  sport: "football";
  status: MatchStatus;
  competition: string;
  homeTeam: Team;
  awayTeam: Team;
  score: { home: number; away: number };
  minute?: number;
  startTime: string;
  events: { type: string; team: string; player: string; minute: number }[];
}

interface CricketMatch {
  id: string;
  sport: "cricket";
  status: MatchStatus;
  competition: string;
  format: "T20" | "ODI" | "TEST";
  homeTeam: Team;
  awayTeam: Team;
  innings: { team: string; runs: number; wickets: number; overs: number }[];
  currentInnings?: number;
  summary?: string;
  startTime: string;
}

type Match = FootballMatch | CricketMatch;
```

---

## Backend Architecture (`apps/api`)

### Folder Structure

```
src/
  routes/
    auth.ts               ← POST /auth/verify
    teams.ts              ← GET /teams, GET /teams/mine, POST/DELETE /teams/follow
    matches.ts            ← GET /matches, /matches/live, /upcoming, /recent
  services/
    matchNormalizer.ts    ← All external API data passes through here
    footballPoller.ts     ← node-cron job, fetches football-data.org
    cricketPoller.ts      ← node-cron job, fetches cricapi.com
    mockData.ts           ← Realistic static matches + teams for dev
  middleware/
    auth.ts               ← Firebase token verify (+ dev bypass)
  cache/
    index.ts              ← CacheService interface (get/set/del)
    inMemoryCache.ts      ← Dev: Map with TTL
    redisCache.ts         ← Prod: ioredis client
  db/
    prisma.ts             ← Prisma client singleton
  index.ts
```

### API Routes

| Method | Route                    | Auth | Description                      |
|--------|--------------------------|------|----------------------------------|
| POST   | `/auth/verify`           | No   | Firebase token → get/create user |
| GET    | `/health`                | No   | Health check                     |
| GET    | `/teams?sport=X`         | Yes  | List available teams             |
| GET    | `/teams/mine`            | Yes  | User's followed teams            |
| POST   | `/teams/follow`          | Yes  | Follow a team `{ teamId }`       |
| DELETE | `/teams/follow/:teamId`  | Yes  | Unfollow a team                  |
| GET    | `/matches`               | Yes  | All matches for user's teams     |
| GET    | `/matches/live`          | Yes  | Live matches only                |
| GET    | `/matches/upcoming`      | Yes  | Next 7 days                      |
| GET    | `/matches/recent`        | Yes  | Last 7 days                      |

### Cache Abstraction

`CacheService` interface with `get(key)`, `set(key, value, ttlSeconds)`, `del(key)`.

- **Dev (`REDIS_URL` absent):** `inMemoryCache.ts` — a `Map<string, {value, expiresAt}>` with TTL enforcement on read.
- **Prod (`REDIS_URL` present):** `redisCache.ts` — ioredis client.

Selected at startup in `cache/index.ts` based on env.

### Polling & Caching Rules

Pollers start on boot via node-cron. Route handlers never call external APIs.

| Data | Poll Interval | Cache TTL |
|---|---|---|
| Football live matches | 60s | 60s |
| Cricket live matches | 3 min | 180s |
| Upcoming matches | 15 min | 15 min |
| Team lists | 6 hours | 6 hours |

**Cache miss flow:** Redis/memory → DB → (never external API on user request)

**Mock data mode:** If `FOOTBALL_API_KEY` and `CRICKET_API_KEY` are absent, pollers source data from `mockData.ts`. Data still flows through `matchNormalizer` — the rest of the app is unaware.

**Stale data handling:** If the last successful poll was >2× the TTL ago, responses include a `{ stale: true, lastUpdated: ISO }` field. Frontend displays "last updated X ago" note.

### Auth Middleware

- Reads `Authorization: Bearer <token>` header
- Verifies Firebase ID token and attaches user to `req.user`
- **Dev bypass:** If `FIREBASE_PROJECT_ID` is absent and `NODE_ENV=development`, attaches a hardcoded dev user without verifying any token
- All routes except `/auth/verify` and `/health` require auth

### Database (Prisma)

```prisma
model User {
  id          String       @id @default(uuid())
  firebaseUid String       @unique
  email       String       @unique
  displayName String?
  createdAt   DateTime     @default(now())
  teamFollows TeamFollow[]
}

model Team {
  id          String       @id
  sport       String
  name        String
  shortName   String
  logo        String?
  competition String
  externalId  String
  followers   TeamFollow[]
}

model TeamFollow {
  id        String   @id @default(uuid())
  userId    String
  teamId    String
  user      User     @relation(fields: [userId], references: [id])
  team      Team     @relation(fields: [teamId], references: [id])
  @@unique([userId, teamId])
}
```

**Dev:** `DATABASE_URL=file:./dev.db`, schema `provider = "sqlite"`
**Prod:** `DATABASE_URL=postgresql://...`, schema `provider = "postgresql"` (Railway)

Prisma does not auto-infer provider from URL. The project keeps two schema files:
- `prisma/schema.dev.prisma` — provider sqlite
- `prisma/schema.prisma` — provider postgresql (used in CI/prod)

The `db:migrate` and `db:seed` scripts point to `schema.dev.prisma` in development via `--schema` flag.

---

## Frontend Architecture (`apps/web`)

### Folder Structure

```
src/
  pages/
    Landing.tsx           ← Login/signup + "Continue as Dev User" button in dev
    TeamPicker.tsx        ← Onboarding: search & select teams, min 1 to proceed
    Dashboard.tsx         ← Main page: Live / Upcoming / Recent
    Settings.tsx          ← Manage followed teams (add/remove)
  components/
    cards/
      FootballCard.tsx    ← "Arsenal 2–1 Chelsea · 67'"
      CricketCard.tsx     ← "India 167/4 (18.2 ov) vs AUS · summary"
    sections/
      LiveSection.tsx     ← Only renders when live matches exist
      UpcomingSection.tsx
      RecentSection.tsx
    ui/
      SportTabs.tsx       ← Football | Cricket | All toggle
      LiveIndicator.tsx   ← Red pulse dot
      EmptyState.tsx      ← Reusable empty section message
  hooks/
    usePolling.ts         ← setInterval + cleanup, takes (url, interval)
    useAuth.ts            ← Firebase auth state (+ dev bypass)
  store/
    authStore.ts          ← Zustand: user, token, login/logout
    matchStore.ts         ← Zustand: live/upcoming/recent matches, sport filter
    teamStore.ts          ← Zustand: followed teams
  lib/
    api.ts                ← Axios instance, injects Authorization header
```

### Pages

1. **Landing** — Firebase Auth UI for email + Google OAuth. In dev (`VITE_DEV_AUTH=true`), shows a "Continue as Dev User" button that sets a fake token in `authStore`.
2. **TeamPicker** — shown after first login when user has no followed teams. Search across both sports. Must select at least 1 team to proceed to Dashboard.
3. **Dashboard** — three vertically stacked sections. Header has logo + `SportTabs` + settings icon. Sport filter from `matchStore` applies across all sections.
4. **Settings** — lists followed teams with remove option. Add more teams via same search UI as TeamPicker.

### Dashboard Polling

| Endpoint | Interval |
|---|---|
| `/matches/live` | 30s |
| `/matches/upcoming` | 5 min |
| `/matches/recent` | 10 min |

`usePolling(url, interval)` — fires an immediate fetch on mount, then sets up `setInterval` for subsequent fetches, cleans up on unmount. Used three times in Dashboard.

### State Management (Zustand)

- **`authStore`** — `user`, `token`, `isAuthenticated`, `login()`, `logout()`
- **`matchStore`** — `liveMatches`, `upcomingMatches`, `recentMatches`, `sportFilter` (`"all" | "football" | "cricket"`), setters
- **`teamStore`** — `followedTeams`, `follow(teamId)`, `unfollow(teamId)`

Sport filter lives in `matchStore`. `SportTabs` sets it; all sections read it. No prop drilling.

---

## Design System

| Token | Value |
|---|---|
| Background | `#0A0F1A` |
| Card background | `#141425` |
| Text | `#E8E8E8` |
| Accent (live scores, highlights) | `#00F5A0` (electric green) |
| Live indicator | `#FF3B3B` with CSS pulse animation |
| Card border radius | 12–16px |
| Font | "Instrument Sans" from Google Fonts |

- Dark mode default, no light mode in MVP
- Mobile-first: base styles at 375px, `md:` / `lg:` breakpoints for larger screens
- Card hover: subtle elevation (`box-shadow` lift)
- Score changes: slide/fade animation
- Card entrance: staggered `animation-delay` via CSS `@keyframes`
- Sport tab switch: smooth transition
- No sidebars, no mega-navs

---

## Environment Variables

### `apps/api/.env.example`
```env
NODE_ENV=development
DATABASE_URL=file:./dev.db
PORT=3000

# Leave blank in dev — triggers mock data mode
FOOTBALL_API_KEY=
CRICKET_API_KEY=

# Leave blank in dev — triggers auth bypass
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Leave blank in dev — triggers in-memory cache
REDIS_URL=
```

### `apps/web/.env.example`
```env
VITE_API_URL=http://localhost:3000
VITE_DEV_AUTH=true

# Leave blank in dev
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
```

---

## Dev Environment Summary

| Concern | Dev | Prod |
|---|---|---|
| Database | SQLite (`file:./dev.db`) | Postgres (Railway) |
| Cache | In-memory Map with TTL | Redis (Upstash) |
| Auth | Dev bypass (hardcoded user) | Firebase Auth |
| Match data | Mock data (`mockData.ts`) | football-data.org + cricapi.com |

---

## Data Sources

### Football — football-data.org
- Free tier: 10 req/min, `X-Auth-Token` header
- Leagues: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League
- Key endpoints: `/v4/competitions/{id}/teams`, `/v4/competitions/{id}/matches`, `/v4/matches/{id}`

### Cricket — cricapi.com
- Free tier: ~100 req/day, `?apikey=XXX` query param
- Coverage: Tests, ODIs, T20Is, IPL
- Key endpoints: `/currentMatches`, `/matches`, `/match_info?id=X`

---

## Build Rules

1. Always use TypeScript. No `any` types.
2. All external API data normalizes through `matchNormalizer` before reaching cache or DB. Frontend never sees raw API shapes.
3. Cache-first: every match route checks cache → DB → never external API on user request.
4. Handle API failures gracefully — stale cached data served with `{ stale: true, lastUpdated }` metadata; frontend shows "last updated X ago".
5. Keep components under ~150 lines. Extract sub-components when approaching limit.
6. Mobile-first Tailwind — base styles are mobile, `md:` / `lg:` for larger screens.
7. Seed DB with teams from both sports on first run (`pnpm db:seed`).
8. Include `.env.example` for both apps.
9. Include README with: what it is, tech stack, local setup instructions, screenshots placeholder, known limitations.

---

## Known Limitations (to document in README)

- Scores update via polling (~30s delay), not real-time WebSockets
- Cricket data may lag during heavy match days due to free API rate limits (~100 req/day)
- No player stats or lineups (free tier limitation)
- Limited to 6 football leagues + IPL/Internationals for cricket
- No light mode in MVP
