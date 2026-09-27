/**
 * Operational safety net: recomputes bookedCount from registrations and
 * reports (and with --fix, repairs) any drift. Drift is only possible if a
 * process crashed between reserving a seat and writing the registration.
 * Run it during a quiet period (e.g. nightly cron).
 */
import { env } from '../src/config/env';
import { connectDb, disconnectDb } from '../src/db/connect';
import { CompetitionModel } from '../src/models/Competition';
import { RegistrationModel, SEAT_HOLDING_STATUSES } from '../src/models/Registration';

async function main() {
  const fix = process.argv.includes('--fix');
  await connectDb(env.MONGODB_URI);

  const counts = await RegistrationModel.aggregate<{ _id: unknown; n: number }>([
    { $match: { status: { $in: SEAT_HOLDING_STATUSES } } },
    { $group: { _id: '$competition', n: { $sum: 1 } } },
  ]);
  const actual = new Map(counts.map((c) => [String(c._id), c.n]));

  let drift = 0;
  for await (const c of CompetitionModel.find({}, { slug: 1, bookedCount: 1 }).lean().cursor()) {
    const expected = actual.get(String(c._id)) ?? 0;
    if (expected !== c.bookedCount) {
      drift++;
      console.log(`${c.slug}: bookedCount=${c.bookedCount}, registrations=${expected}`);
      if (fix) await CompetitionModel.updateOne({ _id: c._id, bookedCount: c.bookedCount }, { $set: { bookedCount: expected } });
    }
  }
  console.log(drift ? `${drift} competition(s) drifted${fix ? ' (fixed)' : ''}` : 'All seat counts consistent');
  await disconnectDb();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDb();
  process.exit(1);
});
