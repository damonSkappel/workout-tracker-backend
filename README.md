# workout-tracker-backend

REST API for the WorkoutTracker app: Node.js, Express 5, PostgreSQL.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create an env file and fill it in:
   ```bash
   cp .env.example .env
   ```
3. Create the database, then build the schema:
   ```bash
   createdb workout_tracker
   npm run migrate
   ```
   `npm run migrate` applies every file in `src/database/migrations/` in
   filename order, inside a single transaction. Each file is safe to re-run, so
   running it again is a no-op.
4. Start it:
   ```bash
   npm run dev    # nodemon
   npm start      # plain node
   ```

## Auth

Sessions use a short-lived **access token** plus a long-lived **refresh token**.

- The access token is a JWT (15 minutes by default) sent as
  `Authorization: Bearer <token>`. It carries `userId` and `email`, and is
  verified against a configured issuer and audience.
- The refresh token is an opaque random string, valid for 60 days. Only its
  SHA-256 hash is stored, so a database leak does not hand out usable sessions.
- Refresh tokens **rotate**: each one works exactly once, and using it returns a
  replacement. Presenting an already-used token is treated as a leak, and every
  session for that user is revoked.
- Logging out revokes the refresh token server-side.

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /auth/register` | none | Create an account, returns both tokens |
| `POST /auth/login` | none | Returns both tokens |
| `POST /auth/refresh` | refresh token in body | Rotates, returns both tokens |
| `POST /auth/logout` | refresh token in body | Revokes it, always 204 |
| `GET /auth/verify` | access token | Confirms the access token is good |

All other routes under `/api/*` require a valid access token.

### Rate limiting

Per IP, over a 15-minute window by default: 10 **failed** logins (successful
ones are not counted), 5 registrations, 60 refreshes. All configurable via the
env vars in `.env.example`.


## Deploying to Heroku

The app reads `DATABASE_URL` when it is present and falls back to the five
`DB_*` variables locally, so the same code runs in both places.

**One-time setup**

```bash
heroku login
heroku create your-app-name
heroku addons:create heroku-postgresql:essential-0   # sets DATABASE_URL for you
```

Set the config. `JWT_SECRET` must be a **new** strong value, not the one from
your laptop:

```bash
heroku config:set JWT_SECRET="$(openssl rand -base64 48)"
heroku config:set JWT_ISSUER=workout-tracker-api
heroku config:set JWT_AUDIENCE=workout-tracker-mobile
heroku config:set JWT_EXPIRES_IN=15m
```

Never set `DATABASE_URL` or `PORT` yourself -- Heroku manages both.

**Deploy and build the schema**

```bash
git push heroku main
heroku run npm run migrate
heroku open        # should show "Hi there!"
curl https://your-app-name.herokuapp.com/health
```

**Point the app at it.** In the mobile repo, set `EXPO_PUBLIC_API_URL` to the
`https://` URL and restart Expo -- `EXPO_PUBLIC_*` values are inlined at bundle
time, so a running server will not pick up the change.

**Notes**

- Use a **Basic** dyno, not Eco. Eco dynos sleep after inactivity, and waiting
  ~30s for the app to wake up mid-workout is miserable. Basic does not sleep.
- The hosted database starts empty. Accounts and workouts created locally do not
  come with it; sign up again against the deployed API.
- The rate limiter counts in memory, so a dyno restart forgets everyone. Fine
  for one dyno, wrong the moment you scale past one.
