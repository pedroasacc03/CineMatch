// The User Ratings Page (Section 3.2 of the planning doc): only for rating
// titles you've ALREADY watched (in real life) - a small dismissible
// reminder pop-up with a few guided questions, a search bar, and a "rate a
// title" panel. Haven't watched it yet? That's the Wishlist page instead -
// see app/wishlist/page.js.

import { requireUser } from "@/lib/session";
import { GUIDED_QUESTIONS } from "@/lib/questions";
import { trackPageView } from "@/lib/events";
import NavBar from "@/components/NavBar";
import RatingsPageClient from "@/components/RatingsPageClient";

export default async function RatingsPage() {
  const user = await requireUser();
  await trackPageView(user.id, "ratings").catch((err) => console.error("Failed to track page view:", err.message));

  return (
    <>
      <NavBar activePath="/ratings" />
      <div className="page">
        <h1>Ratings</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          For titles you&apos;ve already watched. Rate right after watching, while it&apos;s fresh — the more you
          rate, the better your recommendations get. Want to watch something later instead? Head to your{" "}
          <a href="/wishlist">Wishlist</a>.
        </p>
        <RatingsPageClient guidedQuestions={GUIDED_QUESTIONS} />
      </div>
    </>
  );
}
