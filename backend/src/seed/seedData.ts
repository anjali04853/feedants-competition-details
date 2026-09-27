import { Types } from 'mongoose';
import { CompetitionModel } from '../models/Competition';
import { RegistrationModel } from '../models/Registration';
import { SubmissionModel } from '../models/Submission';
import { TestimonialModel } from '../models/Testimonial';
import { UserModel } from '../models/User';
import { toMinor } from '../utils/money';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const portrait = (gender: 'men' | 'women', n: number) => `https://randomuser.me/api/portraits/${gender}/${n}.jpg`;
const SAMPLE_VIDEO = 'https://www.w3schools.com/html/mov_bbb.mp4';

const USERS = [
  { name: 'Priya Nair', avatar: portrait('women', 68), code: 'REFERRAL123' },
  { name: 'Rohan Gupta', avatar: portrait('men', 32), code: 'ROHAN10' },
  { name: 'Kavya Iyer', avatar: portrait('women', 12), code: 'KAVYA10' },
  { name: 'Arjun Singh', avatar: portrait('men', 45), code: 'ARJUN10' },
  { name: 'Meera Joshi', avatar: portrait('women', 26), code: 'MEERA10' },
  { name: 'Vikram Rao', avatar: portrait('men', 76), code: 'VIKRAM10' },
];

const classicalDanceRewards = [550, 300, 240, 200, 130, 80].map((rupees, i) => ({
  position: i + 1,
  amount: toMinor(rupees),
}));

const baseContent = {
  tags: [
    { en: 'Dance', hi: 'नृत्य' },
    { en: 'Multi-Win', hi: 'मल्टी-विन' },
  ],
  judge: {
    name: 'Manju Dubey',
    title: { en: 'Professional Kathak Dancer', hi: 'पेशेवर कथक नृत्यांगना' },
    experienceYears: 12,
    avatarUrl: portrait('women', 44),
    introVideoUrl: SAMPLE_VIDEO,
  },
  about: {
    en: 'This is an online classical dance competition open for all age groups.\nParticipate from anywhere and showcase your talent.\nExpress your passion through traditional dance.\nPerform any Indian classical form (Kathak, Bharatanatyam, Odissi, Kuchipudi, Manipuri, Mohiniyattam or Sattriya) in a single uninterrupted video of up to 3 minutes. Entries are reviewed by our expert judge and the top six performers share the prize pool.',
    hi: 'यह सभी आयु वर्गों के लिए एक ऑनलाइन शास्त्रीय नृत्य प्रतियोगिता है।\nकहीं से भी भाग लें और अपनी प्रतिभा दिखाएँ।\nपारंपरिक नृत्य के माध्यम से अपने जुनून को व्यक्त करें।\nकिसी भी भारतीय शास्त्रीय शैली (कथक, भरतनाट्यम, ओडिसी, कुचिपुड़ी, मणिपुरी, मोहिनीअट्टम या सत्त्रिया) में अधिकतम 3 मिनट का एक वीडियो प्रस्तुत करें। शीर्ष छह प्रतिभागी पुरस्कार राशि साझा करेंगे।',
  },
  judgingParameters: [
    { title: { en: 'Technique & footwork', hi: 'तकनीक और पदचालन' }, weight: 30 },
    { title: { en: 'Expression (Abhinaya)', hi: 'अभिव्यक्ति (अभिनय)' }, weight: 25 },
    { title: { en: 'Rhythm & timing (Laya)', hi: 'लय और ताल' }, weight: 20 },
    { title: { en: 'Costume & presentation', hi: 'वेशभूषा और प्रस्तुति' }, weight: 15 },
    { title: { en: 'Overall impact', hi: 'समग्र प्रभाव' }, weight: 10 },
  ],
  rules: [
    { en: 'Open to participants of all ages. Participants under 18 need a guardian’s consent.', hi: 'सभी आयु के प्रतिभागियों के लिए खुला। 18 वर्ष से कम आयु वालों को अभिभावक की सहमति चाहिए।' },
    { en: 'One entry per participant. You may replace your video any time before the submission deadline.', hi: 'प्रति प्रतिभागी एक प्रविष्टि। आप समय सीमा से पहले कभी भी अपना वीडियो बदल सकते हैं।' },
    { en: 'Video must be a single continuous take, max 3 minutes, without heavy edits or filters.', hi: 'वीडियो एक ही निरंतर टेक में, अधिकतम 3 मिनट का, बिना भारी संपादन या फ़िल्टर के होना चाहिए।' },
    { en: 'Only entries from paid participants are considered for judging.', hi: 'केवल भुगतान किए गए प्रतिभागियों की प्रविष्टियों पर ही विचार किया जाएगा।' },
    { en: 'The judge’s decision is final. Plagiarised or AI-generated performances are disqualified.', hi: 'निर्णायक का निर्णय अंतिम होगा। नकल या एआई-जनित प्रस्तुतियाँ अयोग्य होंगी।' },
  ],
  disclaimer: {
    en: 'Only contributions from paid participants will be considered for judging.',
    hi: 'केवल भुगतान किए गए प्रतिभागियों के योगदान पर ही निर्णय के लिए विचार किया जाएगा।',
  },
  prizeInfoVideoUrl: SAMPLE_VIDEO,
  referralRewardPerSignup: toMinor(10),
  certificateForWinners: true,
  currency: 'INR',
};

