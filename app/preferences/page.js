// My Preferences Page (Section 3.5 of the planning doc) - the AI's profile
// of the user, made fully readable AND editable, inspired by Instagram's
// "Your Algorithm" page.

import { requireUser } from "@/lib/session";
import { getProfile } from "@/lib/profile";
import { trackPageView } from "@/lib/events";
import NavBar from "@/components/NavBar";
import PreferencesPageClient from "@/components/PreferencesPageClient";

export default async function PreferencesPage() {
  const user = await requireUser();
  await trackPageView(user.id, "preferences").catch((err) => console.error("Failed to track page view:", err.message));
  const profile = await getProfile(user.id);

  const userMeta = {
    location: user.location,
    streamingServices: JSON.parse(user.streamingServices || "[]"),
    openToOtherStreaming: user.openToOtherStreaming,
  };

  return (
    <>
      <NavBar activePath="/preferences" />
      <div className="page">
        <h1>My Preferences</h1>
        <PreferencesPageClient initialProfile={profile} initialUserMeta={userMeta} />
      </div>
    </>
  );
}
