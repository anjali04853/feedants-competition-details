# Feedants: Competition Details (Full-Stack Module)

A working, full-stack **Competition Details** screen built from the Feedants design:

- **Mobile:** React Native (Expo SDK 57, Expo Router, TypeScript, TanStack Query)
- **Backend:** Node.js + Express 5 (TypeScript, Zod validation, JWT auth)
- **Database:** MongoDB (Mongoose 9)

The data on the screen comes from the API: competition info, seats, dates, the countdown, rewards, previous winners, the tabs, the referral link, testimonials and the call to action. The server decides the state of every action, and seat booking stays correct under heavy concurrency.

```
.
├── backend/            Express API, MongoDB models, business rules, tests, seed data
├── mobile/             Expo React Native app
├── docker-compose.yml  MongoDB + API for local use
└── README.md
```

---

## 1. Running it

### Prerequisites
- Node.js 20+
- MongoDB 6+ running locally (or `docker compose up -d mongo`, or a MongoDB Atlas URI)
- For the app: the **Expo Go** app on a phone, an Android emulator / iOS simulator, or a browser

### Backend

```bash
cd backend
npm install
cp .env.example .env        # defaults work for local MongoDB
npm run seed                # demo users + 6 competitions in different lifecycle states
npm run dev                 # http://localhost:4000  (health: /health)
```

Other scripts: `npm test` (32 unit + integration tests, uses in-memory MongoDB), `npm run build && npm start`, `npm run reconcile-seats` (verifies seat counters, `--fix` repairs).

**With Docker instead:** `docker compose up -d --build`, then `docker compose exec api node dist/scripts/seed.js`.

### Mobile app

```bash
cd mobile
npm install
npx expo start              # press a (Android), i (iOS), w (web), or scan the QR code with Expo Go
```

The app finds the API automatically. It uses the IP of the machine running Metro on port 4000, which works for Expo Go on a phone on the same Wi-Fi. Override it with an env var if needed:

```bash
# mobile/.env
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000     # Android emulator: http://10.0.2.2:4000
```

On launch the app signs in as the seeded user **Priya Nair** and opens **Feedants Classical Dance**, the screen from the design. Priya is registered and 1/20 seats are booked, as in the mockup.

### Environment variables (backend)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | HTTP port |
| `NODE_ENV` | `development` | `development` / `test` / `production` |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/feedants` | Database connection |
| `JWT_SECRET` | – (**required**, ≥16 chars) | Signs auth tokens |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `ENABLE_DEV_LOGIN` | `false` | Enables `/auth/dev-login` to switch between seeded users. The server refuses to start with it on in production. |
| `SEAT_HOLD_MINUTES` | `10` | How long a seat is reserved while the user pays |
| `HOLD_SWEEP_INTERVAL_SECONDS` | `30` | How often expired holds are released |
| `PAYMENT_PROVIDER` | `mock` | Payment gateway implementation |
| `PAYMENT_WEBHOOK_SECRET` | – (**required**) | HMAC secret used to verify payment signatures |
| `UPLOAD_DIR` / `MAX_UPLOAD_MB` | `uploads` / `100` | Submission storage and size limit |
| `PUBLIC_BASE_URL` | request host | Absolute URL prefix for uploaded files |
| `REFERRAL_BASE_URL` | `https://feedants.com/r` | Prefix for referral links |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |

The config is validated with Zod at startup, and the server fails fast on bad config.

### Mobile environment variables

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Optional. API base URL; auto-detected when unset. |

---

## 2. What works on the screen

