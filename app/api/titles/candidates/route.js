// GET /api/titles/candidates?q=... - opt-in disambiguation for the Ratings
// and Wishlist pages: "show other possible matches" after a search result
// wasn't the right title. Deliberately separate from /api/titles/search
// (the default single-best-guess lookup) so this extra TMDB search only
// ever happens when a user explicitly asks for it - see lib/titles.js
// findTitleCandidates.
import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/session";
import { findTitleCandidates } from "@/lib/titles";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { trackEvent } from "@/lib/events";

export async function GET(request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const limit = await checkRateLimit(user.id, "titleCandidates");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many "show other matches" requests in a row - try again in ${formatRetryAfter(limit.retryAfterSeconds)}.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const query = new URL(request.url).searchParams.get("q");
  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Missing search query." }, { status: 400 });
  }

  try {
    const candidates = await findTitleCandidates(query);
    trackEvent(user.id, "show_other_matches_used", { resultCount: candidates.length }).catch((err) => {
      console.error("Failed to track show_other_matches_used:", err.message);
    });
    return NextResponse.json({ candidates });
  } catch (err) {
    console.error("Title candidate search failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
