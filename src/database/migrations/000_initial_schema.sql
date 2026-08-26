-- The core tables. Safe to re-run.
--
-- These were originally created by hand during development and never written
-- down, so a fresh database had nothing for the later migrations to attach to
-- (001 references users(id) and would fail on an empty database). Captured here
-- from the working schema with pg_dump so a new environment can be built from
-- nothing.
--
-- Numbered 000 because it has to run before everything else. refresh_tokens is
-- deliberately left to 001, where it already lives.
--
-- Order matters: each table references the ones above it.

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR NOT NULL UNIQUE,
  username   VARCHAR NOT NULL,           -- display only, deliberately not unique
  password   VARCHAR(255) NOT NULL,      -- bcrypt hash, never a plaintext password
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workout_templates (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id),
  name       VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS template_exercises (
  id            SERIAL PRIMARY KEY,
  template_id   INTEGER NOT NULL REFERENCES workout_templates (id),
  exercise_name VARCHAR NOT NULL,
  -- Position within the template. The server assigns MAX(order_index) + 1.
  order_index   INTEGER NOT NULL,
  default_sets  INTEGER DEFAULT 3
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users (id),
  template_id INTEGER NOT NULL REFERENCES workout_templates (id),
  date        DATE NOT NULL,
  completed   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- A set has no user_id of its own on purpose: it belongs to a session, and the
-- session knows its user. Storing that twice would let the two disagree.
CREATE TABLE IF NOT EXISTS sets (
  id                   SERIAL PRIMARY KEY,
  session_id           INTEGER NOT NULL REFERENCES workout_sessions (id),
  template_exercise_id INTEGER NOT NULL REFERENCES template_exercises (id),
  set_number           INTEGER NOT NULL,
  weight               NUMERIC,  -- nullable until logged; 0 is a real bodyweight value
  reps                 INTEGER,
  completed            BOOLEAN DEFAULT FALSE
);
