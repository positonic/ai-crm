import { PrismaClient } from "@prisma/client";

import { env } from "~/env";

const createPrismaClient = () => {
  const url = new URL(env.DATABASE_URL);
  url.searchParams.set("connection_limit", "5");
  url.searchParams.set("pool_timeout", "30");
  url.searchParams.set("connect_timeout", "10");
  url.searchParams.set("socket_timeout", "30");
  url.searchParams.set("keepalives", "1");
  url.searchParams.set("pgbouncer", "true");

  return new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: url.toString(),
      },
    },
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
