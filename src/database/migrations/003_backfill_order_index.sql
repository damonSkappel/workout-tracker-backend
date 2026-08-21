-- Give each template's exercises a distinct order_index. Safe to re-run.
--
-- The app sent a hardcoded order_index of 1 for every exercise, so ORDER BY
-- order_index had nothing to sort by and Postgres returned ties in whatever
-- order it liked -- which could differ between two runs of the same query.
--
-- Only templates that currently have colliding values are touched, and the new
-- order follows insertion order (id). Once a template has distinct values it is
-- no longer "colliding", so re-running this leaves it alone and any deliberate
-- ordering set later is preserved.

WITH colliding AS (
  SELECT template_id
    FROM template_exercises
   GROUP BY template_id, order_index
  HAVING COUNT(*) > 1
),
ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY template_id ORDER BY id) AS position
    FROM template_exercises
   WHERE template_id IN (SELECT template_id FROM colliding)
)
UPDATE template_exercises te
   SET order_index = ranked.position
  FROM ranked
 WHERE te.id = ranked.id;
