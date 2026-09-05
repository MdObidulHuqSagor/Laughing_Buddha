"use client";

import { FormEvent, useState } from "react";

export default function TableManager() {
  const [tableNumber, setTableNumber] = useState("");
  const [zone, setZone] = useState("Main Hall");
  const [seats, setSeats] = useState("4");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addTable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber, zone, seats }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not add table.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Could not add table. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={addTable}
      className="rounded-3xl border border-gold-500/30 bg-white p-5 shadow-sm"
    >
      <div>
        <h2 className="font-display text-xl font-semibold text-chili-900">Add a table</h2>
        <p className="mt-1 text-sm text-ink/55">Create a table and set its seating capacity.</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-ink/70">
          Table number
          <input
            required
            min="1"
            type="number"
            value={tableNumber}
            onChange={(event) => setTableNumber(event.target.value)}
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-normal outline-none focus:border-chili-500"
          />
        </label>
        <label className="text-xs font-semibold text-ink/70">
          Zone
          <input
            maxLength={100}
            value={zone}
            onChange={(event) => setZone(event.target.value)}
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-normal outline-none focus:border-chili-500"
          />
        </label>
        <label className="text-xs font-semibold text-ink/70">
          Seats
          <input
            required
            min="1"
            max="100"
            type="number"
            value={seats}
            onChange={(event) => setSeats(event.target.value)}
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-normal outline-none focus:border-chili-500"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-chili-600 px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-chili-500 disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add table"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </form>
  );
}