| Design element | Behaviour |
|---|---|
| **Registered** badge | Comes from the viewer's registration: *Registered*, *Payment pending*, or hidden |
| Prize pool / entry fee | From the DB, stored in paise. A fee of 0 shows *Free* and skips payment. |
| **Only 19 spots left · 1/20 Booked** | Live seat counter. Refreshes every 15s and after every action; switches to *Sold out*, or *Registration Closed* once registration has closed |
| Judge + **Intro Video** | From the DB; opens the video |
| **Registration closes in 01d:06h:28m:32s · Hurry up!** | Server-driven countdown. It targets whichever deadline comes next (registration opens/closes, submission starts/ends, results) and uses server-corrected time. *Hurry up!* shows when under 72h or ≤25% of seats remain |
| Important dates | From the schedule, in the device's time zone. Past milestones are dimmed. |
| Previous winners | Horizontal list; tapping one plays their video |
| About / Judging Parameters / Rules tabs | Localized content from the DB, with *View more* / *View less* |
| Rewards | Per-position amounts; the server checks they add up to the prize pool |
| Disclaimer, refund policy, Razorpay row | From the DB; refund policy opens the policy text |
| **Refer & Earn** | Per-user referral link, *Copy Link* (clipboard), *Refer Now* (native share sheet), reward per signup. Registration accepts a referral code; unknown codes and your own code are rejected. |
| Hear From Our Users | Opens a testimonials screen served by the API |
| **ENG / हिंदी** toggle | UI strings are translated in the client. Content is translated in the DB and returned already localized (`?lang=hi`). The choice is saved on the device. |
| **Upload Submission** button | A state machine driven by the server (see below), with upload progress |
| Bottom tabs | Home and Competitions list real data; Profile switches demo users; Explore and Create are placeholders |

### The call-to-action state machine

The server returns `cta = { action, enabled, reason, at }`. The app only renders it and never decides on its own whether an action is allowed.

| Situation | Button |
|---|---|
| Registration not open yet | *Registration Opens Soon · Opens 1 Oct, 9:00 AM* (disabled) |
| Open, seats left | **Register Now · ₹ 99** → seat held → payment sheet |
| Open, full | *Sold Out* (disabled) |
| Seat held, payment not done | **Complete Payment · ₹ 99 · Seat reserved for 09:41** |
| Registration closed, not registered | *Registration Closed* (disabled) |
| Registered, submissions not open yet | *Upload Submission · Opens 6 Aug, 04:00 AM* (disabled) |
| Registered, submissions open | **Upload Submission · Registered** |
| Already submitted, before deadline | **Replace Submission · Submitted 27 Sep, 11:39 PM** |
| Deadline passed with / without an entry | *Submission Received · Results on …* / *Submission Window Closed* |
| Results published | **View Results** |
| Cancelled competition | *Competition Cancelled* (disabled) |

The seed data has one competition in each state: open (Classical Dance), sold out (Bollywood Beats), upcoming (Singing Star), free entry with submissions not open yet (Sketch Sprint), completed with results (Poetry Slam), and cancelled (Stand-up Night). Switch users in **Profile** to see each state from different viewers.

---

## 3. Architecture

### Backend layout

```
backend/src
├── config/env.ts            Zod-validated configuration
├── domain/lifecycle.ts      Pure rules: phase, countdown, CTA, next transition (no I/O)
├── models/                  Mongoose schemas + indexes + invariants
├── services/                Business logic (registration, competition, submission, payment, storage)
├── routes/                  Thin HTTP layer: parse → call service → respond
├── middleware/              auth, errors, language, rate limiting
├── jobs/holdSweeper.ts      Releases expired seat holds
└── seed/seedData.ts         Demo data relative to "now"
```

The time-dependent rules live in `domain/lifecycle.ts` as pure functions of `(competition, viewer, now)`. The routes never contain business logic, and a clock abstraction lets tests move to any point in a competition's life.

