// A single, shared Prisma Client instance.
//
// In Next.js dev mode, files can get re-imported/re-executed a lot as you
// edit code (hot reload). If we created a new PrismaClient every time this
// file was loaded, we'd quickly open way too many database connections.
// The pattern below stashes the client on the global object so it survives
// hot reloads and only gets created once.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Uncomment to see every SQL query Prisma runs - handy for debugging.
    // log: ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
