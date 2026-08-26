// Gate for the internal metrics page (app/admin/metrics/page.js). No DB
// flag/schema change - just a comma-separated allowlist of emails in
// ADMIN_EMAILS (see .env.example), since this app has no broader concept of
// user roles and one wasn't worth adding just for this.

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdmin(user) {
  return !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
}
