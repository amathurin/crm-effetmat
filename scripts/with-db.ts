/**
 * Démarre un PostgreSQL local (embedded-postgres), exécute la commande passée en
 * argument, puis arrête proprement la base à la fin.
 *
 *   tsx scripts/with-db.ts -- next dev
 *   tsx scripts/with-db.ts -- prisma migrate dev
 *
 * Les données sont persistées dans ./.pgdata (voir .gitignore).
 * En production (Supabase), ce script n'est pas utilisé : DATABASE_URL pointe
 * directement sur la base gérée.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const DATA_DIR = path.resolve(process.cwd(), ".pgdata");
const PORT = Number(process.env.PGDEV_PORT ?? 5433);
const USER = "postgres";
const PASSWORD = "postgres";
const DB_NAME = "crm";

const argv = process.argv.slice(2);
const sep = argv.indexOf("--");
const command = sep >= 0 ? argv.slice(sep + 1) : argv;

function dataDirInitialised() {
  return existsSync(DATA_DIR) && readdirSync(DATA_DIR).length > 0;
}

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  port: PORT,
  user: USER,
  password: PASSWORD,
  authMethod: "scram-sha-256",
  persistent: true,
  onLog: () => {},
  onError: (m) => {
    if (!shuttingDown) console.error("[postgres]", m);
  },
});

let child: ReturnType<typeof spawn> | undefined;
let shuttingDown = false;

async function shutdown(code: number) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (child && child.exitCode === null) child.kill("SIGTERM");
  try {
    await pg.stop();
  } catch {
    /* ignore */
  }
  process.exit(code);
}

async function main() {
  if (!dataDirInitialised()) {
    console.log("→ Initialisation du cluster PostgreSQL local…");
    await pg.initialise();
  }

  console.log(`→ Démarrage de PostgreSQL sur le port ${PORT}…`);
  await pg.start();

  try {
    await pg.createDatabase(DB_NAME);
    console.log(`→ Base « ${DB_NAME} » créée.`);
  } catch {
    // la base existe déjà
  }

  const databaseUrl = `postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DB_NAME}?schema=public`;

  if (command.length === 0) {
    console.log(
      `\n✓ PostgreSQL prêt sur ${databaseUrl}\n  Laissez ce terminal ouvert, puis lancez les commandes Prisma ailleurs.\n  Ctrl+C pour arrêter.\n`,
    );
    return;
  }

  console.log(`→ ${command.join(" ")}\n`);
  child = spawn(command[0], command.slice(1), {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DIRECT_URL: databaseUrl,
    },
  });

  child.on("exit", (code, signal) => {
    void shutdown(signal ? 1 : (code ?? 0));
  });
}

process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));

main().catch((err) => {
  console.error(err);
  void shutdown(1);
});
