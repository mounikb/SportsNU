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
