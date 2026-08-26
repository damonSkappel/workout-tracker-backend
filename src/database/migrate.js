/**
 * Applies every SQL file in migrations/ in filename order.
 *
 * Run with `npm run migrate`. Against Heroku: `heroku run npm run migrate`.
 *
 * Deliberately simple. Every migration is written to be safe to re-run, so this
 * does not track which have already been applied -- it just runs them all, in
 * order, inside one transaction. If any file fails, nothing is committed and the
 * database is left exactly as it was, rather than half-migrated.
 *
 * If this project ever grows migrations that are NOT safe to re-run, this needs
 * a schema_migrations table first.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "./connection.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, "migrations");

const run = async () => {
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort(); // 000_, 001_, 002_ ... filename order is the run order

  if (files.length === 0) {
    console.log("No migrations found.");
    return;
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    for (const file of files) {
      process.stdout.write(`  ${file} ... `);
      await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
      console.log("ok");
    }

    await client.query("COMMIT");
    console.log(`\nApplied ${files.length} migration(s).`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\nMigration failed, rolled back. Nothing was changed.");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.end();
  }
};

run();
