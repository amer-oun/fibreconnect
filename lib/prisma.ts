import { PrismaClient } from "@prisma/client";

/**
 * Single shared PrismaClient instance.
 *
 * In development Next.js hot-reloads server modules on every save. Creating a
 * new PrismaClient on each reload would open a new connection pool every time
 * and eventually exhaust the database. Stashing the instance on `globalThis`
 * survives hot reloads; in production the module is evaluated once so the
 * global is not needed.
 *
 * Server-side only: never import this file from a `"use client"` component.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
