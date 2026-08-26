// Explicit per-pitch landing URLs (/lp/ai-picks, /lp/taste-explained,
// /lp/decision-fatigue) - for pointing a specific outbound link/campaign at
// one exact pitch, regardless of which one is currently the site's default
// (see lib/landingVariants.js DEFAULT_LANDING_VARIANT, used at "/" instead -
// app/page.js). All the actual markup/behavior lives in
// components/LandingPage.js, shared by both.

import { notFound } from "next/navigation";
import { LANDING_VARIANTS } from "@/lib/landingVariants";
import LandingPage from "@/components/LandingPage";

// Forced dynamic on purpose: the shared LandingPage component does a
// per-request auth check (redirect signed-in visitors straight to /home)
// and writes a view-tracking event on every single visit. Both need to run
// per-request, not once at build time - a generateStaticParams here would
// bake in "nobody's logged in" forever and only ever record one view total,
// ever, per variant. Do NOT add generateStaticParams without re-checking this.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const variant = LANDING_VARIANTS[params.variant];
  return { title: variant ? `CineMatch - ${variant.headline}` : "CineMatch" };
}

export default function LandingVariantPage({ params }) {
  if (!LANDING_VARIANTS[params.variant]) notFound();
  return <LandingPage variantSlug={params.variant} />;
}
