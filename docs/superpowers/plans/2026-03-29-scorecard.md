# Scorecard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Scorecard — a full-stack live sports dashboard — as a pnpm monorepo with a React/Vite frontend and Express/Prisma backend, supporting football and cricket match tracking with polling-based live updates.

**Architecture:** pnpm workspace monorepo with `apps/web` (Vite + React 18 + TypeScript + Tailwind + Zustand), `apps/api` (Express + Node + TypeScript + Prisma + node-cron), and `packages/types` (shared TypeScript interfaces). The backend polls football-data.org and cricapi.com on a cron schedule, normalizes all data through `matchNormalizer`, and caches it in memory (dev) or Redis (prod). The frontend polls the backend's REST endpoints every 30s–10min. No external API calls happen on user requests.

**Tech Stack:** React 18, Vite 5, TypeScript 5, Tailwind CSS 3, Zustand 4, React Router 6, Axios / Express 4, Prisma 5, node-cron, ioredis, Firebase Admin SDK (prod) / dev bypass, SQLite (dev), PostgreSQL (prod)

---

## File Map

### `packages/types/`
- `package.json` — package named `@scorecard/types`
- `src/index.ts` — all shared interfaces: `Sport`, `MatchStatus`, `Team`, `FootballMatch`, `CricketMatch`, `Match`
- `tsconfig.json`

### `apps/api/`
- `package.json`
- `tsconfig.json`
- `.env` (copied from `.env.example`, not committed)
- `.env.example`
- `prisma/schema.prisma` — PostgreSQL provider (prod)
- `prisma/schema.dev.prisma` — SQLite provider (dev)
- `prisma/seed.ts` — seeds DB with teams from mock data
- `src/index.ts` — Express app entry, registers routes, starts pollers
- `src/db/prisma.ts` — Prisma client singleton (uses dev schema in development)
- `src/cache/index.ts` — `CacheService` interface + factory (selects impl by env)
- `src/cache/inMemoryCache.ts` — `Map<string, {value, expiresAt}>` with TTL
- `src/cache/redisCache.ts` — ioredis-backed cache
- `src/middleware/auth.ts` — Firebase token verify + dev bypass
- `src/services/matchNormalizer.ts` — maps raw API shapes → `Match` types
- `src/services/mockData.ts` — static mock matches + teams
- `src/services/footballPoller.ts` — node-cron job for football-data.org
- `src/services/cricketPoller.ts` — node-cron job for cricapi.com
- `src/routes/auth.ts` — `POST /auth/verify`
- `src/routes/teams.ts` — team list + follow/unfollow
- `src/routes/matches.ts` — match queries by status

