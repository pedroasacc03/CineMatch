// GET   /api/preferences - fetch the current user's profile (the "My Preferences" page)
// PATCH /api/preferences - manual edit of one or more fields (treated just like a rating - see lib/profile.js)
// POST  /api/preferences - "Ask AI to re-analyze" - force a fresh analysis run
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { getProfile, updateProfile, analyzePreferences } from "@/lib/profile";
import { trackEvent } from "@/lib/events";

export async function GET(request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const profile = await getProfile(user.id);
  return NextResponse.json({ profile, user: { location: user.location, streamingServices: JSON.parse(user.streamingServices || "[]"), openToOtherStreaming: user.openToOtherStreaming } });
}

export async function PATCH(request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Some fields (location, streamingServices, openToOtherStreaming) live on
  // the User row rather than PreferenceProfile - split them out here so the
  // My Preferences page can PATCH everything through one endpoint.
  const { location, streamingServices, openToOtherStreaming, ...profileFields } = body;

  if (location !== undefined || streamingServices !== undefined || openToOtherStreaming !== undefined) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(location !== undefined ? { location } : {}),
        ...(streamingServices !== undefined ? { streamingServices: JSON.stringify(streamingServices) } : {}),
        ...(openToOtherStreaming !== undefined ? { openToOtherStreaming } : {}),
      },
    });
  }

  let profile = null;
  if (Object.keys(profileFields).length > 0) {
    profile = await updateProfile(user.id, profileFields);
  } else {
    profile = await getProfile(user.id);
  }

  // Fires on every field-level edit on the My Preferences page (one PATCH
  // per chip/note/genre change, not per "session") - `fields` is just the
  // list of keys touched (e.g. ["genres"]), never the actual values, so this
  // never becomes a log of what people wrote.
  trackEvent(user.id, "profile_edited", { fields: Object.keys(body) }).catch((err) => {
    console.error("Failed to track profile_edited:", err.message);
  });

  return NextResponse.json({ profile });
}

export async function POST(request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  try {
    const profile = await analyzePreferences(user.id);
    trackEvent(user.id, "profile_reanalyzed").catch((err) => {
      console.error("Failed to track profile_reanalyzed:", err.message);
    });
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Re-analysis failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
