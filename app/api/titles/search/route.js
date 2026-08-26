// GET /api/titles/search?q=...[&year=...&type=...] - the search bar on the
// Ratings/Wishlist pages. Looks up (or reuses a cached) title via the AI
// Engine's web search. `year`/`type` are optional and only ever come from
// the user picking a specific candidate off the "other matches" list (see
// /api/titles/candidates) - they pin the lookup to that exact title instead
// of the single best-guess default.
import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/session";
import { findOrLookupTitle } from "@/lib/titles";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { trackEvent } from "@/lib/events";

export async function GET(request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const limit = await checkRateLimit(user.id, "titleSearch");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many searches in a row - try again in ${formatRetryAfter(limit.retryAfterSeconds)}.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const params = new URL(request.url).searchParams;
  const query = params.get("q");
  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Missing search query." }, { status: 400 });
  }
  const year = params.get("year");
  const type = params.get("type");

  try {
    const title = await findOrLookupTitle(query, {
      year: year ? Number(year) : undefined,
      type: type || undefined,
      region: user.location || undefined,
    });
    // No raw query text in metadata - just whether it succeeded, so this
    // never becomes a de-facto log of what people searched for.
    trackEvent(user.id, "search_performed", { found: !!title }).catch((err) => {
      console.error("Failed to track search_performed:", err.message);
    });

    if (!title) {
      return NextResponse.json({ error: `Couldn't find a title matching "${query}".` }, { status: 404 });
    }
    return NextResponse.json({ title });
  } catch (err) {
    console.error("Title search failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