### `apps/web/`
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.node.json`
- `tailwind.config.js`
- `postcss.config.js`
- `index.html`
- `.env.example`
- `src/main.tsx`
- `src/App.tsx` — React Router routes
- `src/index.css` — Tailwind directives + Instrument Sans font + keyframe animations
- `src/lib/api.ts` — Axios instance that injects `Authorization` header from `authStore`
- `src/hooks/usePolling.ts` — immediate fetch + setInterval + cleanup
- `src/hooks/useAuth.ts` — Firebase auth state observer + dev bypass
- `src/store/authStore.ts` — Zustand: user, token, isAuthenticated
- `src/store/matchStore.ts` — Zustand: liveMatches, upcomingMatches, recentMatches, sportFilter
- `src/store/teamStore.ts` — Zustand: followedTeams, follow, unfollow
- `src/components/ui/SportTabs.tsx`
- `src/components/ui/LiveIndicator.tsx`
- `src/components/ui/EmptyState.tsx`
- `src/components/cards/FootballCard.tsx`
- `src/components/cards/CricketCard.tsx`
- `src/components/sections/LiveSection.tsx`
- `src/components/sections/UpcomingSection.tsx`
- `src/components/sections/RecentSection.tsx`
- `src/pages/Landing.tsx`
- `src/pages/TeamPicker.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Settings.tsx`

### Root
- `pnpm-workspace.yaml`
- `package.json` — root dev/build/db scripts using concurrently
- `.gitignore`
- `README.md`

---

## Phase 1: Foundation

### Task 1: Initialize monorepo root

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Verify pnpm is installed**

```bash
pnpm --version
```
Expected: `8.x.x` or higher. If missing: `npm install -g pnpm`

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Create root `package.json`**

```json
{
  "name": "scorecard",
  "private": true,
  "scripts": {
    "dev": "concurrently \"pnpm --filter @scorecard/api dev\" \"pnpm --filter @scorecard/web dev\"",
    "build": "pnpm --filter @scorecard/web build && pnpm --filter @scorecard/api build",
    "db:migrate": "pnpm --filter @scorecard/api db:migrate",
    "db:seed": "pnpm --filter @scorecard/api db:seed",
    "lint": "pnpm -r lint"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
.env
*.db
*.db-journal
.DS_Store
```

- [ ] **Step 5: Install root dependencies**

```bash
pnpm install
```
Expected: `node_modules/.pnpm` created at root.

- [ ] **Step 6: Commit**

```bash
git init
git add pnpm-workspace.yaml package.json pnpm-lock.yaml .gitignore
git commit -m "chore: initialize pnpm monorepo"
```

---

### Task 2: Create shared types package

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/index.ts`

- [ ] **Step 1: Create package directory and `package.json`**

```bash
mkdir -p packages/types/src
```

`packages/types/package.json`:
```json
{
  "name": "@scorecard/types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {}
}
```

- [ ] **Step 2: Create `packages/types/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "strict": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/types/src/index.ts`**

```typescript
export type Sport = "football" | "cricket";
export type MatchStatus = "LIVE" | "UPCOMING" | "FINISHED";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  sport: Sport;
}

export interface FootballMatch {
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

export interface CricketMatch {
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

export type Match = FootballMatch | CricketMatch;

export interface StaleWrapper<T> {
  data: T;
  stale: boolean;
  lastUpdated: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/
git commit -m "feat: add @scorecard/types shared package"
```

---

## Phase 2: Backend Core

### Task 3: Initialize API app

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/.env.example`
- Create: `apps/api/.env`
- Create: `apps/api/src/index.ts`

- [ ] **Step 1: Create directory and `package.json`**

```bash
mkdir -p apps/api/src
```

`apps/api/package.json`:
```json
{
  "name": "@scorecard/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate dev --schema=prisma/schema.dev.prisma",
    "db:migrate:prod": "prisma migrate deploy --schema=prisma/schema.prisma",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio --schema=prisma/schema.dev.prisma"
  },
  "dependencies": {
    "@prisma/client": "^5.10.2",
    "@scorecard/types": "workspace:*",
    "axios": "^1.6.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.3",
    "firebase-admin": "^12.0.0",
    "ioredis": "^5.3.2",
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.24",
    "@types/node-cron": "^3.0.11",
    "prisma": "^5.10.2",
    "tsx": "^4.7.1",
    "typescript": "^5.4.2"
  }
}
```

- [ ] **Step 2: Create `apps/api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "paths": {
      "@scorecard/types": ["../../packages/types/src/index.ts"]
    }
  },
  "include": ["src", "prisma"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `apps/api/.env.example`**

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

- [ ] **Step 4: Create `apps/api/.env`** (copy from example)

```bash
cp apps/api/.env.example apps/api/.env
```

- [ ] **Step 5: Create `apps/api/src/index.ts`** (minimal skeleton — will be filled in Task 11)

```typescript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

export default app;
```

- [ ] **Step 6: Install dependencies**

```bash
cd apps/api && pnpm install
```

- [ ] **Step 7: Verify the app starts**

```bash
cd apps/api && pnpm dev
```
Expected: `API running on http://localhost:3000`
Visit `http://localhost:3000/health` → `{"status":"ok"}`
Stop with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add apps/api/
git commit -m "feat: initialize API app with Express skeleton"
```

---

### Task 4: Prisma schemas and database setup

**Files:**
- Create: `apps/api/prisma/schema.dev.prisma`
- Create: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Create `apps/api/prisma/schema.dev.prisma`** (SQLite — for local development)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

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

- [ ] **Step 2: Create `apps/api/prisma/schema.prisma`** (PostgreSQL — for production)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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

- [ ] **Step 3: Generate Prisma client and run dev migration**

```bash
cd apps/api
pnpm prisma migrate dev --schema=prisma/schema.dev.prisma --name init
```
Expected: `dev.db` created in `apps/api/`, migration applied. Output ends with `Your database is now in sync with your schema.`

- [ ] **Step 4: Create `apps/api/src/db/prisma.ts`**

```bash
mkdir -p apps/api/src/db
```

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/ apps/api/src/db/
git commit -m "feat: add Prisma schemas (SQLite dev, Postgres prod) and client"
```

---

### Task 5: Cache abstraction

**Files:**
- Create: `apps/api/src/cache/index.ts`
- Create: `apps/api/src/cache/inMemoryCache.ts`
- Create: `apps/api/src/cache/redisCache.ts`

- [ ] **Step 1: Create `apps/api/src/cache/index.ts`**

```bash
mkdir -p apps/api/src/cache
```

```typescript
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

let _cache: CacheService | null = null;

export function getCache(): CacheService {
  if (_cache) return _cache;

  if (process.env.REDIS_URL) {
    const { RedisCache } = require('./redisCache');
    _cache = new RedisCache(process.env.REDIS_URL);
  } else {
    const { InMemoryCache } = require('./inMemoryCache');
    _cache = new InMemoryCache();
  }

  return _cache!;
}
```

- [ ] **Step 2: Create `apps/api/src/cache/inMemoryCache.ts`**

```typescript
import { CacheService } from './index';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCache implements CacheService {
  private store = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}
```

- [ ] **Step 3: Create `apps/api/src/cache/redisCache.ts`**

```typescript
import Redis from 'ioredis';
import { CacheService } from './index';

export class RedisCache implements CacheService {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url);
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/cache/
git commit -m "feat: add cache abstraction (in-memory dev, Redis prod)"
```

---

### Task 6: Auth middleware

**Files:**
- Create: `apps/api/src/middleware/auth.ts`

- [ ] **Step 1: Create `apps/api/src/middleware/auth.ts`**

```bash
mkdir -p apps/api/src/middleware
```

```typescript
import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { prisma } from '../db/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; firebaseUid: string };
    }
  }
}

let firebaseInitialized = false;

function getFirebaseApp(): admin.app.App | null {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    return null;
  }

  if (!firebaseInitialized) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    firebaseInitialized = true;
  }

  return admin.app();
}

const DEV_USER = {
  id: 'dev-user-id',
  email: 'dev@scorecard.local',
  firebaseUid: 'dev-firebase-uid',
};

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const firebaseApp = getFirebaseApp();

  // Dev bypass: no Firebase config + development env
  if (!firebaseApp && process.env.NODE_ENV === 'development') {
    req.user = DEV_USER;
    next();
    return;
  }

  if (!firebaseApp) {
    res.status(500).json({ error: 'Firebase not configured' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    let user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseUid: decoded.uid,
          email: decoded.email ?? '',
          displayName: decoded.name ?? null,
        },
      });
    }

    req.user = { id: user.id, email: user.email, firebaseUid: user.firebaseUid };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/middleware/
git commit -m "feat: add auth middleware with Firebase verify and dev bypass"
```

---

### Task 7: Mock data and match normalizer

**Files:**
- Create: `apps/api/src/services/mockData.ts`
- Create: `apps/api/src/services/matchNormalizer.ts`

- [ ] **Step 1: Create `apps/api/src/services/mockData.ts`**

```bash
mkdir -p apps/api/src/services
```

```typescript
import { FootballMatch, CricketMatch, Team } from '@scorecard/types';

export const mockFootballTeams: Team[] = [
  { id: 'arsenal', name: 'Arsenal FC', shortName: 'Arsenal', logo: '', sport: 'football' },
  { id: 'chelsea', name: 'Chelsea FC', shortName: 'Chelsea', logo: '', sport: 'football' },
  { id: 'mancity', name: 'Manchester City', shortName: 'Man City', logo: '', sport: 'football' },
  { id: 'liverpool', name: 'Liverpool FC', shortName: 'Liverpool', logo: '', sport: 'football' },
  { id: 'realmadrid', name: 'Real Madrid CF', shortName: 'Real Madrid', logo: '', sport: 'football' },
  { id: 'barcelona', name: 'FC Barcelona', shortName: 'Barcelona', logo: '', sport: 'football' },
];

export const mockCricketTeams: Team[] = [
  { id: 'india', name: 'India', shortName: 'IND', logo: '', sport: 'cricket' },
  { id: 'australia', name: 'Australia', shortName: 'AUS', logo: '', sport: 'cricket' },
  { id: 'england', name: 'England', shortName: 'ENG', logo: '', sport: 'cricket' },
  { id: 'pakistan', name: 'Pakistan', shortName: 'PAK', logo: '', sport: 'cricket' },
  { id: 'southafrica', name: 'South Africa', shortName: 'SA', logo: '', sport: 'cricket' },
];

const now = new Date();
const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

export const mockFootballMatches: FootballMatch[] = [
  {
    id: 'mock-football-1',
    sport: 'football',
    status: 'LIVE',
    competition: 'Premier League',
    homeTeam: mockFootballTeams[0],
    awayTeam: mockFootballTeams[1],
    score: { home: 2, away: 1 },
    minute: 67,
    startTime: new Date(now.getTime() - 67 * 60 * 1000).toISOString(),
    events: [
      { type: 'GOAL', team: 'Arsenal', player: 'Saka', minute: 23 },
      { type: 'GOAL', team: 'Chelsea', player: 'Palmer', minute: 41 },
      { type: 'GOAL', team: 'Arsenal', player: 'Martinelli', minute: 58 },
    ],
  },
  {
    id: 'mock-football-2',
    sport: 'football',
    status: 'UPCOMING',
    competition: 'La Liga',
    homeTeam: mockFootballTeams[4],
    awayTeam: mockFootballTeams[5],
    score: { home: 0, away: 0 },
    startTime: inTwoDays,
    events: [],
  },
  {
    id: 'mock-football-3',
    sport: 'football',
    status: 'FINISHED',
    competition: 'Premier League',
    homeTeam: mockFootballTeams[2],
    awayTeam: mockFootballTeams[3],
    score: { home: 3, away: 1 },
    startTime: twoDaysAgo,
    events: [],
  },
];

export const mockCricketMatches: CricketMatch[] = [
  {
    id: 'mock-cricket-1',
    sport: 'cricket',
    status: 'LIVE',
    competition: 'T20 International',
    format: 'T20',
    homeTeam: mockCricketTeams[0],
    awayTeam: mockCricketTeams[1],
    innings: [
      { team: 'India', runs: 167, wickets: 4, overs: 18.2 },
    ],
    currentInnings: 0,
    summary: 'India need 50 more from 10 balls',
    startTime: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-cricket-2',
    sport: 'cricket',
    status: 'UPCOMING',
    competition: 'ODI Series',
    format: 'ODI',
    homeTeam: mockCricketTeams[2],
    awayTeam: mockCricketTeams[3],
    innings: [],
    startTime: inTwoDays,
  },
  {
    id: 'mock-cricket-3',
    sport: 'cricket',
    status: 'FINISHED',
    competition: 'Test Series',
    format: 'TEST',
    homeTeam: mockCricketTeams[4],
    awayTeam: mockCricketTeams[1],
    innings: [
      { team: 'South Africa', runs: 312, wickets: 10, overs: 89.4 },
      { team: 'Australia', runs: 278, wickets: 10, overs: 82.1 },
    ],
    summary: 'South Africa won by 34 runs',
    startTime: twoDaysAgo,
  },
];
```

- [ ] **Step 2: Create `apps/api/src/services/matchNormalizer.ts`**

```typescript
import { FootballMatch, CricketMatch, MatchStatus, Team } from '@scorecard/types';

// Raw shapes from football-data.org
interface RawFootballTeam {
  id: number;
  name: string;
  shortName: string;
  crest: string;
}

interface RawFootballMatch {
  id: number;
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'SUSPENDED' | 'POSTPONED' | 'CANCELLED';
  utcDate: string;
  competition: { name: string };
  homeTeam: RawFootballTeam;
  awayTeam: RawFootballTeam;
  score: { fullTime: { home: number | null; away: number | null } };
  minute?: number;
}

// Raw shapes from cricapi.com
interface RawCricketTeamInfo {
  name: string;
  shortname: string;
  img: string;
}

interface RawCricketScore {
  r: number;
  w: number;
  o: number;
  inning: string;
}

interface RawCricketMatch {
  id: string;
  name: string;
  status: string;
  date?: string;
  dateTimeGMT?: string;
  teams: string[];
  teamInfo?: RawCricketTeamInfo[];
  score?: RawCricketScore[];
  matchType?: string;
}

function mapFootballStatus(raw: RawFootballMatch['status']): MatchStatus {
  if (raw === 'IN_PLAY' || raw === 'PAUSED') return 'LIVE';
  if (raw === 'SCHEDULED' || raw === 'TIMED') return 'UPCOMING';
  return 'FINISHED';
}

function mapCricketStatus(status: string): MatchStatus {
  const lower = status.toLowerCase();
  if (lower.includes('live') || lower.includes('in progress')) return 'LIVE';
  if (lower.includes('upcoming') || lower.includes('scheduled') || lower.includes('not started')) return 'UPCOMING';
  return 'FINISHED';
}

function mapCricketFormat(matchType?: string): 'T20' | 'ODI' | 'TEST' {
  if (!matchType) return 'ODI';
  const lower = matchType.toLowerCase();
  if (lower === 't20' || lower === 't20i') return 'T20';
  if (lower === 'test') return 'TEST';
  return 'ODI';
}

export function normalizeFootballMatch(raw: RawFootballMatch): FootballMatch {
  const homeTeam: Team = {
    id: String(raw.homeTeam.id),
    name: raw.homeTeam.name,
    shortName: raw.homeTeam.shortName ?? raw.homeTeam.name.split(' ')[0],
    logo: raw.homeTeam.crest ?? '',
    sport: 'football',
  };

  const awayTeam: Team = {
    id: String(raw.awayTeam.id),
    name: raw.awayTeam.name,
    shortName: raw.awayTeam.shortName ?? raw.awayTeam.name.split(' ')[0],
    logo: raw.awayTeam.crest ?? '',
    sport: 'football',
  };

  return {
    id: String(raw.id),
    sport: 'football',
    status: mapFootballStatus(raw.status),
    competition: raw.competition.name,
    homeTeam,
    awayTeam,
    score: {
      home: raw.score.fullTime.home ?? 0,
      away: raw.score.fullTime.away ?? 0,
    },
    minute: raw.minute,
    startTime: raw.utcDate,
    events: [],
  };
}

export function normalizeCricketMatch(raw: RawCricketMatch): CricketMatch {
  const teamNames = raw.teams ?? ['Home', 'Away'];
  const teamInfoMap = new Map<string, RawCricketTeamInfo>();
  (raw.teamInfo ?? []).forEach((t) => teamInfoMap.set(t.name, t));

  function makeTeam(name: string): Team {
    const info = teamInfoMap.get(name);
    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      shortName: info?.shortname ?? name.slice(0, 3).toUpperCase(),
      logo: info?.img ?? '',
      sport: 'cricket',
    };
  }

  const homeTeam = makeTeam(teamNames[0]);
  const awayTeam = makeTeam(teamNames[1] ?? 'Away');

  const innings = (raw.score ?? []).map((s) => ({
    team: s.inning.replace(/ (1st|2nd) Innings?$/i, '').trim(),
    runs: s.r,
    wickets: s.w,
    overs: s.o,
  }));

  return {
    id: raw.id,
    sport: 'cricket',
    status: mapCricketStatus(raw.status),
    competition: raw.name ?? 'Cricket Match',
    format: mapCricketFormat(raw.matchType),
    homeTeam,
    awayTeam,
    innings,
    currentInnings: innings.length > 0 ? innings.length - 1 : undefined,
    summary: raw.status,
    startTime: raw.dateTimeGMT ?? raw.date ?? new Date().toISOString(),
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/
git commit -m "feat: add mock data and match normalizer service"
```

---

### Task 8: Pollers (football + cricket)

**Files:**
- Create: `apps/api/src/services/footballPoller.ts`
- Create: `apps/api/src/services/cricketPoller.ts`

- [ ] **Step 1: Create `apps/api/src/services/footballPoller.ts`**

```typescript
import cron from 'node-cron';
import axios from 'axios';
import { getCache } from '../cache';
import { normalizeFootballMatch } from './matchNormalizer';
import { mockFootballMatches } from './mockData';
import { Match } from '@scorecard/types';

export const FOOTBALL_CACHE_KEYS = {
  live: 'football:live',
  upcoming: 'football:upcoming',
  recent: 'football:recent',
  lastUpdated: 'football:lastUpdated',
};

const COMPETITION_IDS = [2021, 2014, 2019, 2002, 2015, 2001]; // PL, LaLiga, SerieA, Bundesliga, Ligue1, UCL
const FOOTBALL_API_BASE = 'https://api.football-data.org/v4';

async function fetchAndCache(): Promise<void> {
  const cache = getCache();
  const apiKey = process.env.FOOTBALL_API_KEY;

  // Mock mode
  if (!apiKey) {
    await cache.set<Match[]>(FOOTBALL_CACHE_KEYS.live, mockFootballMatches.filter(m => m.status === 'LIVE'), 60);
    await cache.set<Match[]>(FOOTBALL_CACHE_KEYS.upcoming, mockFootballMatches.filter(m => m.status === 'UPCOMING'), 900);
    await cache.set<Match[]>(FOOTBALL_CACHE_KEYS.recent, mockFootballMatches.filter(m => m.status === 'FINISHED'), 900);
    await cache.set<string>(FOOTBALL_CACHE_KEYS.lastUpdated, new Date().toISOString(), 900);
    return;
  }

  const headers = { 'X-Auth-Token': apiKey };

  try {
    const liveMatches: Match[] = [];
    const upcomingMatches: Match[] = [];
    const recentMatches: Match[] = [];

    for (const id of COMPETITION_IDS) {
      const { data } = await axios.get(`${FOOTBALL_API_BASE}/competitions/${id}/matches`, {
        headers,
        params: { status: 'IN_PLAY,SCHEDULED,FINISHED', limit: 10 },
      });

      for (const raw of data.matches ?? []) {
        const match = normalizeFootballMatch(raw);
        if (match.status === 'LIVE') liveMatches.push(match);
        else if (match.status === 'UPCOMING') upcomingMatches.push(match);
        else recentMatches.push(match);
      }

      // Respect 10 req/min rate limit
      await new Promise(r => setTimeout(r, 6500));
    }

    await cache.set<Match[]>(FOOTBALL_CACHE_KEYS.live, liveMatches, 60);
    await cache.set<Match[]>(FOOTBALL_CACHE_KEYS.upcoming, upcomingMatches.slice(0, 30), 900);
    await cache.set<Match[]>(FOOTBALL_CACHE_KEYS.recent, recentMatches.slice(0, 30), 900);
    await cache.set<string>(FOOTBALL_CACHE_KEYS.lastUpdated, new Date().toISOString(), 3600);
  } catch (err) {
    console.error('[FootballPoller] Fetch failed:', err instanceof Error ? err.message : err);
  }
}

export function startFootballPoller(): void {
  // Run immediately on start
  void fetchAndCache();

  // Live: every 60 seconds
  cron.schedule('*/1 * * * *', () => void fetchAndCache());

  // Upcoming/Recent: every 15 minutes (live poll also refreshes these)
  console.log('[FootballPoller] Started');
}
```

- [ ] **Step 2: Create `apps/api/src/services/cricketPoller.ts`**

```typescript
import cron from 'node-cron';
import axios from 'axios';
import { getCache } from '../cache';
import { normalizeCricketMatch } from './matchNormalizer';
import { mockCricketMatches } from './mockData';
import { Match } from '@scorecard/types';

export const CRICKET_CACHE_KEYS = {
  live: 'cricket:live',
  upcoming: 'cricket:upcoming',
  recent: 'cricket:recent',
  lastUpdated: 'cricket:lastUpdated',
};

const CRICKET_API_BASE = 'https://api.cricapi.com/v1';

async function fetchAndCache(): Promise<void> {
  const cache = getCache();
  const apiKey = process.env.CRICKET_API_KEY;

  // Mock mode
  if (!apiKey) {
    await cache.set<Match[]>(CRICKET_CACHE_KEYS.live, mockCricketMatches.filter(m => m.status === 'LIVE'), 180);
    await cache.set<Match[]>(CRICKET_CACHE_KEYS.upcoming, mockCricketMatches.filter(m => m.status === 'UPCOMING'), 900);
    await cache.set<Match[]>(CRICKET_CACHE_KEYS.recent, mockCricketMatches.filter(m => m.status === 'FINISHED'), 900);
    await cache.set<string>(CRICKET_CACHE_KEYS.lastUpdated, new Date().toISOString(), 900);
    return;
  }

  try {
    const { data: currentData } = await axios.get(`${CRICKET_API_BASE}/currentMatches`, {
      params: { apikey: apiKey, offset: 0 },
    });

    const { data: allData } = await axios.get(`${CRICKET_API_BASE}/matches`, {
      params: { apikey: apiKey, offset: 0 },
    });

    const liveMatches: Match[] = [];
    const upcomingMatches: Match[] = [];
    const recentMatches: Match[] = [];

    for (const raw of currentData.data ?? []) {
      const match = normalizeCricketMatch(raw);
      if (match.status === 'LIVE') liveMatches.push(match);
    }

    for (const raw of allData.data ?? []) {
      const match = normalizeCricketMatch(raw);
      if (match.status === 'UPCOMING') upcomingMatches.push(match);
      else if (match.status === 'FINISHED') recentMatches.push(match);
    }

    await cache.set<Match[]>(CRICKET_CACHE_KEYS.live, liveMatches, 180);
    await cache.set<Match[]>(CRICKET_CACHE_KEYS.upcoming, upcomingMatches.slice(0, 20), 900);
    await cache.set<Match[]>(CRICKET_CACHE_KEYS.recent, recentMatches.slice(0, 20), 900);
    await cache.set<string>(CRICKET_CACHE_KEYS.lastUpdated, new Date().toISOString(), 3600);
  } catch (err) {
    console.error('[CricketPoller] Fetch failed:', err instanceof Error ? err.message : err);
  }
}

export function startCricketPoller(): void {
  void fetchAndCache();

  // Every 3 minutes (rate limit: ~100 req/day)
  cron.schedule('*/3 * * * *', () => void fetchAndCache());

  console.log('[CricketPoller] Started');
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/footballPoller.ts apps/api/src/services/cricketPoller.ts
git commit -m "feat: add football and cricket pollers with mock data fallback"
```

---

## Phase 3: Backend Routes

### Task 9: Auth and Teams routes

**Files:**
- Create: `apps/api/src/routes/auth.ts`
- Create: `apps/api/src/routes/teams.ts`

- [ ] **Step 1: Create `apps/api/src/routes/auth.ts`**

```bash
mkdir -p apps/api/src/routes
```

```typescript
import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { prisma } from '../db/prisma';

const router = Router();

router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body as { token?: string };

  // Dev bypass: no token needed
  if (process.env.NODE_ENV === 'development' && !process.env.FIREBASE_PROJECT_ID) {
    const devUser = await prisma.user.upsert({
      where: { firebaseUid: 'dev-firebase-uid' },
      update: {},
      create: {
        firebaseUid: 'dev-firebase-uid',
        email: 'dev@scorecard.local',
        displayName: 'Dev User',
      },
    });
    res.json({ user: devUser });
    return;
  }

  if (!token) {
    res.status(400).json({ error: 'Missing token' });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const user = await prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      update: { displayName: decoded.name ?? null },
      create: {
        firebaseUid: decoded.uid,
        email: decoded.email ?? '',
        displayName: decoded.name ?? null,
      },
    });
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
```

- [ ] **Step 2: Create `apps/api/src/routes/teams.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/auth';
import { mockFootballTeams, mockCricketTeams } from '../services/mockData';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const sport = req.query['sport'] as string | undefined;

  // In mock mode (no API keys), return mock teams from DB (seeded)
  const where = sport ? { sport } : {};
  const teams = await prisma.team.findMany({ where });
  res.json({ teams });
});

router.get('/mine', async (req: Request, res: Response): Promise<void> => {
  const follows = await prisma.teamFollow.findMany({
    where: { userId: req.user!.id },
    include: { team: true },
  });
  res.json({ teams: follows.map(f => f.team) });
});

router.post('/follow', async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.body as { teamId?: string };
  if (!teamId) {
    res.status(400).json({ error: 'Missing teamId' });
    return;
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }

  try {
    const follow = await prisma.teamFollow.create({
      data: { userId: req.user!.id, teamId },
    });
    res.status(201).json({ follow });
  } catch {
    res.status(409).json({ error: 'Already following' });
  }
});

router.delete('/follow/:teamId', async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.params;
  await prisma.teamFollow.deleteMany({
    where: { userId: req.user!.id, teamId },
  });
  res.status(204).send();
});

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/
git commit -m "feat: add auth verify and teams routes"
```

---

### Task 10: Matches routes

**Files:**
- Create: `apps/api/src/routes/matches.ts`

- [ ] **Step 1: Create `apps/api/src/routes/matches.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getCache } from '../cache';
import { prisma } from '../db/prisma';
import { FOOTBALL_CACHE_KEYS } from '../services/footballPoller';
import { CRICKET_CACHE_KEYS } from '../services/cricketPoller';
import { Match, StaleWrapper } from '@scorecard/types';

const router = Router();

router.use(authMiddleware);

async function getMatchesForUser(userId: string): Promise<{ teamIds: Set<string>; sports: Set<string> }> {
  const follows = await prisma.teamFollow.findMany({
    where: { userId },
    include: { team: true },
  });
  const teamIds = new Set(follows.map(f => f.teamId));
  const sports = new Set(follows.map(f => f.team.sport));
  return { teamIds, sports };
}

function filterByUserTeams(matches: Match[], teamIds: Set<string>): Match[] {
  return matches.filter(
    m => teamIds.has(m.homeTeam.id) || teamIds.has(m.awayTeam.id)
  );
}

async function getMatchesByStatus(
  status: 'live' | 'upcoming' | 'recent',
  sports: Set<string>
): Promise<{ matches: Match[]; stale: boolean; lastUpdated: string }> {
  const cache = getCache();

  const footballKey = FOOTBALL_CACHE_KEYS[status];
  const cricketKey = CRICKET_CACHE_KEYS[status];
  const footballLastUpdatedKey = FOOTBALL_CACHE_KEYS.lastUpdated;
  const cricketLastUpdatedKey = CRICKET_CACHE_KEYS.lastUpdated;

  const [
    footballMatches,
    cricketMatches,
    footballLastUpdated,
    cricketLastUpdated,
  ] = await Promise.all([
    sports.has('football') ? cache.get<Match[]>(footballKey) : Promise.resolve([]),
    sports.has('cricket') ? cache.get<Match[]>(cricketKey) : Promise.resolve([]),
    cache.get<string>(footballLastUpdatedKey),
    cache.get<string>(cricketLastUpdatedKey),
  ]);

  const matches: Match[] = [
    ...(footballMatches ?? []),
    ...(cricketMatches ?? []),
  ];

  const lastUpdated = footballLastUpdated ?? cricketLastUpdated ?? new Date().toISOString();
  const stale = !footballLastUpdated && !cricketLastUpdated;

  return { matches, stale, lastUpdated };
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { teamIds, sports } = await getMatchesForUser(req.user!.id);
  const [live, upcoming, recent] = await Promise.all([
    getMatchesByStatus('live', sports),
    getMatchesByStatus('upcoming', sports),
    getMatchesByStatus('recent', sports),
  ]);
  res.json({
    live: filterByUserTeams(live.matches, teamIds),
    upcoming: filterByUserTeams(upcoming.matches, teamIds),
    recent: filterByUserTeams(recent.matches, teamIds),
    stale: live.stale || upcoming.stale || recent.stale,
    lastUpdated: live.lastUpdated,
  });
});

router.get('/live', async (req: Request, res: Response): Promise<void> => {
  const { teamIds, sports } = await getMatchesForUser(req.user!.id);
  const { matches, stale, lastUpdated } = await getMatchesByStatus('live', sports);
  const filtered = filterByUserTeams(matches, teamIds);
  res.json({ matches: filtered, stale, lastUpdated });
});

router.get('/upcoming', async (req: Request, res: Response): Promise<void> => {
  const { teamIds, sports } = await getMatchesForUser(req.user!.id);
  const { matches, stale, lastUpdated } = await getMatchesByStatus('upcoming', sports);
  const filtered = filterByUserTeams(matches, teamIds);
  res.json({ matches: filtered, stale, lastUpdated });
});

router.get('/recent', async (req: Request, res: Response): Promise<void> => {
  const { teamIds, sports } = await getMatchesForUser(req.user!.id);
  const { matches, stale, lastUpdated } = await getMatchesByStatus('recent', sports);
  const filtered = filterByUserTeams(matches, teamIds);
  res.json({ matches: filtered, stale, lastUpdated });
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/routes/matches.ts
git commit -m "feat: add matches routes with cache-first data retrieval"
```

---

### Task 11: Wire up Express app and seed script

**Files:**
- Modify: `apps/api/src/index.ts`
- Create: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Replace `apps/api/src/index.ts` with full wired version**

```typescript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import teamsRouter from './routes/teams';
import matchesRouter from './routes/matches';
import { startFootballPoller } from './services/footballPoller';
import { startCricketPoller } from './services/cricketPoller';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV });
});

app.use('/auth', authRouter);
app.use('/teams', teamsRouter);
app.use('/matches', matchesRouter);

// Start pollers
startFootballPoller();
startCricketPoller();

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

export default app;
```

- [ ] **Step 2: Create `apps/api/prisma/seed.ts`**

```typescript
import { PrismaClient } from '@prisma/client';
import { mockFootballTeams, mockCricketTeams } from '../src/services/mockData';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const allTeams = [...mockFootballTeams, ...mockCricketTeams];

  for (const team of allTeams) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: { name: team.name, shortName: team.shortName, logo: team.logo },
      create: {
        id: team.id,
        sport: team.sport,
        name: team.name,
        shortName: team.shortName,
        logo: team.logo,
        competition: team.sport === 'football' ? 'Premier League / La Liga' : 'International',
        externalId: team.id,
      },
    });
  }

  console.log(`Seeded ${allTeams.length} teams.`);
}

main()
  .catch(console.error)
  .finally(() => void prisma.$disconnect());
```

- [ ] **Step 3: Run the seed**

```bash
cd apps/api && pnpm db:seed
```
Expected: `Seeded 11 teams.`

- [ ] **Step 4: Start the full API and verify**

```bash
cd apps/api && pnpm dev
```
In a separate terminal:
```bash
curl http://localhost:3000/health
# → {"status":"ok","env":"development"}

curl http://localhost:3000/teams
# → {"teams":[...]} (requires auth header, will return 401 without it — that's correct)
```
Stop the server.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/index.ts apps/api/prisma/seed.ts
git commit -m "feat: wire up Express app with routes and pollers, add seed script"
```

---

## Phase 4: Frontend Core

### Task 12: Initialize frontend app

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tsconfig.node.json`
- Create: `apps/web/tailwind.config.js`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/index.html`
- Create: `apps/web/.env.example`
- Create: `apps/web/src/main.tsx`

- [ ] **Step 1: Create directories**

```bash
mkdir -p apps/web/src/pages apps/web/src/components/cards apps/web/src/components/sections apps/web/src/components/ui apps/web/src/hooks apps/web/src/store apps/web/src/lib
```

- [ ] **Step 2: Create `apps/web/package.json`**

```json
{
  "name": "@scorecard/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@scorecard/types": "workspace:*",
    "axios": "^1.6.7",
    "firebase": "^10.9.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.3",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.4.2",
    "vite": "^5.1.6"
  }
}
```

- [ ] **Step 3: Create `apps/web/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@scorecard/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
});
```

- [ ] **Step 4: Create `apps/web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "paths": {
      "@scorecard/types": ["../../packages/types/src/index.ts"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: Create `apps/web/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Create `apps/web/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0F1A',
        card: '#141425',
        'card-border': '#1E2235',
        text: '#E8E8E8',
        'text-muted': '#8892A4',
        accent: '#00F5A0',
        live: '#FF3B3B',
      },
      fontFamily: {
        sans: ['"Instrument Sans"', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 7: Create `apps/web/postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 8: Create `apps/web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Scorecard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Create `apps/web/.env.example`**

```env
VITE_API_URL=http://localhost:3000
VITE_DEV_AUTH=true

# Leave blank in dev
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
```

- [ ] **Step 10: Copy `.env.example` to `.env`**

```bash
cp apps/web/.env.example apps/web/.env
```

- [ ] **Step 11: Create `apps/web/src/main.tsx`** (placeholder — App.tsx will be added in Task 18)

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="bg-bg min-h-screen text-text flex items-center justify-center">
      <p className="text-accent font-semibold text-xl">Scorecard — coming soon</p>
    </div>
  </React.StrictMode>
);
```

- [ ] **Step 12: Install dependencies**

```bash
cd apps/web && pnpm install
```

- [ ] **Step 13: Verify Vite starts**

```bash
cd apps/web && pnpm dev
```
Expected: Vite starts on `http://localhost:5173`. Open browser — should see green "Scorecard — coming soon" text on dark background. Stop with Ctrl+C.

- [ ] **Step 14: Commit**

```bash
git add apps/web/
git commit -m "feat: initialize Vite + React + Tailwind frontend"
```

---

### Task 13: Global CSS and design tokens

**Files:**
- Create: `apps/web/src/index.css`

- [ ] **Step 1: Create `apps/web/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    background-color: #0A0F1A;
    color: #E8E8E8;
    font-family: 'Instrument Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
}

@layer utilities {
  /* Live pulse animation */
  @keyframes live-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.3); }
  }
  .animate-live-pulse {
    animation: live-pulse 1.2s ease-in-out infinite;
  }

  /* Card stagger entrance */
  @keyframes card-in {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-card-in {
    animation: card-in 0.3s ease-out both;
  }

  /* Score change flash */
  @keyframes score-flash {
    0% { color: #00F5A0; }
    100% { color: inherit; }
  }
  .animate-score-flash {
    animation: score-flash 0.8s ease-out;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/index.css
git commit -m "feat: add global CSS with animations and design tokens"
```

---

### Task 14: Zustand stores

**Files:**
- Create: `apps/web/src/store/authStore.ts`
- Create: `apps/web/src/store/matchStore.ts`
- Create: `apps/web/src/store/teamStore.ts`

- [ ] **Step 1: Create `apps/web/src/store/authStore.ts`**

```typescript
import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: (user, token) => set({ user, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
  setToken: (token) => set({ token }),
}));
```

- [ ] **Step 2: Create `apps/web/src/store/matchStore.ts`**

```typescript
import { create } from 'zustand';
import { Match } from '@scorecard/types';

type SportFilter = 'all' | 'football' | 'cricket';

interface MatchState {
  liveMatches: Match[];
  upcomingMatches: Match[];
  recentMatches: Match[];
  sportFilter: SportFilter;
  stale: boolean;
  lastUpdated: string | null;
  setLiveMatches: (matches: Match[], meta?: { stale: boolean; lastUpdated: string }) => void;
  setUpcomingMatches: (matches: Match[], meta?: { stale: boolean; lastUpdated: string }) => void;
  setRecentMatches: (matches: Match[], meta?: { stale: boolean; lastUpdated: string }) => void;
  setSportFilter: (filter: SportFilter) => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  liveMatches: [],
  upcomingMatches: [],
  recentMatches: [],
  sportFilter: 'all',
  stale: false,
  lastUpdated: null,
  setLiveMatches: (matches, meta) =>
    set({ liveMatches: matches, stale: meta?.stale ?? false, lastUpdated: meta?.lastUpdated ?? null }),
  setUpcomingMatches: (matches) => set({ upcomingMatches: matches }),
  setRecentMatches: (matches) => set({ recentMatches: matches }),
  setSportFilter: (filter) => set({ sportFilter: filter }),
}));
```

- [ ] **Step 3: Create `apps/web/src/store/teamStore.ts`**

```typescript
import { create } from 'zustand';
import { Team } from '@scorecard/types';

interface TeamState {
  followedTeams: Team[];
  setFollowedTeams: (teams: Team[]) => void;
  addTeam: (team: Team) => void;
  removeTeam: (teamId: string) => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  followedTeams: [],
  setFollowedTeams: (teams) => set({ followedTeams: teams }),
  addTeam: (team) =>
    set((state) => ({
      followedTeams: state.followedTeams.find(t => t.id === team.id)
        ? state.followedTeams
        : [...state.followedTeams, team],
    })),
  removeTeam: (teamId) =>
    set((state) => ({
      followedTeams: state.followedTeams.filter(t => t.id !== teamId),
    })),
}));
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/store/
git commit -m "feat: add Zustand stores for auth, matches, and teams"
```

---

### Task 15: API client and hooks

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/hooks/usePolling.ts`
- Create: `apps/web/src/hooks/useAuth.ts`

- [ ] **Step 1: Create `apps/web/src/lib/api.ts`**

```typescript
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

- [ ] **Step 2: Create `apps/web/src/hooks/usePolling.ts`**

```typescript
import { useEffect, useRef } from 'react';

export function usePolling(callback: () => void | Promise<void>, intervalMs: number): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    // Immediate first fetch
    void callbackRef.current();

    const interval = setInterval(() => {
      void callbackRef.current();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);
}
```

- [ ] **Step 3: Create `apps/web/src/hooks/useAuth.ts`**

```typescript
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

const DEV_TOKEN = 'dev-token';
const DEV_USER = { id: 'dev-user-id', email: 'dev@scorecard.local', displayName: 'Dev User' };

export function useAuth(): { isAuthenticated: boolean; loading: boolean } {
  const { isAuthenticated, login } = useAuthStore();

  useEffect(() => {
    const isDev = import.meta.env.VITE_DEV_AUTH === 'true';

    if (isDev && !isAuthenticated) {
      // Dev bypass: auto-login
      api.post('/auth/verify', {}).then(() => {
        login(DEV_USER, DEV_TOKEN);
      }).catch(console.error);
      return;
    }

    if (!isDev) {
      // Firebase: listen for auth state changes
      import('firebase/auth').then(({ getAuth, onAuthStateChanged }) => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const token = await firebaseUser.getIdToken();
            const { data } = await api.post('/auth/verify', { token });
            login(
              { id: data.user.id, email: data.user.email, displayName: data.user.displayName },
              token
            );
          }
        });
        return unsubscribe;
      });
    }
  }, [isAuthenticated, login]);

  return { isAuthenticated, loading: false };
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/ apps/web/src/hooks/
git commit -m "feat: add API client, usePolling, and useAuth hooks"
```

---

## Phase 5: Frontend UI

### Task 16: Shared UI components

**Files:**
- Create: `apps/web/src/components/ui/LiveIndicator.tsx`
- Create: `apps/web/src/components/ui/SportTabs.tsx`
- Create: `apps/web/src/components/ui/EmptyState.tsx`

- [ ] **Step 1: Create `apps/web/src/components/ui/LiveIndicator.tsx`**

```tsx
export function LiveIndicator(): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-live animate-live-pulse" />
      <span className="text-live text-xs font-semibold uppercase tracking-wider">Live</span>
    </span>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/components/ui/SportTabs.tsx`**

```tsx
import { useMatchStore } from '../../store/matchStore';

type Tab = 'all' | 'football' | 'cricket';

const TABS: { label: string; value: Tab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Football', value: 'football' },
  { label: 'Cricket', value: 'cricket' },
];

export function SportTabs(): JSX.Element {
  const { sportFilter, setSportFilter } = useMatchStore();

  return (
    <div className="flex gap-1 bg-card rounded-full p-1 border border-card-border">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => setSportFilter(tab.value)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
            sportFilter === tab.value
              ? 'bg-accent text-bg'
              : 'text-text-muted hover:text-text'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/src/components/ui/EmptyState.tsx`**

```tsx
interface EmptyStateProps {
  message: string;
  icon?: string;
}

export function EmptyState({ message, icon = '📭' }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-text-muted">
      <span className="text-3xl mb-3">{icon}</span>
      <p className="text-sm">{message}</p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/
git commit -m "feat: add LiveIndicator, SportTabs, and EmptyState UI components"
```

---

### Task 17: Match cards

**Files:**
- Create: `apps/web/src/components/cards/FootballCard.tsx`
- Create: `apps/web/src/components/cards/CricketCard.tsx`

- [ ] **Step 1: Create `apps/web/src/components/cards/FootballCard.tsx`**

```tsx
import { FootballMatch } from '@scorecard/types';
import { LiveIndicator } from '../ui/LiveIndicator';

interface FootballCardProps {
  match: FootballMatch;
  index?: number;
}

export function FootballCard({ match, index = 0 }: FootballCardProps): JSX.Element {
  const delay = `${index * 60}ms`;

  return (
    <div
      className="bg-card border border-card-border rounded-card p-4 animate-card-in hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-200"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">{match.competition}</span>
        {match.status === 'LIVE' ? (
          <LiveIndicator />
        ) : match.status === 'UPCOMING' ? (
          <span className="text-xs text-text-muted">
            {new Date(match.startTime).toLocaleDateString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : (
          <span className="text-xs text-text-muted">FT</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 text-right">
          <p className="font-semibold text-sm truncate">{match.homeTeam.shortName}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {match.status === 'UPCOMING' ? (
            <span className="text-text-muted text-sm font-medium">vs</span>
          ) : (
            <span className={`text-lg font-bold tabular-nums ${match.status === 'LIVE' ? 'text-accent' : 'text-text'}`}>
              {match.score.home} – {match.score.away}
            </span>
          )}
          {match.status === 'LIVE' && match.minute && (
            <span className="text-xs text-live font-medium">{match.minute}&apos;</span>
          )}
        </div>

        <div className="flex-1 text-left">
          <p className="font-semibold text-sm truncate">{match.awayTeam.shortName}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/components/cards/CricketCard.tsx`**

```tsx
import { CricketMatch } from '@scorecard/types';
import { LiveIndicator } from '../ui/LiveIndicator';

interface CricketCardProps {
  match: CricketMatch;
  index?: number;
}

export function CricketCard({ match, index = 0 }: CricketCardProps): JSX.Element {
  const delay = `${index * 60}ms`;
  const currentInning = match.innings[match.currentInnings ?? 0];

  return (
    <div
      className="bg-card border border-card-border rounded-card p-4 animate-card-in hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-200"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">{match.competition}</span>
          <span className="text-xs bg-card-border text-text-muted px-1.5 py-0.5 rounded">
            {match.format}
          </span>
        </div>
        {match.status === 'LIVE' ? (
          <LiveIndicator />
        ) : match.status === 'UPCOMING' ? (
          <span className="text-xs text-text-muted">
            {new Date(match.startTime).toLocaleDateString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : (
          <span className="text-xs text-text-muted">Result</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="font-semibold text-sm">{match.homeTeam.shortName}</p>
        <span className="text-text-muted text-sm">vs</span>
        <p className="font-semibold text-sm">{match.awayTeam.shortName}</p>
      </div>

      {match.status !== 'UPCOMING' && (
        <div className="mt-2 space-y-1">
          {match.innings.map((inning, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-xs text-text-muted">{inning.team}</span>
              <span className={`text-sm font-semibold tabular-nums ${
                match.status === 'LIVE' && i === match.currentInnings ? 'text-accent' : 'text-text'
              }`}>
                {inning.runs}/{inning.wickets}
                <span className="text-xs text-text-muted ml-1">({inning.overs} ov)</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {match.summary && (
        <p className="text-xs text-text-muted mt-2 line-clamp-1">{match.summary}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cards/
git commit -m "feat: add FootballCard and CricketCard components"
```

---

### Task 18: Section components

**Files:**
- Create: `apps/web/src/components/sections/LiveSection.tsx`
- Create: `apps/web/src/components/sections/UpcomingSection.tsx`
- Create: `apps/web/src/components/sections/RecentSection.tsx`

- [ ] **Step 1: Create `apps/web/src/components/sections/LiveSection.tsx`**

```tsx
import { Match } from '@scorecard/types';
import { FootballCard } from '../cards/FootballCard';
import { CricketCard } from '../cards/CricketCard';
import { LiveIndicator } from '../ui/LiveIndicator';

interface LiveSectionProps {
  matches: Match[];
}

export function LiveSection({ matches }: LiveSectionProps): JSX.Element | null {
  if (matches.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <LiveIndicator />
        <span className="font-semibold text-sm text-text-muted">Live Now</span>
      </div>
      <div className="space-y-3">
        {matches.map((match, i) =>
          match.sport === 'football' ? (
            <FootballCard key={match.id} match={match} index={i} />
          ) : (
            <CricketCard key={match.id} match={match} index={i} />
          )
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/components/sections/UpcomingSection.tsx`**

```tsx
import { Match } from '@scorecard/types';
import { FootballCard } from '../cards/FootballCard';
import { CricketCard } from '../cards/CricketCard';
import { EmptyState } from '../ui/EmptyState';

interface UpcomingSectionProps {
  matches: Match[];
}

export function UpcomingSection({ matches }: UpcomingSectionProps): JSX.Element {
  return (
    <section>
      <h2 className="font-semibold text-sm text-text-muted mb-3 flex items-center gap-2">
        <span>📅</span> Upcoming
      </h2>
      {matches.length === 0 ? (
        <EmptyState message="No upcoming matches for your teams" icon="📅" />
      ) : (
        <div className="space-y-3">
          {matches.map((match, i) =>
            match.sport === 'football' ? (
              <FootballCard key={match.id} match={match} index={i} />
            ) : (
              <CricketCard key={match.id} match={match} index={i} />
            )
          )}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Create `apps/web/src/components/sections/RecentSection.tsx`**

```tsx
import { Match } from '@scorecard/types';
import { FootballCard } from '../cards/FootballCard';
import { CricketCard } from '../cards/CricketCard';
import { EmptyState } from '../ui/EmptyState';

interface RecentSectionProps {
  matches: Match[];
}

export function RecentSection({ matches }: RecentSectionProps): JSX.Element {
  return (
    <section>
      <h2 className="font-semibold text-sm text-text-muted mb-3 flex items-center gap-2">
        <span>✅</span> Recent Results
      </h2>
      {matches.length === 0 ? (
        <EmptyState message="No recent results for your teams" icon="✅" />
      ) : (
        <div className="space-y-3">
          {matches.map((match, i) =>
            match.sport === 'football' ? (
              <FootballCard key={match.id} match={match} index={i} />
            ) : (
              <CricketCard key={match.id} match={match} index={i} />
            )
          )}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/sections/
git commit -m "feat: add LiveSection, UpcomingSection, and RecentSection components"
```

---

## Phase 6: Pages and Routing

### Task 19: Landing page and app routing

**Files:**
- Create: `apps/web/src/pages/Landing.tsx`
- Create: `apps/web/src/App.tsx`
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: Create `apps/web/src/pages/Landing.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

const DEV_USER = { id: 'dev-user-id', email: 'dev@scorecard.local', displayName: 'Dev User' };

export function Landing(): JSX.Element {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isDev = import.meta.env.VITE_DEV_AUTH === 'true';

  async function handleDevLogin(): Promise<void> {
    await api.post('/auth/verify', {});
    login(DEV_USER, 'dev-token');
    navigate('/pick-teams');
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-bold text-text mb-2">
          Score<span className="text-accent">card</span>
        </h1>
        <p className="text-text-muted text-sm mb-10">
          Your teams. Live scores. Nothing else.
        </p>

        {isDev ? (
          <button
            onClick={() => void handleDevLogin()}
            className="w-full bg-accent text-bg font-semibold py-3 rounded-card hover:opacity-90 transition-opacity"
          >
            Continue as Dev User
          </button>
        ) : (
          <div className="space-y-3">
            <button className="w-full bg-accent text-bg font-semibold py-3 rounded-card hover:opacity-90 transition-opacity">
              Continue with Google
            </button>
            <button className="w-full bg-card border border-card-border text-text font-medium py-3 rounded-card hover:border-accent/50 transition-colors">
              Sign in with Email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { TeamPicker } from './pages/TeamPicker';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { useAuthStore } from './store/authStore';
import { useTeamStore } from './store/teamStore';

function ProtectedRoute({ children }: { children: JSX.Element }): JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

function DashboardRoute(): JSX.Element {
  const followedTeams = useTeamStore((s) => s.followedTeams);
  if (followedTeams.length === 0) return <Navigate to="/pick-teams" replace />;
  return <Dashboard />;
}

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/pick-teams"
          element={
            <ProtectedRoute>
              <TeamPicker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Update `apps/web/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/Landing.tsx apps/web/src/App.tsx apps/web/src/main.tsx
git commit -m "feat: add Landing page and React Router app routing"
```

---

### Task 20: TeamPicker page

**Files:**
- Create: `apps/web/src/pages/TeamPicker.tsx`

- [ ] **Step 1: Create `apps/web/src/pages/TeamPicker.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Team } from '@scorecard/types';
import api from '../lib/api';
import { useTeamStore } from '../store/teamStore';

export function TeamPicker(): JSX.Element {
  const navigate = useNavigate();
  const { followedTeams, addTeam, removeTeam, setFollowedTeams } = useTeamStore();
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState<'all' | 'football' | 'cricket'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ teams: Team[] }>('/teams')
      .then(({ data }) => setAllTeams(data.teams))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = allTeams.filter((t) => {
    const matchesSport = sportFilter === 'all' || t.sport === sportFilter;
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    return matchesSport && matchesSearch;
  });

  const isFollowing = (id: string): boolean => followedTeams.some(t => t.id === id);

  async function toggleTeam(team: Team): Promise<void> {
    if (isFollowing(team.id)) {
      await api.delete(`/teams/follow/${team.id}`);
      removeTeam(team.id);
    } else {
      await api.post('/teams/follow', { teamId: team.id });
      addTeam(team);
    }
  }

  async function handleDone(): Promise<void> {
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-text mb-1">Pick Your Teams</h1>
        <p className="text-text-muted text-sm mb-6">Follow at least 1 team to get started.</p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-card border border-card-border rounded-card px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent mb-4"
        />

        {/* Sport filter */}
        <div className="flex gap-2 mb-6">
          {(['all', 'football', 'cricket'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSportFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                sportFilter === s ? 'bg-accent text-bg' : 'bg-card text-text-muted border border-card-border'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Team list */}
        {loading ? (
          <p className="text-text-muted text-sm text-center py-8">Loading teams...</p>
        ) : (
          <div className="space-y-2 mb-8">
            {filtered.map((team) => (
              <div
                key={team.id}
                onClick={() => void toggleTeam(team)}
                className={`flex items-center justify-between p-3.5 rounded-card border cursor-pointer transition-all ${
                  isFollowing(team.id)
                    ? 'bg-accent/10 border-accent/40'
                    : 'bg-card border-card-border hover:border-accent/30'
                }`}
              >
                <div>
                  <p className="font-medium text-sm text-text">{team.name}</p>
                  <p className="text-xs text-text-muted capitalize">{team.sport}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isFollowing(team.id) ? 'bg-accent border-accent' : 'border-card-border'
                }`}>
                  {isFollowing(team.id) && (
                    <svg className="w-3 h-3 text-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Done button */}
        <button
          onClick={() => void handleDone()}
          disabled={followedTeams.length === 0}
          className="w-full bg-accent text-bg font-semibold py-3 rounded-card disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          Done {followedTeams.length > 0 && `(${followedTeams.length} selected)`}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/TeamPicker.tsx
git commit -m "feat: add TeamPicker page with search, filter, and follow/unfollow"
```

---

### Task 21: Dashboard page

**Files:**
- Create: `apps/web/src/pages/Dashboard.tsx`

- [ ] **Step 1: Create `apps/web/src/pages/Dashboard.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../store/matchStore';
import { usePolling } from '../hooks/usePolling';
import { SportTabs } from '../components/ui/SportTabs';
import { LiveSection } from '../components/sections/LiveSection';
import { UpcomingSection } from '../components/sections/UpcomingSection';
import { RecentSection } from '../components/sections/RecentSection';
import { Match } from '@scorecard/types';
import api from '../lib/api';

interface MatchResponse {
  matches: Match[];
  stale: boolean;
  lastUpdated: string;
}

export function Dashboard(): JSX.Element {
  const navigate = useNavigate();
  const {
    liveMatches,
    upcomingMatches,
    recentMatches,
    sportFilter,
    stale,
    lastUpdated,
    setLiveMatches,
    setUpcomingMatches,
    setRecentMatches,
  } = useMatchStore();

  usePolling(async () => {
    const { data } = await api.get<MatchResponse>('/matches/live');
    setLiveMatches(data.matches, { stale: data.stale, lastUpdated: data.lastUpdated });
  }, 30_000);

  usePolling(async () => {
    const { data } = await api.get<MatchResponse>('/matches/upcoming');
    setUpcomingMatches(data.matches);
  }, 5 * 60_000);

  usePolling(async () => {
    const { data } = await api.get<MatchResponse>('/matches/recent');
    setRecentMatches(data.matches);
  }, 10 * 60_000);

  function filterBySport(matches: Match[]): Match[] {
    if (sportFilter === 'all') return matches;
    return matches.filter(m => m.sport === sportFilter);
  }

  const filteredLive = filterBySport(liveMatches);
  const filteredUpcoming = filterBySport(upcomingMatches);
  const filteredRecent = filterBySport(recentMatches);

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-card-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">
            Score<span className="text-accent">card</span>
          </h1>
          <div className="flex items-center gap-3">
            <SportTabs />
            <button
              onClick={() => navigate('/settings')}
              className="text-text-muted hover:text-text transition-colors"
              aria-label="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Stale data banner */}
      {stale && lastUpdated && (
        <div className="bg-card border-b border-card-border px-4 py-2 text-center">
          <p className="text-xs text-text-muted">
            Last updated {new Date(lastUpdated).toLocaleTimeString()} — data may be stale
          </p>
        </div>
      )}

      {/* Body */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-8">
        <LiveSection matches={filteredLive} />
        <UpcomingSection matches={filteredUpcoming} />
        <RecentSection matches={filteredRecent} />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/Dashboard.tsx
git commit -m "feat: add Dashboard page with polling and sport filter"
```

---

### Task 22: Settings page

**Files:**
- Create: `apps/web/src/pages/Settings.tsx`

- [ ] **Step 1: Create `apps/web/src/pages/Settings.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Team } from '@scorecard/types';
import api from '../lib/api';
import { useTeamStore } from '../store/teamStore';
import { useAuthStore } from '../store/authStore';

export function Settings(): JSX.Element {
  const navigate = useNavigate();
  const { followedTeams, setFollowedTeams, removeTeam, addTeam } = useTeamStore();
  const logout = useAuthStore((s) => s.logout);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.get<{ teams: Team[] }>('/teams/mine')
      .then(({ data }) => setFollowedTeams(data.teams))
      .catch(console.error);

    api.get<{ teams: Team[] }>('/teams')
      .then(({ data }) => setAllTeams(data.teams))
      .catch(console.error);
  }, [setFollowedTeams]);

  async function handleUnfollow(teamId: string): Promise<void> {
    await api.delete(`/teams/follow/${teamId}`);
    removeTeam(teamId);
  }

  async function handleFollow(team: Team): Promise<void> {
    await api.post('/teams/follow', { teamId: team.id });
    addTeam(team);
  }

  function handleLogout(): void {
    logout();
    navigate('/');
  }

  const isFollowing = (id: string): boolean => followedTeams.some(t => t.id === id);

  const searchResults = allTeams.filter(
    t => !isFollowing(t.id) && t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-card-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-text-muted hover:text-text">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-bold text-lg">Settings</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {/* Followed teams */}
        <section>
          <h2 className="text-sm font-semibold text-text-muted mb-3">Your Teams</h2>
          {followedTeams.length === 0 ? (
            <p className="text-text-muted text-sm">No teams followed yet.</p>
          ) : (
            <div className="space-y-2">
              {followedTeams.map((team) => (
                <div key={team.id} className="flex items-center justify-between bg-card border border-card-border rounded-card px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{team.name}</p>
                    <p className="text-xs text-text-muted capitalize">{team.sport}</p>
                  </div>
                  <button
                    onClick={() => void handleUnfollow(team.id)}
                    className="text-text-muted hover:text-live text-xs transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Add teams */}
        <section>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-accent text-sm font-medium"
          >
            + Add more teams
          </button>

          {showAdd && (
            <div className="mt-3 space-y-3">
              <input
                type="text"
                placeholder="Search teams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-card border border-card-border rounded-card px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              <div className="space-y-2">
                {searchResults.slice(0, 8).map((team) => (
                  <div
                    key={team.id}
                    onClick={() => void handleFollow(team)}
                    className="flex items-center justify-between bg-card border border-card-border rounded-card px-4 py-3 cursor-pointer hover:border-accent/40 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{team.name}</p>
                      <p className="text-xs text-text-muted capitalize">{team.sport}</p>
                    </div>
                    <span className="text-accent text-xs">+ Follow</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Logout */}
        <section>
          <button
            onClick={handleLogout}
            className="text-sm text-text-muted hover:text-live transition-colors"
          >
            Sign out
          </button>
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/Settings.tsx
git commit -m "feat: add Settings page with team management and logout"
```

---

## Phase 7: Integration and Polish

### Task 23: README and env examples

**Files:**
- Create: `README.md`
- Verify: `apps/api/.env.example` and `apps/web/.env.example` exist

- [ ] **Step 1: Create root `README.md`**

```markdown
# Scorecard

A live sports dashboard for football (soccer) and cricket fans. Follow your teams, see live scores, upcoming matches, and recent results — nothing else.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + Zustand
- **Backend:** Node.js + Express + TypeScript + Prisma
- **Database:** SQLite (dev) / PostgreSQL (prod)
- **Cache:** In-memory (dev) / Redis via Upstash (prod)
- **Auth:** Firebase Auth (prod) / dev bypass (dev)
- **Monorepo:** pnpm workspaces

## Running Locally

### Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)

### Setup

1. Clone and install:
   ```bash
   git clone <repo>
   cd scorecard
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```
   Leave all API keys blank to run in mock data + dev auth mode.

3. Run database setup:
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

4. Start both apps:
   ```bash
   pnpm dev
   ```
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

### Adding Real API Keys

To use live sports data, add keys to `apps/api/.env`:
- `FOOTBALL_API_KEY`: Get free key at https://www.football-data.org/
- `CRICKET_API_KEY`: Get free key at https://cricapi.com/

## Screenshots

_Coming soon_

## Known Limitations

- Scores update via polling (~30s delay), not real-time WebSockets
- Cricket data may lag during heavy match days (free tier: ~100 req/day)
- No player stats or lineups (free tier limitation)
- Limited to 6 football leagues + IPL/Internationals for cricket
- No light mode in MVP
```

- [ ] **Step 2: Final end-to-end smoke test**

Start the API:
```bash
cd apps/api && pnpm dev
```
In a new terminal, start the frontend:
```bash
cd apps/web && pnpm dev
```

Open `http://localhost:5173`:
- Should see the Landing page with "Continue as Dev User" button
- Click it → should redirect to TeamPicker
- Select 2+ teams → click Done → should navigate to Dashboard
- Dashboard should show mock matches in the correct sections
- SportTabs should filter matches
- Settings icon should open Settings page

- [ ] **Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: add README with setup instructions and known limitations"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Monorepo (pnpm workspaces) — Task 1
- [x] Shared types package `@scorecard/types` — Task 2
- [x] Express + TypeScript backend — Task 3
- [x] Prisma dual schema (SQLite dev / Postgres prod) — Task 4
- [x] Cache abstraction (in-memory dev / Redis prod) — Task 5
- [x] Auth middleware + dev bypass — Task 6
- [x] matchNormalizer service — Task 7
- [x] Mock data mode (no API keys) — Task 7
- [x] Football poller (node-cron, 60s live) — Task 8
- [x] Cricket poller (node-cron, 3min live) — Task 8
- [x] All 9 backend API routes — Tasks 9–11
- [x] DB seed script — Task 11
- [x] Vite + React + Tailwind frontend — Task 12
- [x] Design tokens (colors, font, animations) — Task 13
- [x] Zustand stores (auth, match, team) — Task 14
- [x] API client with auth header — Task 15
- [x] usePolling hook — Task 15
- [x] useAuth hook (Firebase + dev bypass) — Task 15
- [x] LiveIndicator, SportTabs, EmptyState — Task 16
- [x] FootballCard, CricketCard — Task 17
- [x] LiveSection, UpcomingSection, RecentSection — Task 18
- [x] Landing page — Task 19
- [x] React Router routing with guards — Task 19
- [x] TeamPicker page — Task 20
- [x] Dashboard with 3 polling intervals — Task 21
- [x] Sport filter — Task 21
- [x] Stale data banner — Task 21
- [x] Settings page — Task 22
- [x] .env.example files — Tasks 3, 12
- [x] README with setup instructions and known limitations — Task 23
- [x] Mobile-first Tailwind design — All UI tasks
- [x] Dark mode default — Task 13
- [x] Electric green accent, live red pulse — Tasks 13, 16
- [x] Instrument Sans font — Task 13
