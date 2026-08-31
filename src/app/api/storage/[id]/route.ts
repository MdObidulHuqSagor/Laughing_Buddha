import { eq } from "drizzle-orm";
import { db } from "@/db";
import { storageObjects } from "@/db/schema";

export const dynamic = "force-dynamic";

/** Public read of the `menu-images` bucket. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const [object] = await db
    .select()
    .from(storageObjects)
    .where(eq(storageObjects.id, id))
    .limit(1);

  if (!object) return new Response("Not found", { status: 404 });

  const bytes = Buffer.from(object.data, "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": object.mimeType,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
