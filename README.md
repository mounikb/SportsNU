
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
>>>>>>> 19eb91a (docs: add README with setup instructions and known limitations)
