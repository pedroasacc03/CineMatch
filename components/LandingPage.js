// The actual landing-page markup and behavior, shared by two callers:
//   - app/page.js renders this at "/" using the default pitch (see
//     lib/landingVariants.js DEFAULT_LANDING_VARIANT) - the site's front
//     door, what a brand-new visitor sees before login/register.
//   - app/lp/[variant]/page.js renders this at /lp/<variant> for pointing a
//     specific outbound link/campaign at one exact pitch, regardless of
//     what the current default is.
// Both pass a `variantSlug` - a valid key in LANDING_VARIANTS - and get
// identical behavior: redirect a signed-in visitor straight to /home,
// record a "landing_view" event, and render the pitch. The caller is
// responsible for validating the slug (e.g. 404ing) before rendering this;
// it assumes `variantSlug` is already valid.
//
// Every "Get started" link carries ?ref=<variant> through to /register,
// which threads it into the signup event's metadata (see
// app/register/page.js and app/api/register/route.js) - that's what lets
// app/admin/metrics/page.js show views vs. signups per variant, whether the
// visit came from "/" or an explicit /lp/<variant> link.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { trackAnonymousEvent } from "@/lib/events";
import { LANDING_VARIANTS } from "@/lib/landingVariants";

export default async function LandingPage({ variantSlug }) {
  const variant = LANDING_VARIANTS[variantSlug];

  // A signed-in visitor doesn't need the pitch - send them straight in.
  const user = await getCurrentUser();
  if (user) redirect("/home");

  await trackAnonymousEvent("landing_view", { variant: variantSlug }).catch((err) => {
    console.error("Failed to track landing_view:", err.message);
  });

  const registerHref = `/register?ref=${variantSlug}`;

  return (
    <div>
      <div className="landing-nav">
        <span className="brand">CineMatch</span>
        <Link href="/login">Log in</Link>
      </div>

      <div className="landing-hero">
        <h1>{variant.headline}</h1>
        <p>{variant.subhead}</p>
        <div className="landing-cta-row">
          <Link href={registerHref} className="btn btn-primary">
            Get started free
          </Link>
          <Link href="/login" className="btn btn-outline">
            Log in
          </Link>
        </div>
      </div>

      <div className="landing-section">
        <h2>How it works</h2>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-number">1</div>
            <h3>Rate what you&apos;ve watched</h3>
            <p className="muted">A star rating and a quick &quot;why&quot; - that&apos;s all the AI needs.</p>
          </div>
          <div className="landing-step">
            <div className="landing-step-number">2</div>
            <h3>AI builds your taste profile</h3>
            <p className="muted">
              Genres, themes, favorite creators, even your contradictions - fully visible and editable.
            </p>
          </div>
          <div className="landing-step">
            <div className="landing-step-number">3</div>
            <h3>Get picks that actually fit</h3>
            <p className="muted">Personalized recommendations with a plain-English reason for each one.</p>
          </div>
        </div>
      </div>

      <div className="landing-section">
        <h2>What you get</h2>
        <div className="landing-feature-grid">
          <div className="landing-feature-card">
            <h3>A taste profile you can read</h3>
            <p className="muted">Not a black box - see exactly what the AI thinks you like, and correct it anytime.</p>
          </div>
          <div className="landing-feature-card">
            <h3>Surprise Me</h3>
            <p className="muted">
              One deliberate stretch pick outside your comfort zone, with a real reason it might work for you.
            </p>
          </div>
          <div className="landing-feature-card">
            <h3>Streaming availability</h3>
            <p className="muted">Region-aware, so you know where to actually watch a pick before you commit.</p>
          </div>
          <div className="landing-feature-card">
            <h3>Ask, don&apos;t scroll</h3>
            <p className="muted">Tell the chatbot your mood and get a pick on the spot.</p>
          </div>
        </div>
      </div>

      <div className="landing-cta-section">
        <h2>{variant.headline}</h2>
        <Link href={registerHref} className="btn btn-primary">
          Get started free
        </Link>
      </div>

      <div className="landing-footer">
        <Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Service</Link>
      </div>
    </div>
  );
}
