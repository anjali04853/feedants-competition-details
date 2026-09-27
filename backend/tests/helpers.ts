import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app';
import { signToken } from '../src/middleware/auth';
import { CompetitionModel } from '../src/models/Competition';
import { UserModel } from '../src/models/User';
import { seedDatabase } from '../src/seed/seedData';
import { clock } from '../src/utils/clock';

let mongo: MongoMemoryServer | undefined;

export async function startDb() {
  // Use an external MongoDB when provided (CI service container), otherwise an in-memory one.
  const external = process.env.MONGODB_TEST_URI;
  if (!external) mongo = await MongoMemoryServer.create();
  await mongoose.connect(external ?? mongo!.getUri('feedants-test'));
}

export async function stopDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongo?.stop();
}

export const app = createApp();
export const api = () => request(app);

export async function seed(now = new Date()) {
  clock.set(null);
  return seedDatabase(now);
}

/** Creates `n` extra users and returns their auth tokens. */
export async function createUsers(n: number, prefix = 'load') {
  const users = await UserModel.insertMany(
    Array.from({ length: n }, (_, i) => ({ name: `${prefix} user ${i}`, referralCode: `${prefix}${i}`.toUpperCase() })),
  );
  return users.map((u) => ({ id: String(u._id), token: signToken(String(u._id)) }));
}

export const tokenFor = (userId: unknown) => signToken(String(userId));

export async function competitionBySlug(slug: string) {
  return (await CompetitionModel.findOne({ slug }).lean())!;
}

/** Pins the application clock to `date` (the DB and driver keep real time). */
export const travelTo = (date: Date) => clock.set(() => date);
export const resetClock = () => clock.set(null);