const previousWinners = [
  { name: 'Riya Shah', position: 1, thumbnailUrl: portrait('women', 90), videoUrl: SAMPLE_VIDEO, edition: 'Season 3' },
  { name: 'Aarav Mehta', position: 1, thumbnailUrl: portrait('men', 22), videoUrl: SAMPLE_VIDEO, edition: 'Season 2' },
  { name: 'Neha Verma', position: 2, thumbnailUrl: portrait('women', 57), videoUrl: SAMPLE_VIDEO, edition: 'Season 3' },
  { name: 'Ishita Chopra', position: 3, thumbnailUrl: portrait('women', 33), videoUrl: SAMPLE_VIDEO, edition: 'Season 3' },
  { name: 'Dev Malhotra', position: 4, thumbnailUrl: portrait('men', 61), videoUrl: SAMPLE_VIDEO, edition: 'Season 2' },
];

function schedule(now: number, o: { regOpens: number; regCloses: number; subStarts: number; subEnds: number; result: number }) {
  return {
    registrationOpensAt: new Date(now + o.regOpens),
    registrationClosesAt: new Date(now + o.regCloses),
    submissionStartsAt: new Date(now + o.subStarts),
    submissionEndsAt: new Date(now + o.subEnds),
    resultAt: new Date(now + o.result),
  };
}

/**
 * Wipes and re-creates demo data. Dates are relative to `now` so the demo is
 * always "live", with one competition per interesting lifecycle state.
 * bookedCount is derived from the registrations actually inserted, so the
 * seat invariant holds from the start.
 */
