import { NextResponse } from "next/server";
import { db } from "@/db";
import { storageObjects } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

/**
 * Upload a dish photo. Mirrors a Supabase Storage upload into the
 * `menu-images` bucket; here the bytes land in the `storage_objects`
 * table and are served back from /api/storage/[id].
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Use a JPG, PNG, WEBP or GIF image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be smaller than 4 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = (file.name || "dish").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-60);

  const [saved] = await db
    .insert(storageObjects)
    .values({
      bucket: "menu-images",
      path: `${Date.now()}-${safeName}`,
      mimeType: file.type,
      data: buffer.toString("base64"),
    })
    .returning({ id: storageObjects.id, path: storageObjects.path });

  return NextResponse.json({ url: `/api/storage/${saved.id}`, path: saved.path });
}
