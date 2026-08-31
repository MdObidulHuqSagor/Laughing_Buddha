"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, formatMoney } from "@/lib/constants";
import type { MenuItemDTO } from "@/lib/queries";

type Draft = {
  id?: string;
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
};

const emptyDraft: Draft = {
  name: "",
  description: "",
  price: "",
  category: CATEGORIES[0],
  imageUrl: "",
  isAvailable: true,
};

export default function MenuManager({ initialItems }: { initialItems: MenuItemDTO[] }) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [availability, setAvailability] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<MenuItemDTO | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    const res = await fetch("/api/admin/menu", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { items: MenuItemDTO[] };
      setItems(data.items);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesTerm =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term);
      const matchesCategory = category === "All" || item.category === category;
      const matchesAvailability =
        availability === "all" ||
        (availability === "in" && item.isAvailable) ||
        (availability === "out" && !item.isAvailable);
      return matchesTerm && matchesCategory && matchesAvailability;
    });
  }, [items, search, category, availability]);

  async function toggleAvailability(item: MenuItemDTO) {
    setBusyId(item.id);
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, isAvailable: !row.isAvailable } : row)),
    );
    const res = await fetch(`/api/admin/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    setBusyId(null);
    if (res.ok) {
      setToast(
        `${item.name} is now ${!item.isAvailable ? "in stock — visible on guest menus" : "sold out — hidden from guest menus"}`,
      );
    } else {
      await refresh();
      setToast("Could not update availability.");
    }
  }

  async function remove(item: MenuItemDTO) {
    setBusyId(item.id);
    const res = await fetch(`/api/admin/menu/${item.id}`, { method: "DELETE" });
    setBusyId(null);
    setDeleting(null);
    if (res.ok) {
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      setToast(`${item.name} deleted.`);
    } else {
      setToast("Delete failed.");
    }
  }

  const outOfStock = items.filter((item) => !item.isAvailable).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-chili-900">Menu management</h1>
          <p className="mt-1 text-sm text-ink/55">
            {items.length} dishes · {outOfStock} sold out. Availability changes reach guest phones
            within seconds.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDraft({ ...emptyDraft })}
          className="rounded-full bg-chili-600 px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-chili-500"
        >
          + Add dish
        </button>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or description…"
          className="min-w-[14rem] flex-1 rounded-xl border border-black/10 px-3.5 py-2 text-sm focus:border-chili-500 focus:outline-none"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-chili-500 focus:outline-none"
        >
          <option value="All">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={availability}
          onChange={(event) => setAvailability(event.target.value)}
          className="rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-chili-500 focus:outline-none"
        >
          <option value="all">Any availability</option>
          <option value="in">In stock</option>
          <option value="out">Sold out</option>
        </select>
      </div>

      {toast && (
        <p className="animate-rise rounded-2xl border border-gold-500/40 bg-gold-200/40 px-4 py-3 text-sm text-chili-900">
          {toast}
        </p>
      )}

      <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#fbf8f3] text-[11px] tracking-wider text-ink/50 uppercase">
            <tr>
              <th className="px-4 py-3">Dish</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Guest menu</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center">
                  <p className="text-ink/45">
                    {items.length === 0
                      ? "Your menu is empty."
                      : "No dishes match these filters."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...emptyDraft })}
                    className="mt-4 rounded-full bg-chili-600 px-5 py-2.5 text-sm font-semibold text-cream hover:bg-chili-500"
                  >
                    {items.length === 0 ? "Add your first dish" : "Add a new dish"}
                  </button>
                </td>
              </tr>
            )}
            {filtered.map((item) => (
              <tr key={item.id} className="border-t border-black/5 align-middle">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-chili-50">
                        🍛
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{item.name}</p>
                      <p className="line-clamp-1 max-w-sm text-xs text-ink/50">
                        {item.description || "—"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink/70">{item.category}</td>
                <td className="px-4 py-3 font-semibold text-chili-700">
                  {formatMoney(item.price)}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => toggleAvailability(item)}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                      item.isAvailable
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                    }`}
                  >
                    <span
                      className={`h-3.5 w-6 rounded-full p-0.5 transition ${
                        item.isAvailable ? "bg-emerald-500" : "bg-neutral-400"
                      }`}
                    >
                      <span
                        className={`block h-2.5 w-2.5 rounded-full bg-white transition ${
                          item.isAvailable ? "translate-x-2.5" : ""
                        }`}
                      />
                    </span>
                    {item.isAvailable ? "Visible" : "Hidden"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          id: item.id,
                          name: item.name,
                          description: item.description,
                          price: String(item.price),
                          category: item.category,
                          imageUrl: item.imageUrl ?? "",
                          isAvailable: item.isAvailable,
                        })
                      }
                      className="rounded-full border border-chili-600/25 px-3.5 py-1.5 text-[11px] font-semibold text-chili-700 hover:bg-chili-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      title="Create a copy to edit as a new dish"
                      onClick={() =>
                        setDraft({
                          name: `${item.name} (copy)`,
                          description: item.description,
                          price: String(item.price),
                          category: item.category,
                          imageUrl: item.imageUrl ?? "",
                          isAvailable: item.isAvailable,
                        })
                      }
                      className="rounded-full border border-black/15 px-3.5 py-1.5 text-[11px] font-semibold text-ink/60 hover:bg-black/5"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(item)}
                      className="rounded-full border border-red-300 px-3.5 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {draft && (
        <DishDialog
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={async (message) => {
            setDraft(null);
            await refresh();
            setToast(message);
          }}
        />
      )}

      {deleting && (
        <Modal onClose={() => setDeleting(null)}>
          <h2 className="font-display text-2xl font-semibold text-chili-900">Delete dish?</h2>
          <p className="mt-3 text-sm text-ink/70">
            <strong>{deleting.name}</strong> will be removed from the menu permanently. Past orders
            keep their record.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-ink/70"
            >
              Keep it
            </button>
            <button
              type="button"
              disabled={busyId === deleting.id}
              onClick={() => remove(deleting)}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
            >
              Yes, delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DishDialog({
  draft,
  onClose,
  onSaved,
}: {
  draft: Draft;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState<Draft>(draft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body });
    const data = (await res.json()) as { url?: string; error?: string };
    setUploading(false);
    if (!res.ok || !data.url) {
      setError(data.error ?? "Upload failed.");
      return;
    }
    update("imageUrl", data.url);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      category: form.category,
      imageUrl: form.imageUrl,
      isAvailable: form.isAvailable,
    };
    const res = await fetch(form.id ? `/api/admin/menu/${form.id}` : "/api/admin/menu", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save the dish.");
      return;
    }
    onSaved(form.id ? `${form.name} updated.` : `${form.name} added to the menu.`);
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={save}>
        <h2 className="font-display text-2xl font-semibold text-chili-900">
          {form.id ? "Edit dish" : "Add a dish"}
        </h2>
        <p className="mt-1 text-xs text-ink/50">
          Type the details in by hand — only name, price and category are required. A photo is
          optional; dishes without one show a placeholder on the guest menu.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-semibold tracking-wider text-ink/60 uppercase">
              Name
            </span>
            <input
              required
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-chili-500 focus:outline-none"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-[11px] font-semibold tracking-wider text-ink/60 uppercase">
              Description
            </span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-chili-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold tracking-wider text-ink/60 uppercase">
              Price (BDT)
            </span>
            <input
              required
              type="number"
              min="1"
              step="1"
              value={form.price}
              onChange={(event) => update("price", event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-chili-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold tracking-wider text-ink/60 uppercase">
              Category
            </span>
            <select
              value={form.category}
              onChange={(event) => update("category", event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-chili-500 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2">
            <span className="text-[11px] font-semibold tracking-wider text-ink/60 uppercase">
              Photo <span className="text-ink/35 normal-case">— optional, bucket: menu-images</span>
            </span>
            <div className="mt-1.5 flex items-center gap-3">
              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt="preview"
                  className="h-20 w-20 rounded-xl object-cover"
                />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-xl bg-chili-50 text-2xl">
                  🍛
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload(file);
                  }}
                  className="w-full text-xs"
                />
                <input
                  value={form.imageUrl}
                  onChange={(event) => update("imageUrl", event.target.value)}
                  placeholder="…or paste an image URL"
                  className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-xs focus:border-chili-500 focus:outline-none"
                />
                {uploading && <p className="mt-1 text-[11px] text-chili-600">Uploading…</p>}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={(event) => update("isAvailable", event.target.checked)}
              className="h-4 w-4 accent-chili-600"
            />
            <span className="text-sm text-ink/75">
              In stock — show this dish on guest menus right now
            </span>
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-ink/70"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-full bg-chili-600 px-5 py-2 text-sm font-semibold text-cream hover:bg-chili-500 disabled:opacity-60"
          >
            {saving ? "Saving…" : form.id ? "Save changes" : "Add dish"}
          </button>
        </div>
      </form>
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
      <div className="animate-rise max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
