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

// Global error handler — catches async errors forwarded by next(err)
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

startFootballPoller();
startCricketPoller();

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

export default app;
