import { NextResponse } from "next/server";
import { ensureSeeded } from "@/db/seed";
import { getSession } from "@/lib/auth";
import { getMenu } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Public read of the live menu. `?all=1` returns hidden items too (admin only). */
export async function GET(request: Request) {
  await ensureSeeded();
  const wantsAll = new URL(request.url).searchParams.get("all") === "1";
  const session = wantsAll ? await getSession() : null;
  const items = await getMenu(!(wantsAll && session));
  return NextResponse.json(
    { items, serverTime: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
