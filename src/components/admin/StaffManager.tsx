"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import type { StaffDTO } from "@/app/api/admin/staff/route";

function randomPassword() {
  const words = ["thai", "basil", "chilli", "mango", "suki", "lotus", "ginger", "coconut"];
  const word = words[Math.floor(Math.random() * words.length)];
  return `${word}${Math.floor(1000 + Math.random() * 9000)}!`;
}

export default function StaffManager({
  initialStaff,
  currentEmail,
}: {
  initialStaff: StaffDTO[];
  currentEmail: string;
}) {
  const [staff, setStaff] = useState(initialStaff);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [resetFor, setResetFor] = useState<StaffDTO | null>(null);
  const [deleting, setDeleting] = useState<StaffDTO | null>(null);

  const [form, setForm] = useState({ fullName: "", email: "", password: randomPassword(), role: "staff", permissions: "orders" });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function refresh() {
    const res = await fetch("/api/admin/staff", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { staff: StaffDTO[] };
      setStaff(data.staff);
    }
  }

  async function addStaff(event: React.FormEvent) {
    event.preventDefault();
    setBusy("new");
    setError(null);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        permissions: form.permissions.split(",").map((permission) => permission.trim()).filter(Boolean),
      }),
    });
    const data = (await res.json()) as { error?: string };
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Could not create the login.");
      return;
    }
    setToast(
      `Login created for ${form.email}. Share this password with them now — it is not shown again: ${form.password}`,
    );
    setForm({ fullName: "", email: "", password: randomPassword(), role: "staff", permissions: "orders" });
    setAdding(false);
    await refresh();
  }

  async function resetPassword(member: StaffDTO, password: string) {
    setBusy(member.id);
    setError(null);
    const res = await fetch(`/api/admin/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = (await res.json()) as { error?: string };
    setBusy(null);
    setResetFor(null);
    if (!res.ok) {
      setError(data.error ?? "Could not reset the password.");
      return;
    }
    setToast(`New password for ${member.email}: ${password} — they were signed out everywhere.`);
    await refresh();
  }

  async function removeStaff(member: StaffDTO) {
    setBusy(member.id);
    setError(null);
    const res = await fetch(`/api/admin/staff/${member.id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    setBusy(null);
    setDeleting(null);
    if (!res.ok) {
      setError(data.error ?? "Could not remove the login.");
      return;
    }
    setToast(`${member.email} can no longer sign in.`);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-4">
          <LogoMark size={54} rounded="rounded-2xl" className="hidden sm:inline-grid" />
          <div>
            <h1 className="font-display text-3xl font-semibold text-chili-900">Staff logins</h1>
            <p className="mt-1 text-sm text-ink/55">
              {staff.length} {staff.length === 1 ? "account" : "accounts"} can open this console,
              take orders through and manage the menu.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setAdding((prev) => !prev);
            setError(null);
          }}
          className="rounded-full bg-chili-600 px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-chili-500"
        >
          {adding ? "Close form" : "+ Add staff login"}
        </button>
      </div>

      {toast && (
        <p className="animate-rise rounded-2xl border border-gold-500/40 bg-gold-200/40 px-4 py-3 text-sm break-words text-chili-900">
          {toast}
        </p>
      )}
      {error && (
        <p className="animate-rise rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {adding && (
        <form
          onSubmit={addStaff}
          className="animate-rise rounded-3xl border border-black/5 bg-white p-6 shadow-sm"
        >
          <h2 className="font-display text-xl font-semibold text-chili-900">
            Create a staff login
          </h2>
          <p className="mt-1 text-xs text-ink/50">
            They sign in at <span className="font-mono">/admin/login</span> with this email and
            password.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-5">
            <label className="block">
              <span className="text-[11px] font-semibold tracking-wider text-ink/60 uppercase">
                Full name
              </span>
              <input
                required
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                placeholder="Rifat Hasan — Floor manager"
                className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-chili-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold tracking-wider text-ink/60 uppercase">Permissions</span>
              <input value={form.permissions} onChange={(event) => setForm({ ...form, permissions: event.target.value })} placeholder="orders,menu,reports" className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold tracking-wider text-ink/60 uppercase">Role</span>
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm">
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="kitchen">Kitchen</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold tracking-wider text-ink/60 uppercase">
                Email
              </span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="rifat@laughingbuddha.com.bd"
                className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-chili-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold tracking-wider text-ink/60 uppercase">
                Temporary password
              </span>
              <div className="mt-1.5 flex gap-2">
                <input
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 font-mono text-sm focus:border-chili-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, password: randomPassword() })}
                  className="shrink-0 rounded-xl border border-black/10 px-3 text-xs font-semibold text-ink/60 hover:bg-black/5"
                >
                  New
                </button>
              </div>
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-ink/70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy === "new"}
              className="rounded-full bg-chili-600 px-5 py-2 text-sm font-semibold text-cream hover:bg-chili-500 disabled:opacity-60"
            >
              {busy === "new" ? "Creating…" : "Create login"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#fbf8f3] text-[11px] tracking-wider text-ink/50 uppercase">
            <tr>
              <th className="px-4 py-3">Staff member</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3">Signed in</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id} className="border-t border-black/5">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-chili-50 text-xs font-bold text-chili-700">
                      {member.fullName.slice(0, 2).toUpperCase()}
                    </span>
                    <span>
                      <span className="block font-semibold text-ink">{member.fullName}</span>
                      {member.email === currentEmail && (
                        <span className="text-[11px] text-emerald-700">that&apos;s you</span>
                      )}
                      <span className="block text-[10px] text-ink/40">{member.permissions.join(", ") || "no permissions"}</span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink/70">{member.email}</td>
                <td className="px-4 py-3 text-xs font-semibold capitalize text-chili-700">{member.role}</td>
                <td className="px-4 py-3 text-xs text-ink/55">
                  {new Date(member.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  {member.activeSessions > 0 ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                      {member.activeSessions} active
                    </span>
                  ) : (
                    <span className="text-[11px] text-ink/40">signed out</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => setResetFor(member)}
                      className="rounded-full border border-chili-600/25 px-3.5 py-1.5 text-[11px] font-semibold text-chili-700 hover:bg-chili-50"
                    >
                      Reset password
                    </button>
                    <button
                      type="button"
                      disabled={member.isSelf || staff.length <= 1}
                      onClick={() => setDeleting(member)}
                      className="rounded-full border border-red-300 px-3.5 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink/45">
        Every account here has full access: live orders, reservations and menu management. Passwords
        are stored as salted scrypt hashes — nobody, including you, can read them back, so use
        “Reset password” if someone forgets theirs.
      </p>

      {resetFor && (
        <ResetDialog
          member={resetFor}
          busy={busy === resetFor.id}
          onClose={() => setResetFor(null)}
          onConfirm={(password) => resetPassword(resetFor, password)}
        />
      )}

      {deleting && (
        <Modal onClose={() => setDeleting(null)}>
          <h2 className="font-display text-2xl font-semibold text-chili-900">Remove this login?</h2>
          <p className="mt-3 text-sm text-ink/70">
            <strong>{deleting.fullName}</strong> ({deleting.email}) will be signed out immediately
            and will no longer be able to open the console.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-ink/70"
            >
              Keep access
            </button>
            <button
              type="button"
              disabled={busy === deleting.id}
              onClick={() => removeStaff(deleting)}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
            >
              Yes, remove
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ResetDialog({
  member,
  busy,
  onClose,
  onConfirm,
}: {
  member: StaffDTO;
  busy: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
}) {
  const [password, setPassword] = useState(randomPassword());

  return (
    <Modal onClose={onClose}>
      <h2 className="font-display text-2xl font-semibold text-chili-900">Reset password</h2>
      <p className="mt-2 text-sm text-ink/70">
        Set a new password for <strong>{member.fullName}</strong>. All of their existing sessions
        are ended.
      </p>
      <div className="mt-5 flex gap-2">
        <input
          value={password}
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 font-mono text-sm focus:border-chili-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setPassword(randomPassword())}
          className="shrink-0 rounded-xl border border-black/10 px-3 text-xs font-semibold text-ink/60 hover:bg-black/5"
        >
          New
        </button>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-ink/70"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy || password.length < 8}
          onClick={() => onConfirm(password)}
          className="rounded-full bg-chili-600 px-5 py-2 text-sm font-semibold text-cream hover:bg-chili-500 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Set password"}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="animate-rise w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