### API (`/api/v1`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/competitions` | – | List (summaries) |
| GET | `/competitions/:idOrSlug` | – | **Public details**, the same for every user. `Cache-Control: public, max-age=5, stale-while-revalidate=30` |
| GET | `/competitions/:idOrSlug/me` | ✔ | **Viewer state**: registration, submission, `cta`, referral link, `nextTransitionAt` |
| POST | `/competitions/:idOrSlug/registrations` | ✔ | Reserve a seat (201), or return the in-flight hold (200). Free competitions are confirmed immediately. |
| POST | `/registrations/:id/payment/confirm` | ✔ | Verify the payment signature → confirmed (idempotent) |
| POST | `/registrations/:id/cancel` | ✔ | Abandon checkout → seat released immediately |
| POST | `/competitions/:idOrSlug/submission` | ✔ | Multipart video upload (create or replace) |
| GET | `/testimonials` | – | Published testimonials |
| GET | `/users/me` | ✔ | Current user |
| GET/POST | `/auth/dev-users`, `/auth/dev-login` | – | Demo login (dev only) |
| POST | `/dev/payments/checkout` | ✔ | Mock gateway checkout (dev only) |

Every response carries `meta.serverTime`. Every error uses one shape, `{ error: { code, message, details? } }`, with stable machine-readable codes (`SOLD_OUT`, `REGISTRATION_CLOSED`, `HOLD_EXPIRED`, `INVALID_PAYMENT`, `NOT_REGISTERED`, `SUBMISSION_CLOSED`, …).

**Why public details and viewer state are separate:** when thousands of users open the same competition, the heavy, identical payload is cacheable by a CDN or reverse proxy. Only the small per-user `/me` call reaches the database for each user.

### Data model

- **`competitions`**: content, localized as `{en, hi}`; `schedule{registrationOpensAt, registrationClosesAt, submissionStartsAt, submissionEndsAt, resultAt}`; `capacity`, `bookedCount`; embedded `judge`, `rewards[]`, `previousWinners[]`, `judgingParameters[]`, `rules[]`, `results[]`; `status: draft|published|cancelled`. These sub-documents are small, bounded and always read with the competition, so they're embedded to keep it at one read. A pre-validate hook enforces the invariants: dates in order, rewards summing to the prize pool, unique reward positions, `bookedCount ≤ capacity`.
- **`registrations`**: `{competition, user, status: pending_payment|confirmed|expired|cancelled, amount (fee snapshot), holdExpiresAt, payment{orderId, paymentId, paidAt, refundStatus}, referredBy}`.
  - Unique index on `(competition, user)` prevents duplicates.
  - Partial index on `holdExpiresAt` (pending rows only) keeps sweeping cheap.
  - Unique sparse index on `payment.orderId`.
  - Registrations get their own collection because they grow without bound.
- **`submissions`**: `{competition, user, registration, file{storageKey, mimeType, size}, revision, submittedAt}`, unique on `(competition, user)`. Only the storage key is stored, so moving to S3 needs no migration.
- **`users`**: name, avatar, unique `referralCode`.
- **`testimonials`**: localized quote, rating, `isPublished`.

Money is stored as integer paise, never as floats.

### Concurrency and consistency (the core of the task)

The invariant is: `competition.bookedCount == number of registrations in {pending_payment, confirmed}`.

1. **Seat reservation is one atomic, conditional update:**
   `updateOne({_id, status:'published', registration window open, $expr: bookedCount < capacity}, {$inc: {bookedCount: 1}})`.
   MongoDB applies single-document updates atomically, so the counter can't pass capacity no matter how many requests arrive at once. There's no read-then-write race.
