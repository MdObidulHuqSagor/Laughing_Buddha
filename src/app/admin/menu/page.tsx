import MenuManager from "@/components/admin/MenuManager";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { getMenu } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Menu management · Laughing Buddha" };

export default async function AdminMenuPage() {
  await requireAdmin();
  await ensureSeeded();
  const items = await getMenu(false);
  return <MenuManager initialItems={items} />;
}
