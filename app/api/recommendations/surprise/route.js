// POST /api/recommendations/surprise - the "Surprise Me" button on the
// Recommendations page. Generates exactly ONE deliberate stretch pick (see
// lib/recommendations.js generateSurprisePick) instead of a full batch, so
// it's a cheap, single-title call, not a repeat of "Generate more picks".
import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/session";
import { generateSurprisePick } from "@/lib/recommendations";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { trackEvent } from "@/lib/events";

export async function POST(request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const limit = await checkRateLimit(user.id, "surprise");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `You've requested a lot of surprise picks recently - try again in ${formatRetryAfter(limit.retryAfterSeconds)}.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const created = await generateSurprisePick(user.id);
    if (!created) {
      return NextResponse.json({ error: "Couldn't come up with a surprise pick this time - try again." }, { status: 500 });
    }
    trackEvent(user.id, "surprise_pick_generated").catch((err) => {
      console.error("Failed to track surprise_pick_generated:", err.message);
    });
    return NextResponse.json({ created });
  } catch (err) {
    console.error("Failed to generate surprise pick:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
