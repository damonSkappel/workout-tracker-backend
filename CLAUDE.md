# workout-tracker-backend

REST API for the WorkoutTracker mobile app. Node.js, Express 5, PostgreSQL.
Plain JavaScript, ES modules — **no TypeScript here**, so a typo in a field name
is a runtime 500 rather than a compile error. The app that consumes this lives
in `../WorkoutTracker` (its own repo, with its own CLAUDE.md).

## Running it

```bash
npm install
cp .env.example .env      # fill in DB credentials and a real JWT_SECRET
psql "$DB_NAME" -f src/database/migrations/001_refresh_tokens.sql
psql "$DB_NAME" -f src/database/migrations/002_indexes.sql
psql "$DB_NAME" -f src/database/migrations/003_backfill_order_index.sql
npm run dev               # nodemon
```

`npm run migrate` applies every file in `src/database/migrations/` in filename
order, inside one transaction -- a failure rolls back rather than leaving the
database half-migrated. It does not track what has already run, because every
file is written to be safe to re-run. A migration that is NOT re-runnable needs
a `schema_migrations` table first.

`000_initial_schema.sql` creates the core tables. It was added late, captured
from the working schema, because those tables had originally been created by
hand and a fresh database had nothing for `001` to attach to.

There are **no automated tests** (`npm test` is a stub). Verify changes with real
requests against the running server — `curl` against `localhost:3000` with a
token from `/auth/login` — rather than by reading the code and assuming.

## Layout

```
server.js                 route mounting, CORS, /health
src/controllers/          request handling per resource
src/routes/               thin route definitions
src/middleware/
  authMiddleware.js       verifies the access token, sets req.user
  rateLimiters.js         per-IP limits on the auth endpoints
src/services/
  ownership.js            parseId + userOwnsTemplate / userOwnsSession
  refreshTokens.js        issue / rotate / revoke, with reuse detection
src/database/migrations/  hand-applied SQL
```

`/auth/*` is public (except `/auth/verify`). Everything under `/api/*` sits
behind `authenticateToken` in `server.js`.

## Things that will bite you

**A token proves identity, never permission.** `req.user.userId` says who is
calling, not what they may touch. Every lookup by an id from the URL must prove
ownership — this was a real vulnerability where any logged-in user could read and
modify anyone else's data, and `GET /api/users` returned every user's bcrypt
hash.

Ownership chains back to a user like this:

```
workout_templates.user_id
template_exercises  -> workout_templates.user_id
workout_sessions.user_id
sets                -> workout_sessions.user_id
```

`sets` has no `user_id` and must not gain one — it is reachable through its
session, and a second copy of that fact could disagree with the first. Use the
helpers in `services/ownership.js`.

**Return 404, not 403, for rows the caller does not own.** 403 confirms the row
exists and lets someone map your id ranges.

**Prove ownership inside the write**, not in a separate query before it. See
`setController.updateSet` — the `WHERE` clause carries the check, so there is no
gap between checking and writing.

**`COUNT` and `SUM` return bigint, which node-pg hands back as a string.** Cast
with `::int` or the app receives `"4"`, renders it fine, and compares it wrongly.

**Always `ORDER BY`.** Two queries have already been fixed for returning rows in
whatever order Postgres felt like, which can differ between requests. Where
values can tie, add a tiebreaker — `ORDER BY order_index, id`.

**Never `SELECT *` on `users`.** That is exactly how password hashes leaked into
an API response. List the columns.

**Validate route ids with `parseId`** before they reach a query, or a non-numeric
id becomes a Postgres cast error surfacing as a 500 instead of a 400.

**`DATABASE_URL` wins over the `DB_*` variables.** Managed Postgres gives one
connection string; local development uses the five separate values. SSL is
enabled automatically when `DATABASE_URL` is present and off otherwise, because
a local Postgres normally has no SSL and connecting with it just fails.

**Nodemon watches `.js`, not `.env`.** Editing `.env` needs a manual restart.
And `.env.example` is documentation only — `dotenv` never loads it. A test that
"passed" after editing the wrong one has already happened.

**The rate limiter counts in memory.** A restart forgets everyone, which is handy
during testing and wrong the moment there is more than one instance.

## Auth model

Short-lived **access token** (JWT, 15 min, `Authorization: Bearer`) plus a
long-lived **refresh token** (opaque random string, 60 days).

- Only the SHA-256 hash of a refresh token is stored.
- Refresh tokens rotate: each works exactly once. Presenting an already-consumed
  one is treated as a leak and revokes every session for that user.
- Access tokens are verified against a configured issuer and audience. Changing
  `JWT_ISSUER` or `JWT_AUDIENCE` invalidates every token in circulation.
- Logout revokes the refresh token server-side.

Registration enforces email format and uniqueness, username length 2–30
(deliberately **not** unique — login is by email), and password 6–72 bytes. The
72-byte cap is not arbitrary: bcrypt silently ignores anything beyond it, so
without the cap two different long passwords sharing a prefix both verify.

## Conventions

- Solo dev: commit straight to `main`, no feature branches for ordinary work.
- Error responses are JSON `{ error: "..." }`. The app's error handling expects
  that shape; `res.send("Server error")` breaks it.
- Client-side validation in the app is convenience. This is where the rules are
  actually enforced, and the two must agree.
