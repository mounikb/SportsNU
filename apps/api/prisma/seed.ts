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
