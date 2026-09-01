// The Recommendations Page (Section 3.3 of the planning doc): a queue of new
// AI-suggested picks awaiting a decision, each with streaming info, scores,
// and a personalized "why" - see lib/recommendations.js for how the list is
// built. Once you triage a pick (wishlist / watched / not interested), it
// moves to the Wishlist or Watched page and drops off this list.

import { requireUser } from "@/lib/session";
import { listRecommendations, checkRecommendationEligibility } from "@/lib/recommendations";
import { trackPageView } from "@/lib/events";
import NavBar from "@/components/NavBar";
import RecommendationsPageClient from "@/components/RecommendationsPageClient";

export default async function RecommendationsPage() {
  const user = await requireUser();
  await trackPageView(user.id, "recommendations").catch((err) => console.error("Failed to track page view:", err.message));
  const [recommendations, eligibility] = await Promise.all([
    listRecommendations(user.id),
    checkRecommendationEligibility(user.id),
  ]);

  return (
    <>
      <NavBar activePath="/recommendations" />
      <div className="page">
        <h1>Recommendations</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          New AI-suggested picks you&apos;ve never mentioned. Add each one to your{" "}
          <a href="/wishlist">Wishlist</a>, mark it watched, or say you&apos;re not interested.
        </p>
        <RecommendationsPageClient
          initialRecommendations={recommendations}
          initialLocation={user.location}
          eligibility={eligibility}
        />
      </div>
    </>
  );
}
