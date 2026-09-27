import { env } from '../src/config/env';
import { connectDb, disconnectDb } from '../src/db/connect';
import { seedDatabase } from '../src/seed/seedData';

async function main() {
  await connectDb(env.MONGODB_URI);
  const { users, competitions } = await seedDatabase();
  console.log(`Seeded ${users.length} users and ${competitions.length} competitions.`);
  for (const c of competitions) console.log(`  - ${c.slug}  (${c._id})`);
  await disconnectDb();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDb();
  process.exit(1);
});
