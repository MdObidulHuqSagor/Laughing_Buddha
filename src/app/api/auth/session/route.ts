import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Lets the login form confirm the browser actually stored and returned the
 * session cookie before it navigates to the dashboard. If this says
 * `authenticated: false` right after a successful login, the browser is
 * blocking the cookie (usually third-party cookie blocking in an iframe).
 */
export async function GET() {
  const session = await getSession();
  return NextResponse.json(
    session
      ? { authenticated: true, user: { email: session.email, fullName: session.fullName } }
      : { authenticated: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
