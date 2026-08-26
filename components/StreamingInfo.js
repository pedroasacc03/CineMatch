// Shows a title's streaming availability, plus a visible caveat whenever
// that data isn't confirmed for the CURRENT viewer's own region. A Title row
// is a single global cache shared by every user, keyed only on name+year -
// see lib/titles.js - so the cached list could have been looked up for a
// completely different user's region, or with no region at all (a generic,
// likely US-biased result), long before this viewer ever saw it. Rather than
// silently presenting that as accurate, this flags the uncertainty so the
// user knows to double-check. `userRegion` is the viewer's own User.location.
export default function StreamingInfo({ title, userRegion }) {
  if (!title) return null;

  const list = title.streamingAvailability || [];
  const lookedUpRegion = title.streamingRegion;
  const regionsMatch =
    lookedUpRegion && userRegion && lookedUpRegion.trim().toLowerCase() === userRegion.trim().toLowerCase();

  let warning = null;
  if (list.length > 0 && !regionsMatch) {
    if (!lookedUpRegion) {
      warning = "Not confirmed for a specific region (may default to the US) - verify it's actually available where you are.";
    } else if (!userRegion) {
      warning = `Checked for ${lookedUpRegion}. Set your region on the My Preferences page to get availability confirmed for you.`;
    } else {
      warning = `Checked for ${lookedUpRegion}, not your region (${userRegion}) - verify before assuming it's available.`;
    }
  }

  return (
    <>
      <p className="muted">{list.length ? list.join(", ") : "Streaming availability unknown"}</p>
      {warning && (
        <p className="muted" style={{ color: "var(--color-danger-700)" }}>
          <strong>Note:</strong> {warning}
        </p>
      )}
    </>
  );
}
