import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { ensureSeeded } from "@/db/seed";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Staff login · Laughing Buddha" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await ensureSeeded();
  const session = await getSession();
  const { next } = await searchParams;
  if (session) redirect(next && next.startsWith("/admin") ? next : "/admin");

  return (
    <div className="grid min-h-screen place-items-center px-5 py-16">
      <LoginForm next={next && next.startsWith("/admin") ? next : "/admin"} />
    </div>
  );
}
