# Scorecard — Claude Code Instructions

Build a full-stack live sports dashboard called **Scorecard**. Users log in, pick their football (soccer) and cricket teams, and see a clean, minimal dashboard showing only their teams' live scores, upcoming matches, and recent results. No ads, no clutter.

**Sports supported (MVP):** Football (Soccer) + Cricket only.

---

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **State:** Zustand
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Cache:** Redis (use Upstash or local Redis)
- **Auth:** Firebase Auth (email + Google OAuth)
- **Deployment:** Vercel (frontend) + Railway (backend, DB, Redis)

---

## Data Sources

### Football — football-data.org
- Free tier: 10 requests/minute
- API key via `X-Auth-Token` header
- Leagues: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League
- Endpoints:
  - `GET /v4/competitions/{id}/teams` — team list
  - `GET /v4/competitions/{id}/matches` — matches (filter by status: LIVE, SCHEDULED, FINISHED)
  - `GET /v4/matches/{id}` — single match detail

### Cricket — cricapi.com
- Free tier: ~100 requests/day
- API key as query param `?apikey=XXX`
- Coverage: International matches (Tests, ODIs, T20Is) + IPL
- Endpoints:
  - `GET /currentMatches` — live & recent matches
  - `GET /matches` — all matches
  - `GET /match_info?id=X` — match detail

---

## Unified Match Schema

Both sports normalize into ONE type. The frontend never sees raw API data.

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

## Database (Prisma)

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
  sport       String       // "football" | "cricket"
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

---

## Backend

### API Routes

| Method | Route                  | Auth | Description                          |
|--------|------------------------|------|--------------------------------------|
| POST   | `/auth/verify`         | No   | Firebase token → get/create user     |
| GET    | `/teams?sport=X`       | Yes  | List available teams                 |
| GET    | `/teams/mine`          | Yes  | User's followed teams                |
| POST   | `/teams/follow`        | Yes  | Follow a team `{ teamId }`           |
| DELETE | `/teams/follow/:teamId`| Yes  | Unfollow a team                      |
| GET    | `/matches`             | Yes  | All matches for user's teams         |
| GET    | `/matches/live`        | Yes  | Live matches only                    |
| GET    | `/matches/upcoming`    | Yes  | Next 7 days                          |
| GET    | `/matches/recent`      | Yes  | Last 7 days                          |

### Polling & Caching Rules

- **Backend polls APIs on a schedule using node-cron. User requests NEVER hit external APIs directly.**
- Football live matches: poll every 60 seconds, cache in Redis with 60s TTL
- Cricket live matches: poll every 3 minutes (rate limit is tight), cache with 180s TTL
- Upcoming matches: poll every 15 minutes
- Team lists: poll every 6 hours
- All match data normalizes through a single `matchNormalizer` service before caching
- Route handlers: check Redis first → return cached data. If cache miss, check DB.

### Auth Middleware

- Verify Firebase ID token from `Authorization: Bearer <token>` header
- Attach user to `req.user`
- All routes except `/auth/verify` and `/health` require auth

---

## Frontend

### Pages

1. **Landing** — clean login/signup page with Firebase Auth UI
2. **Team Picker** — onboarding after first login. Search and select teams from both sports. Minimum 1 team to proceed.
3. **Dashboard** — the main page. Three sections:
   - 🔴 **Live Now** — only visible when there are live matches
   - 📅 **Upcoming** — next 7 days
   - ✅ **Recent** — last 7 days
4. **Settings** — manage followed teams (add/remove)

### Dashboard Layout

- Top: header with logo + sport toggle tabs (Football | Cricket | All) + settings icon
- Body: vertically stacked sections (Live → Upcoming → Recent)
- Each match is a card. Football cards show `Team 2-1 Team · 67'`. Cricket cards show `Team 167/4 (18.2 ov) vs Team · summary`.
- Empty states for each section when no matches

### Frontend Polling

- Poll `/matches/live` every 30 seconds
- Poll `/matches/upcoming` every 5 minutes
- Poll `/matches/recent` every 10 minutes
- Use `setInterval` in a custom `usePolling` hook, clean up on unmount

---

## Design

- **Dark mode default.** Background: #0A0F1A. Cards: #141425. Text: #E8E8E8.
- **Accent color:** Electric green (#00F5A0) for highlights, live scores.
- **Live indicator:** Red (#FF3B3B) with a CSS pulse animation.
- **Typography:** Use a distinctive font from Google Fonts — avoid Inter/Roboto/Arial. Try "Instrument Sans", "Satoshi", or "General Sans".
- **Cards:** Rounded (12-16px), subtle border, slight hover elevation.
- **Animations:** Score changes slide/fade. Cards stagger in on load. Sport tab switch transitions smoothly.
- **Mobile-first.** Design for 375px, then scale up with `md:` and `lg:` breakpoints.
- **No clutter.** No sidebars, no mega-navs, no unnecessary UI chrome.

---

## Build Rules

1. Always use TypeScript. No `any` types.
2. Normalize ALL external API data through a `matchNormalizer` service. Frontend never sees raw API shapes.
3. Cache-first: every match route checks Redis → DB → never external API on user request.
4. Handle API failures gracefully — if football-data.org is down, show stale cached data with a "last updated X ago" note, not a crash.
5. Keep components under ~150 lines. Extract sub-components.
6. Mobile-first Tailwind — base styles are mobile, add `md:` / `lg:` for larger screens.
7. Seed the database with teams from both APIs on first run (create a seed script).
8. Include `.env.example` files for both frontend and backend.
9. Include a README with: what it is, tech stack, how to run locally, screenshots placeholder, and known limitations.

### Known Limitations to Document

- Scores update via polling (~30s), not real-time WebSockets
- Cricket data may lag during heavy match days due to free API limits
- No player stats or lineups (free tier limitation)
- Limited to 6 football leagues + IPL/Internationals for cricket
