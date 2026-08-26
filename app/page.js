// The root route ("/") - the site's front door. Signed-in visitors get sent
// straight to /home (handled inside LandingPage below); everyone else sees
// the marketing landing page for the current DEFAULT_LANDING_VARIANT
// (lib/landingVariants.js) - the pitch shown here first, before login/
// register, the way most marketing sites lead with a pitch rather than a
// bare login form. To change which pitch is the default, edit
// DEFAULT_LANDING_VARIANT in lib/landingVariants.js - nothing here needs to
// change. The other 2 pitches stay reachable at /lp/<variant> regardless.

import { DEFAULT_LANDING_VARIANT } from "@/lib/landingVariants";
import LandingPage from "@/components/LandingPage";

// Forced dynamic for the same reason as app/lp/[variant]/page.js: the
// shared LandingPage component does a per-request auth check and writes a
// view-tracking event on every visit - both need to run per-request, not
// be baked into a static build.
export const dynamic = "force-dynamic";

export default function RootPage() {
  return <LandingPage variantSlug={DEFAULT_LANDING_VARIANT} />;
}
