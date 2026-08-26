// GET    /api/ratings - list the current user's ratings (most recent first)
// POST   /api/ratings - create or update a rating on a title, then refresh the AI profile
// DELETE /api/ratings - remove a rating entirely (e.g. from the Watched page), then refresh the AI profile
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { deserializeTitle } from "@/lib/titles";
import { analyzePreferences } from "@/lib/profile";
import { RATING_STATUSES } from "@/lib/questions";
import { trackWatchedMilestones, trackEvent } from "@/lib/events";

export async function GET(request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const [ratings, watchedCount] = await Promise.all([
    prisma.rating.findMany({
      where: { userId: user.id },
      include: { title: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.rating.count({ where: { userId: user.id, status: "watched" } }),
  ]);

  return NextResponse.json({
    ratings: ratings.map((r) => ({ ...r, title: deserializeTitle(r.title) })),
    watchedCount,
  });
}

export async function POST(request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { titleId, status, stars, why } = body || {};

  if (!titleId || !RATING_STATUSES.includes(status)) {
    return NextResponse.json({ error: "titleId and a valid status are required." }, { status: 400 });
  }

  const rating = await prisma.rating.upsert({
    where: { userId_titleId: { userId: user.id, titleId } },
    update: { status, stars: stars ?? null, why: why ?? null, source: "form" },
    create: { userId: user.id, titleId, status, stars: stars ?? null, why: why ?? null, source: "form" },
  });

  // Recurring (not one-time) - every save, so the breakdown by status
  // (watched vs. want_to_watch vs. not_interested) is visible over time.
  trackEvent(user.id, "rating_saved", { status }).catch((err) => {
    console.error("Failed to track rating_saved:", err.message);
  });

  // Every new rating is new signal for the AI Engine - refresh the profile
  // so the Recommendations/My Preferences pages reflect it. Don't block the
  // save on this - it's a real Claude API call and the user is waiting on
  // this response to know their rating was saved.
  analyzePreferences(user.id).catch((err) => {
    console.error("Failed to re-analyze preferences after rating:", err.message);
  });

  // Activation-funnel milestones (first_rating / activated_10_watched) only
  // apply to actually-watched ratings, not wishlist adds or not-interested
  // marks. Cheap local DB work, so awaited rather than fire-and-forget.
  if (status === "watched") {
    await trackWatchedMilestones(user.id).catch((err) => {
      console.error("Failed to track watched-rating milestones:", err.message);
    });
  }

  return NextResponse.json({ rating });
}

export async function DELETE(request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { ratingId } = body || {};
  if (!ratingId) return NextResponse.json({ error: "ratingId is required." }, { status: 400 });

  const rating = await prisma.rating.findUnique({ where: { id: ratingId } });
  if (!rating || rating.userId !== user.id) {
    return NextResponse.json({ error: "Rating not found." }, { status: 404 });
  }

  await prisma.rating.delete({ where: { id: ratingId } });

  trackEvent(user.id, "rating_deleted", { status: rating.status }).catch((err) => {
    console.error("Failed to track rating_deleted:", err.message);
  });

  // Removing a rating is a real change to the AI Engine's signal, same as
  // adding one - refresh the profile so it stops reflecting a title the
  // user un-rated. Not blocking the response for the same reason as POST.
  analyzePreferences(user.id).catch((err) => {
    console.error("Failed to re-analyze preferences after rating delete:", err.message);
  });

  return NextResponse.json({ ok: true });
}
