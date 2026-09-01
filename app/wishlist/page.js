// The Wishlist Page: titles you want to watch but haven't yet. Search to add
// a title directly, or add one from the Recommendations page - either way it
// lands here, read from the same Rating table (status "want_to_watch") that
// the Ratings and Watched pages use for "watched". See lib/recommendations.js
// listWishlist for the query.

import { requireUser } from "@/lib/session";
import { listWishlist } from "@/lib/recommendations";
import { trackPageView } from "@/lib/events";
import NavBar from "@/components/NavBar";
import WishlistPageClient from "@/components/WishlistPageClient";

export default async function WishlistPage() {
  const user = await requireUser();
  await trackPageView(user.id, "wishlist").catch((err) => console.error("Failed to track page view:", err.message));
  const wishlist = await listWishlist(user.id);

  return (
    <>
      <NavBar activePath="/wishlist" />
      <div className="page">
        <h1>Wishlist</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Titles you want to watch but haven&apos;t yet. Search to add one directly, or send a pick here from the{" "}
          <a href="/recommendations">Recommendations page</a>. Once you watch something, mark it watched and rate
          it right here. Already watched something you never added? Rate it directly on the{" "}
          <a href="/ratings">Ratings page</a> instead.
        </p>
        <WishlistPageClient initialWishlist={wishlist} userRegion={user.location} />
      </div>
    </>
  );
}
