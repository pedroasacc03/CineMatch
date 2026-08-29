// Single source of truth for the 10 guided onboarding questions from the
// planning doc (Section 3.1 / "My Preferences" notes). Both the Home page
// onboarding banner and the Ratings page reminder pop-up import this list,
// so the wording only ever needs to change in one place.

export const GUIDED_QUESTIONS = [
  { key: "recent", text: "What are some movies or TV shows that you have watched recently?" },
  { key: "iconic", text: "What are some movies or TV shows that are iconic to you?" },
  { key: "happy", text: "What are some movies or TV shows that you watch when you feel happy?" },
  { key: "sad", text: "What are some movies or TV shows that you watch when you feel sad?" },
  { key: "favorites", text: "What are your favorite movies or TV shows?" },
  { key: "top5", text: "Top 5 best movies? Top 5 best TV shows?" },
  { key: "hated", text: "What are some movies or TV shows that you hated watching?" },
  { key: "family", text: "What are some movies/TV shows that you have liked watching with your family?" },
  { key: "wishlist", text: "What are some ones that you want to watch but haven't yet?" },
  { key: "streaming", text: "What streaming channels do you have? Would you be open to other ones?" },
];

// Shared "allowed values" for string fields that would be enums in a
// database that supports them (SQLite doesn't - see prisma/schema.prisma).
// Centralizing them here means the API routes and the UI always agree on
// what's valid.

// How many watched-and-rated titles it takes to unlock recommendations
// (both the "Generate more picks" batch and "Surprise Me" - see
// lib/recommendations.js checkRecommendationEligibility). Kept deliberately
// low so a new user gets to recommendations quickly - this is the one hard
// gate, and every place that shows it as a goal (Home, Ratings,
// Recommendations) reads this same constant, never a separately-maintained
// number that could drift.
export const RATINGS_GOAL = 5;

// NOT a gate - recommendations still work at RATINGS_GOAL, they're just
// thinner. This is a transparent, optional suggestion shown once unlocked
// ("rate a few more for noticeably better picks"), never something that
// blocks a button or fails a request.
export const RECOMMENDED_RATINGS_GOAL = 10;

export const RATING_STATUSES = ["watched", "want_to_watch", "not_interested"];

export const RATING_SOURCES = ["form", "chatbot", "preferences"];

// "surprise" = the "Surprise Me" button (lib/recommendations.js
// generateSurprisePick) - a single, deliberate stretch pick outside the
// user's usual taste, grounded in a real connecting thread rather than
// picked at random.
export const RECOMMENDATION_SOURCES = ["ai_new", "chatbot", "surprise"];

// A Recommendation is a suggestion the user hasn't decided on yet ("pending").
// Once they triage it, its status flips away from "pending" (see
// lib/recommendations.js listRecommendations, which only queries "pending")
// so it drops off the Recommendations page - "watched" and "not_interested"
// mirror what happened, "wishlisted" means it moved to the user's Wishlist
// page (see lib/questions.js RATING_STATUSES "want_to_watch" for the
// underlying Rating record, which is the source of truth for the wishlist).
export const RECOMMENDATION_STATUSES = ["pending", "watched", "not_interested", "wishlisted"];

export const TITLE_TYPES = ["movie", "tv"];

// A reasonably broad list of popular streaming services for the
// Preferences page's "add a service" UI. Per the plan doc, we're not
// limiting this to a fixed small set - this is just a helpful starting list.
export const COMMON_STREAMING_SERVICES = [
  "Netflix",
  "HBO Max",
  "Disney+",
  "Apple TV+",
  "Prime Video",
  "Hulu",
  "Paramount+",
  "Peacock",
  "Globoplay",
  "Star+",
  "Crunchyroll",
];
