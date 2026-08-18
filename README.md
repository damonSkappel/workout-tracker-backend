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
3. Apply the SQL in `src/database/migrations/` to your database, in filename
   order. Each file is safe to re-run:
   ```bash
   psql "$DB_NAME" -f src/database/migrations/001_refresh_tokens.sql
   ```
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
