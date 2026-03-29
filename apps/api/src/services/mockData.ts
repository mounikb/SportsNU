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
