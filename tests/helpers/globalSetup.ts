import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "child_process";

let container: InstanceType<typeof PostgreSqlContainer> | undefined;

export async function setup() {
  console.log("[globalSetup] Starting PostgreSQL container...");

  const pgContainer = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("test_db")
    .withUsername("test")
    .withPassword("test")
    .withExposedPorts(5432)
    .start();

  const connectionUri = pgContainer.getConnectionUri();
  console.log(`[globalSetup] PostgreSQL running at ${connectionUri}`);

  // Store for teardown
  container = pgContainer as unknown as InstanceType<
    typeof PostgreSqlContainer
  >;

  // Set DATABASE_URL for Prisma migrations
  process.env.DATABASE_URL = connectionUri;
  process.env.SKIP_ENV_VALIDATION = "1";

  // Run prisma migrations against the test container
  console.log("[globalSetup] Running prisma migrate deploy...");
  execSync("bunx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: connectionUri },
    stdio: "pipe",
  });

  console.log("[globalSetup] Running seed...");
  try {
    execSync("bun run db:seed", {
      env: {
        ...process.env,
        DATABASE_URL: connectionUri,
        SKIP_ENV_VALIDATION: "1",
      },
      stdio: "pipe",
    });
    console.log("[globalSetup] Seed completed.");
  } catch {
    console.warn("[globalSetup] Seed failed or skipped (non-fatal).");
  }

  console.log("[globalSetup] Ready.");

  // Pass connection URI to test workers via env
  return () => {
    process.env.TEST_DATABASE_URL = connectionUri;
  };
}

export async function teardown() {
  console.log("[globalSetup] Stopping PostgreSQL container...");
  if (container) {
    await (container as unknown as { stop: () => Promise<void> }).stop();
  }
  console.log("[globalSetup] Done.");
}
