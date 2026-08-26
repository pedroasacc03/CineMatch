// Helpers for reading "who is logged in" from the session cookie.
//
// Next.js App Router runs Server Components and Route Handlers in a real
// Node.js environment (not the Edge runtime), so it's safe to use Node's
// `crypto` module here. We deliberately do NOT use Next.js "middleware.js"
// for auth, because middleware runs on the Edge runtime by default, which
// does not support Node's crypto module - keeping auth checks in normal
// server components/route handlers avoids that whole class of problem.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

// Use in Server Components / pages. Returns the logged-in User, or null.
export async function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  return user;
}

// Use at the top of a protected page's Server Component. Redirects to
// /login if nobody is signed in, otherwise returns the current user.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

// Use inside app/api/**/route.js handlers, which get a standard `Request`
// object instead of access to next/headers' cookies().
export async function getCurrentUserFromRequest(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  const token = match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;

  const session = verifySessionToken(token);
  if (!session) return null;

  return prisma.user.findUnique({ where: { id: session.userId } });
}