2. **Duplicates:** the unique `(competition, user)` index. When the same user taps twice or uses two devices, the request that loses the race hands its seat back and returns the winner's registration, so the endpoint is idempotent.
3. **Seat holds:** a paid registration first becomes `pending_payment` with a 10-minute hold. That way a user can't lose a seat halfway through paying, and an abandoned checkout can't lock a seat forever.
4. **Releasing a seat** happens only on the transition *out of* `pending_payment` (to expired or cancelled). That transition is itself a conditional `findOneAndUpdate` on the current status, so exactly one caller wins and the seat is released exactly once, even with several sweepers running at the same time on several API instances. Lapsed holds are also released lazily when the user retries.
5. **Late payments:** if a payment arrives after the hold was released, the server tries to grab any free seat. If there's none, it records the payment with `refundStatus: pending` and returns `HOLD_EXPIRED`, so the money is never taken without a seat.
6. **Payment verification:** HMAC-SHA256 over `orderId|paymentId` (Razorpay's scheme), compared in constant time. Replaying a confirmation is idempotent.
7. **No transactions are needed**, so this works on a standalone `mongod` as well as on replica sets / Atlas.
8. **Safety net:** `npm run reconcile-seats` recomputes the counters. Drift is only possible if a process crashes between reserving a seat and writing the registration.

The tests prove it: 60 users racing for 19 seats yields exactly 19 winners and 41 `SOLD_OUT`; 15 parallel taps by one user produce one registration; three concurrent sweepers release each hold exactly once; and the invariant is checked after every scenario.

### Time handling
- **Server-authoritative:** all rules run on server time. The client only displays.
- **Clock skew:** the client estimates `serverTime − deviceTime` from each response (adjusted for round-trip time), so countdowns stay correct on devices with wrong clocks.
- **Exact transitions without heavy polling:** both endpoints return `nextTransitionAt`, the next instant anything changes (registration closes, submissions open, a hold expires). The app schedules one refetch for exactly that moment, plus a light 15s refresh for seat counts and a refresh when the app returns to the foreground.
- **Re-render scope:** the 1-second tick lives only inside the countdown and hold-timer components, so the rest of the screen doesn't re-render every second.

### Mobile structure

```
mobile/src
├── app/                     Expo Router routes (tabs, competitions stack, testimonials modal)
├── api/                     client (timeouts, error normalization, clock sync), typed endpoints, React Query hooks
├── auth/                    Session provider (demo login, token persistence, 401 recovery)
├── i18n/                    EN/HI strings + provider
├── components/competition/  One component per design section (SummaryCard, JudgeCard, CountdownBanner,
│                            ImportantDates, PreviousWinners, InfoTabs, RewardsList, ReferCard, ActionBar,
│                            PaymentSheet, ResultsModal, ...)
├── components/ui/           Reusable primitives (Txt, Card, Chip, ProgressBar, SegmentedToggle, Skeleton, Toast, ErrorView)
├── hooks/useCountdown.ts
├── theme/                   Design tokens sampled from the mockup
└── utils/                   Formatting (Indian digit grouping, dates), media
```

Frontend states covered:
- loading skeleton shaped like the final layout
- error with retry, and not found
- pull to refresh
- stale data kept visible while refetching or switching language
- button busy states, upload progress, success and error toasts, and a hold-expiry timer that closes the checkout automatically
- accessibility roles and labels on the interactive elements

---

## 4. Assumptions

- **Authentication** is out of scope. A dev-only login issues real JWTs for seeded users, and the whole API trusts only the verified token. Production would swap in phone OTP.
- **Payments** use a mock gateway that follows Razorpay's order → checkout → signature flow, so replacing it with the Razorpay SDK means implementing one interface (`PaymentGateway`).
- "Booked" counts active holds as well as paid seats. A held seat really is unavailable to others.
- A registration made during an active hold is honoured even if the registration window closes during checkout.
- Submissions are **video only**, one entry per participant, replaceable until the deadline. Only **paid (confirmed)** participants can submit, which enforces the design's disclaimer on the server.
- The design shows submissions opening *before* registration closes (6 Aug vs 10 Aug), so the two windows may overlap.
- Dates are stored in UTC and shown in the device's time zone.
- Videos (intro, winners, prize info) open in the in-app browser. The seed uses stock portraits and a sample video in place of real media.
- The referral reward and "discount" are displayed, and the referrer is recorded on the registration. Paying out rewards is left for later.

## 5. Major technical decisions and trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| Atomic counter + unique index instead of transactions | Correct under concurrency, one round trip, works on any MongoDB deployment | A crash between two writes can drift the counter (covered by the reconcile script) |
| Seat holds with expiry | Fair to paying users, and seats can't be locked forever | Adds a sweeper and more states |
| Server-computed `cta` / phase | One source of truth; client and server can't disagree about rules | Slightly larger payload; the UI needs a refetch at transitions (handled by `nextTransitionAt`) |
| Public / viewer endpoint split | Public part is cacheable for traffic spikes | Two requests per screen (made in parallel) |
| Polling (15s) + scheduled refetch instead of WebSockets | Simple, stateless, scales horizontally, cache-friendly | Seat counts can lag by up to ~15s (the server still enforces capacity) |
| Embedded judge / rewards / winners | One read, and the data is bounded | Updating a judge across competitions means several writes |
| Local-disk uploads through the API | Zero setup for the assignment | Doesn't scale; production should use pre-signed S3 uploads |
| Localized content stored as `{en, hi}` | Simple, and the API returns only the requested language | Adding a language touches documents (fine for 2–3 languages) |
| In-memory rate limiter | No extra infrastructure | Per instance; use Redis with multiple instances |

## 6. What I'd do next for production

- Real auth (OTP), refresh tokens, and roles for an admin/organizer API to create and manage competitions.
- Razorpay integration with **server-side webhooks** as the source of truth for payments (the client-reported confirmation becomes an optimisation), plus automated refunds for `refundStatus: pending`.
- Pre-signed direct-to-S3 uploads, background transcoding and virus scanning, and a CDN for media.
- Push seat updates over WebSockets/SSE via Redis pub/sub or MongoDB change streams, if 15s freshness isn't enough.
- A Redis-backed rate limiter and response cache; put the public competition endpoint behind a CDN.
- A queue with retries for the hold sweeper / refunds (e.g. BullMQ), and a scheduled reconcile job with alerting on drift.
- Waitlist when sold out; notifications (registration closing soon, submission reminders, results).
- Observability: request IDs, metrics (registration success, sold-out rate, payment latency), tracing, and Sentry in the app.
- An OpenAPI spec generated from the Zod schemas, a shared types package for API contracts, E2E tests (Detox/Maestro), and CI (lint, typecheck, tests, build).
- In-app video player (`expo-video`), offline caching of the last-seen competition, and deep links (`feedants://competitions/:slug`).

## 7. Testing

```bash
cd backend && npm test
```

The suite has 32 tests, using `mongodb-memory-server`; set `MONGODB_TEST_URI` to use a real server instead.
- **Lifecycle unit tests:** phases, boundaries, countdown targets, urgency, every CTA state.
- **Concurrency:** oversell race, same-user parallel taps, concurrent sweepers, and a late payment after the hold expires with the competition sold out (refund path).
- **Business rules:** registration window, cancelled competitions, free entry, referral validation, payment signature forgery, cross-user access.
- **Submissions:** only confirmed participants, replacement, deadline enforcement, file type validation.
- **API contract:** localization, results hidden until the result date, caching headers, error shape.

Mobile: `npx tsc --noEmit`, `npx expo lint` and `npx expo-doctor` all pass.

## 8. Suggested demo script (screen recording)

1. Launch the app. It opens on Classical Dance as Priya: *Registered*, 1/20 booked, live countdown, **Upload Submission**.
2. Toggle **हिंदी**. All UI text and competition content switch language.
3. Tap **Upload Submission** and pick a video. Watch the progress, then the button becomes **Replace Submission · Submitted …**.
4. **Profile** → switch to *Kavya Iyer* → Classical Dance shows **Register Now · ₹ 99 · 19 of 20 spots left**.
5. Register → payment sheet with the seat-hold timer. Meanwhile, on a second device or browser as Priya, the counter moves to 2/20.
6. **Pay** → *You're registered!*, and the badge and CTA update.
7. Open **Bollywood Beats** as Priya → *Sold Out*. Open **Poetry Slam** → **View Results**. Open **Singing Star** → *Registration Opens Soon*.
8. Show the backend tests: `npm test`, including the oversell race.
