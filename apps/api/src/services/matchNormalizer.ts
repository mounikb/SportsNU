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
    summary: mapCricketStatus(raw.status) === 'UPCOMING' ? undefined : raw.status,
    startTime: raw.dateTimeGMT ?? raw.date ?? new Date().toISOString(),
  };
}
