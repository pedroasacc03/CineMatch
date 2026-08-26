// Shared source of truth for the 3 landing-page pitch variants - imported by
// components/LandingPage.js (to render, at both "/" and /lp/[variant]) and
// app/api/register/route.js (to validate the ?ref= a signup claims to have
// come from, so only a real variant slug ever ends up in the signup event's
// metadata).
export const LANDING_VARIANTS = {
  "ai-picks": {
    headline: "AI picks your next watch.",
    subhead:
      "Rate a few titles you've already seen, and CineMatch's AI builds a taste profile that gets sharper every time - then tells you exactly what to watch next, and why.",
  },
  "taste-explained": {
    headline: "Your taste, finally explained.",
    subhead:
      "CineMatch reads what you've rated and shows you the real patterns behind what you love - genres, themes, even the contradictions - fully visible, fully editable, all yours.",
  },
  "decision-fatigue": {
    headline: "Stop wasting 5 days a year deciding what to watch.",
    subhead:
      "Just 20 minutes a day spent browsing adds up to 5 days a year, gone. CineMatch narrows it down to a handful of picks that actually fit you, in seconds.",
  },
};

// ---------------------------------------------------------------------------
// TO CHANGE WHICH PITCH IS THE DEFAULT (the one shown at "/", the site's
// front door): change the string below to any key from LANDING_VARIANTS
// above - "ai-picks", "taste-explained", or "decision-fatigue" - and
// nothing else. app/page.js reads this constant; it has no logic of its own
// to touch. To test a variant without changing the default for everyone,
// visit it directly at /lp/<variant> instead - all 3 always stay live at
// their own URLs regardless of what this is set to.
//
// To add a 4th pitch entirely: add a new key to LANDING_VARIANTS above
// (with its own headline/subhead), optionally point this constant at it.
// That's it - components/LandingPage.js, app/lp/[variant]/page.js, and the
// signup-attribution logic in app/api/register/route.js all read from
// LANDING_VARIANTS directly, so a new key just works everywhere.
export const DEFAULT_LANDING_VARIANT = "decision-fatigue";
