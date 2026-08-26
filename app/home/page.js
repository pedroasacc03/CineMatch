// The Home Page (Section 3.1 of the planning doc). A Server Component:
// it fetches everything it needs directly from the database (no client-side
// loading spinner needed for the initial view) and renders the "welcome
// back" hero plus quick actions and top picks.

import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listWishlist } from "@/lib/recommendations";
import { trackPageView } from "@/lib/events";
import NavBar from "@/components/NavBar";
import TitlePoster from "@/components/TitlePoster";

// How many watched-and-rated titles it takes to have a solid taste profile.
// Mirrors the goal shown on the Ratings page.
const RATINGS_GOAL = 10;

export default async function HomePage() {
  const user = await requireUser();
  // Awaited (not fire-and-forget): Next.js doesn't guarantee an unawaited
  // background promise survives past the response - see lib/events.js.
  await trackPageView(user.id, "home").catch((err) => console.error("Failed to track page view:", err.message));

  const [ratingsCount, wishlist] = await Promise.all([
    prisma.rating.count({ where: { userId: user.id } }),
    listWishlist(user.id),
  ]);

  const completeness = Math.min(100, Math.round((ratingsCount / RATINGS_GOAL) * 100));
  // "Top picks" previously showed undecided AI recommendations - now it
  // shows what the user has actually decided they want to watch (their
  // Wishlist), since that's a truer "coming up for you" than an unreviewed
  // AI suggestion. See app/recommendations/page.js for the AI-picks queue.
  const wishlistPreview = wishlist.slice(0, 5);

  return (
    <>
      <NavBar activePath="/home" />
      <div className="page">
        <div className="hero">
          <h1>Welcome back{user.name ? `, ${user.name}` : ""}</h1>
          <p>
            {ratingsCount === 0 ? (
              <>
                You haven&apos;t rated anything yet. Head to <Link href="/ratings" style={{ color: "white", textDecoration: "underline" }}>Ratings</Link> and rate a few titles to get started.
              </>
            ) : (
              <>
                You&apos;ve rated {ratingsCount} title{ratingsCount === 1 ? "" : "s"}. Your taste profile is{" "}
                {completeness}% complete.
              </>
            )}
          </p>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${completeness}%` }} />
          </div>
        </div>

        <div className="quick-actions">
          <Link href="/ratings" className="quick-action-card">
            <strong>Rate what you&apos;ve watched</strong>
            <span>Sharpen your recommendations</span>
          </Link>
          <Link href="/wishlist" className="quick-action-card">
            <strong>Wishlist</strong>
            <span>Titles you want to watch</span>
          </Link>
          <Link href="/recommendations" className="quick-action-card">
            <strong>Recommendations</strong>
            <span>New AI picks awaiting your decision</span>
          </Link>
          <Link href="/chat" className="quick-action-card">
            <strong>Ask the Chatbot</strong>
            <span>&quot;I want something sad tonight&quot;</span>
          </Link>
          <Link href="/preferences" className="quick-action-card">
            <strong>My Preferences</strong>
            <span>See &amp; edit your taste profile</span>
          </Link>
        </div>

        <h2 className="section-title">From your wishlist</h2>
        {wishlistPreview.length === 0 ? (
          <p className="muted">
            Nothing on your wishlist yet - add something on the <Link href="/wishlist">Wishlist page</Link>, or
            check your <Link href="/recommendations">Recommendations</Link> for AI picks to add.
          </p>
        ) : (
          <div className="title-grid">
            {wishlistPreview.map((item) => (
              <div key={item.id} className="title-mini-card">
                <TitlePoster title={item.title} />
                <div className="info">
                  <div className="name">{item.title.name}</div>
                  <div className="meta">
                    {item.title.rtScore ? `RT ${item.title.rtScore}% ` : ""}
                    {item.title.imdbScore ? `· IMDb ${item.title.imdbScore}` : ""}
                  </div>
                  <div className="meta">{item.title.streamingAvailability?.[0] || "Streaming info unknown"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