export async function seedDatabase(now = new Date()) {
  const t = now.getTime();
  await Promise.all([
    UserModel.deleteMany({}),
    CompetitionModel.deleteMany({}),
    RegistrationModel.deleteMany({}),
    SubmissionModel.deleteMany({}),
    TestimonialModel.deleteMany({}),
  ]);
  await Promise.all([
    UserModel.syncIndexes(),
    CompetitionModel.syncIndexes(),
    RegistrationModel.syncIndexes(),
    SubmissionModel.syncIndexes(),
    TestimonialModel.syncIndexes(),
  ]);

  const users = await UserModel.insertMany(
    USERS.map((u) => ({ name: u.name, avatarUrl: u.avatar, referralCode: u.code })),
  );
  const [priya, rohan, kavya, arjun, meera, vikram] = users;

  const competitions = await CompetitionModel.insertMany([
    {
      ...baseContent,
      slug: 'feedants-classical-dance',
      title: { en: 'Feedants Classical Dance', hi: 'फीडएंट्स शास्त्रीय नृत्य' },
      prizePool: toMinor(1500),
      entryFee: toMinor(99),
      capacity: 20,
      rewards: classicalDanceRewards,
      previousWinners,
      schedule: schedule(t, {
        regOpens: -5 * DAY,
        regCloses: 1 * DAY + 6 * HOUR + 28 * MIN + 32 * 1000,
        subStarts: -4 * DAY,
        subEnds: 21 * DAY,
        result: 23 * DAY,
      }),
      status: 'published',
    },
    {
      ...baseContent,
      slug: 'feedants-bollywood-beats',
      title: { en: 'Feedants Bollywood Beats', hi: 'फीडएंट्स बॉलीवुड बीट्स' },
      tags: [{ en: 'Dance', hi: 'नृत्य' }, { en: 'Solo', hi: 'एकल' }],
      prizePool: toMinor(1000),
      entryFee: toMinor(49),
      capacity: 5,
      rewards: [600, 400].map((r, i) => ({ position: i + 1, amount: toMinor(r) })),
      previousWinners: previousWinners.slice(0, 3),
      schedule: schedule(t, { regOpens: -2 * DAY, regCloses: 4 * DAY, subStarts: -1 * DAY, subEnds: 10 * DAY, result: 12 * DAY }),
      status: 'published',
    },
    {
      ...baseContent,
      slug: 'feedants-singing-star',
      title: { en: 'Feedants Singing Star', hi: 'फीडएंट्स सिंगिंग स्टार' },
      tags: [{ en: 'Music', hi: 'संगीत' }, { en: 'Multi-Win', hi: 'मल्टी-विन' }],
      judge: { ...baseContent.judge, name: 'Rahul Sen', title: { en: 'Hindustani Vocalist', hi: 'हिंदुस्तानी गायक' }, avatarUrl: portrait('men', 52) },
      prizePool: toMinor(2000),
      entryFee: toMinor(149),
      capacity: 50,
      rewards: [1000, 600, 400].map((r, i) => ({ position: i + 1, amount: toMinor(r) })),
      previousWinners: [],
      schedule: schedule(t, { regOpens: 2 * DAY + 3 * HOUR, regCloses: 9 * DAY, subStarts: 3 * DAY, subEnds: 16 * DAY, result: 18 * DAY }),
      status: 'published',
    },
    {
      ...baseContent,
      slug: 'feedants-sketch-sprint',
      title: { en: 'Feedants Sketch Sprint', hi: 'फीडएंट्स स्केच स्प्रिंट' },
      tags: [{ en: 'Art', hi: 'कला' }, { en: 'Free Entry', hi: 'निःशुल्क' }],
      judge: { ...baseContent.judge, name: 'Anita Kapoor', title: { en: 'Illustrator & Art Educator', hi: 'चित्रकार और कला शिक्षिका' }, avatarUrl: portrait('women', 79) },
      prizePool: toMinor(500),
      entryFee: 0,
      capacity: 100,
      rewards: [300, 200].map((r, i) => ({ position: i + 1, amount: toMinor(r) })),
      previousWinners: [],
      schedule: schedule(t, { regOpens: -1 * DAY, regCloses: 5 * DAY, subStarts: 3 * DAY, subEnds: 8 * DAY, result: 10 * DAY }),
      status: 'published',
    },
    {
      ...baseContent,
      slug: 'feedants-poetry-slam',
      title: { en: 'Feedants Poetry Slam', hi: 'फीडएंट्स काव्य स्लैम' },
      tags: [{ en: 'Poetry', hi: 'कविता' }, { en: 'Multi-Win', hi: 'मल्टी-विन' }],
      judge: { ...baseContent.judge, name: 'Sameer Qureshi', title: { en: 'Poet & Lyricist', hi: 'कवि और गीतकार' }, avatarUrl: portrait('men', 67) },
      prizePool: toMinor(1000),
      entryFee: toMinor(99),
      capacity: 30,
      rewards: [500, 300, 200].map((r, i) => ({ position: i + 1, amount: toMinor(r) })),
      previousWinners: [],
      results: [
        { position: 1, user: kavya._id, name: kavya.name, amount: toMinor(500) },
        { position: 2, user: priya._id, name: priya.name, amount: toMinor(300) },
        { position: 3, user: arjun._id, name: arjun.name, amount: toMinor(200) },
      ],
      schedule: schedule(t, { regOpens: -30 * DAY, regCloses: -20 * DAY, subStarts: -25 * DAY, subEnds: -10 * DAY, result: -2 * DAY }),
      status: 'published',
    },
    {
      ...baseContent,
      slug: 'feedants-standup-night',
      title: { en: 'Feedants Stand-up Night', hi: 'फीडएंट्स स्टैंड-अप नाइट' },
      tags: [{ en: 'Comedy', hi: 'कॉमेडी' }],
      prizePool: toMinor(800),
      entryFee: toMinor(79),
      capacity: 25,
      rewards: [800].map((r, i) => ({ position: i + 1, amount: toMinor(r) })),
      previousWinners: [],
      schedule: schedule(t, { regOpens: -3 * DAY, regCloses: 3 * DAY, subStarts: -1 * DAY, subEnds: 9 * DAY, result: 11 * DAY }),
      status: 'cancelled',
    },
  ]);
  const [classical, bollywood, , , poetry] = competitions;

  const confirmed = (competition: typeof classical, user: typeof priya, daysAgo: number) => ({
    competition: competition._id,
    user: user._id,
    status: 'confirmed' as const,
    amount: competition.entryFee,
    currency: 'INR',
    confirmedAt: new Date(t - daysAgo * DAY),
    payment: { provider: 'mock', orderId: `order_seed_${new Types.ObjectId()}`, paymentId: `pay_seed_${new Types.ObjectId()}`, paidAt: new Date(t - daysAgo * DAY) },
  });

  const registrations = await RegistrationModel.insertMany([
    // Classical Dance: Priya (the default demo user) is registered, as in the design: 1 / 20 booked.
    confirmed(classical, priya, 2),
    // Bollywood Beats: sold out (5 / 5) without Priya.
    ...[rohan, kavya, arjun, meera, vikram].map((u, i) => confirmed(bollywood, u, i + 1)),
    // Poetry Slam (completed): Priya participated and placed 2nd.
    ...[priya, kavya, arjun, rohan].map((u, i) => confirmed(poetry, u, 25 - i)),
  ]);

  // bookedCount derived from the data, never hand-typed.
  for (const c of competitions) {
    const booked = registrations.filter((r) => r.competition.equals(c._id)).length;
    await CompetitionModel.updateOne({ _id: c._id }, { $set: { bookedCount: booked } });
  }

  await TestimonialModel.insertMany([
    { userName: 'Sneha Kulkarni', avatarUrl: portrait('women', 21), rating: 5, quote: { en: 'Won 2nd place in my very first competition! The judge feedback helped me improve a lot.', hi: 'अपनी पहली ही प्रतियोगिता में दूसरा स्थान जीता! निर्णायक की प्रतिक्रिया से मुझे बहुत सुधार करने में मदद मिली।' } },
    { userName: 'Aditya Rao', avatarUrl: portrait('men', 14), rating: 5, quote: { en: 'Prize money reached my bank account within 3 days of results. Super smooth.', hi: 'परिणाम के 3 दिनों के भीतर पुरस्कार राशि मेरे बैंक खाते में आ गई।' } },
    { userName: 'Fatima Sheikh', avatarUrl: portrait('women', 36), rating: 4, quote: { en: 'I love that I can participate from my hometown. Great platform for classical artists.', hi: 'मुझे अच्छा लगता है कि मैं अपने गृहनगर से भाग ले सकती हूँ।' } },
    { userName: 'Karan Desai', avatarUrl: portrait('men', 41), rating: 5, quote: { en: 'Transparent judging parameters and a fair process. Will participate again!', hi: 'पारदर्शी मूल्यांकन मानदंड और निष्पक्ष प्रक्रिया। फिर से भाग लूँगा!' } },
  ]);

  return { users, competitions };
}
