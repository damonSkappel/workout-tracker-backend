import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

/**
 * Two ways to reach a database, because hosts and laptops disagree.
 *
 * Every managed Postgres (Heroku, Neon, Railway) hands you a single connection
 * string in DATABASE_URL. Local development uses the five separate DB_* values,
 * which is friendlier to edit by hand. Prefer the URL when it exists, so the
 * same code runs in both places with nothing but configuration changing.
 *
 * SSL: managed Postgres requires it, a local install normally has not got it
 * set up at all -- connecting with SSL to localhost just fails. Enabled only
 * when a DATABASE_URL is present, unless PGSSL is set explicitly.
 *
 * rejectUnauthorized: false looks alarming but is what Heroku's own docs
 * prescribe. Their certificates are signed by an authority Node does not ship,
 * so full verification fails. The connection is still encrypted; what is given
 * up is proof of who is on the other end.
 */
const connectionString = process.env.DATABASE_URL;

const useSsl =
  process.env.PGSSL === "true" ||
  (process.env.PGSSL !== "false" && !!connectionString);

const db = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
      },
);

// A pooled client can drop at any time (idle timeout, a host restart). Without
// a listener, Node treats that as an unhandled error event and kills the
// process -- which on a server means the whole API goes down for one bad socket.
db.on("error", (err) => {
  console.error("[db] Idle client error:", err.message);
});

export default db;
