// Basic per-user rate limiting for endpoints that call the Anthropic API
// (recommendations, title search, chat), so a bug, a testing loop, or actual
// abuse can't run up a surprise bill. DB-backed (RateLimitHit table) rather
// than an in-memory counter, specifically so the limit survives `npm run dev`
// restarts during development - an in-memory counter would just reset every
// time the server restarts, which defeats the point. This is a sliding-window
// limiter, not a precise/distributed one - fine for a single-instance app
// like this; a real multi-instance deployment would want a shared store
// (e.g. Redis) instead of SQLite for this table.

import { prisma } from "@/lib/prisma";

// Per-action { max requests, window in ms }. Tuned to comfortably cover
// real usage (someone clicking around normally) while still capping a
// runaway loop - not meant to be exact, just a basic backstop.
const LIMITS = {
  // Each call can trigger several fresh web-search lookups (one per
  // suggested title) - the most expensive endpoint per call, so the
  // tightest limit.
  recommendations: { max: 10, windowMs: 60 * 60 * 1000 }, // 10/hour
  surprise: { max: 10, windowMs: 60 * 60 * 1000 }, // 10/hour
  // The default single-best-guess search - cheap, so a generous limit that
  // won't get in the way of normal searching while rating/adding titles.
  titleSearch: { max: 30, windowMs: 10 * 60 * 1000 }, // 30/10min
  // The opt-in "show other matches" - already a deliberate second call per
  // lib/titles.js, but still real web-search cost, so a bit tighter.
  titleCandidates: { max: 15, windowMs: 10 * 60 * 1000 }, // 15/10min
  chat: { max: 20, windowMs: 10 * 60 * 1000 }, // 20/10min - a normal back-and-forth conversation
};

/**
 * Checks whether (userId, action) is still within its limit, and records
 * this request if so. Returns { allowed: true } or
 * { allowed: false, retryAfterSeconds }. Callers should return a 429 with
 * that value when not allowed - see formatRetryAfter below.
 */
export async function checkRateLimit(userId, action) {
  const limit = LIMITS[action];
  if (!limit) throw new Error(`Unknown rate-limit action: "${action}"`);

  const windowStart = new Date(Date.now() - limit.windowMs);

  // Rows older than the window are useless for counting from here on - clean
  // them up as part of the check so this table self-cleans instead of
  // growing forever, with no separate cleanup job needed.
  await prisma.rateLimitHit.deleteMany({ where: { userId, action, createdAt: { lt: windowStart } } });

  const hits = await prisma.rateLimitHit.findMany({
    where: { userId, action },
    orderBy: { createdAt: "asc" },
  });

  if (hits.length >= limit.max) {
    const retryAfterMs = hits[0].createdAt.getTime() + limit.windowMs - Date.now();
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  await prisma.rateLimitHit.create({ data: { userId, action } });
  return { allowed: true };
}

// Turns a retryAfterSeconds into a short phrase for an error message, e.g.
// "45 seconds" or "12 minutes".
export function formatRetryAfter(retryAfterSeconds) {
  if (retryAfterSeconds < 90) return `${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
