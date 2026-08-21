-- Indexes on the columns we filter by. Safe to re-run.
--
-- Postgres indexes primary keys automatically but NOT foreign keys, and every
-- one of these columns appears in a WHERE clause on a hot path. Without them
-- each of these queries scans the whole table. That is invisible at a few dozen
-- rows and painful at a few thousand -- `sets` grows fastest, since it gains a
-- row per set per exercise per workout.

-- Loading a workout: SELECT * FROM sets WHERE session_id = $1
CREATE INDEX IF NOT EXISTS idx_sets_session_id ON sets (session_id);

-- Joining sets back to the exercise they belong to.
CREATE INDEX IF NOT EXISTS idx_sets_template_exercise_id ON sets (template_exercise_id);

-- Listing a template's exercises, and counting them before starting a workout.
CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id
  ON template_exercises (template_id);

-- Ownership checks and the history query both filter sessions by user.
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_template_id ON workout_sessions (template_id);

-- Listing your templates, and every userOwnsTemplate() check.
CREATE INDEX IF NOT EXISTS idx_workout_templates_user_id ON workout_templates (user_id);
