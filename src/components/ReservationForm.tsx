"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoLockup } from "@/components/Logo";

const TIMES = [
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
];

type Confirmation = {
  id: string;
  name: string;
  date: string;
  time: string;
  guests: number;
};

export default function ReservationForm() {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    date: today,
    time: "19:30",
    guests: "2",
    specialRequest: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const update = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setErrors({});
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, guests: Number(form.guests) }),
      });
      const data = (await res.json()) as {
        booking?: Confirmation;
        error?: string;
        errors?: Record<string, string>;
      };
      if (!res.ok || !data.booking) {
        setError(data.error ?? "Could not save the booking.");
        setErrors(data.errors ?? {});
        return;
      }
      setConfirmation(data.booking);
    } catch {
      setError("Network hiccup — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <div className="animate-rise rounded-3xl border border-gold-500/40 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto w-fit rounded-2xl bg-black px-6 py-2 ring-1 ring-gold-500/40">
          <LogoLockup width={150} />
        </div>
        <h2 className="font-display mt-5 text-3xl font-semibold text-chili-900">
          Table requested
        </h2>
        <p className="mt-3 text-sm text-ink/70">
          Khob khun ka, {confirmation.name}! We have your request for{" "}
          <strong>
            {confirmation.guests} {confirmation.guests === 1 ? "guest" : "guests"}
          </strong>{" "}
          on{" "}
          <strong>
            {new Date(`${confirmation.date}T00:00:00`).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </strong>{" "}
          at <strong>{confirmation.time}</strong>.
        </p>
        <p className="mt-4 rounded-2xl bg-chili-50 px-4 py-3 text-xs text-chili-700">
          Reference #{confirmation.id.slice(0, 8).toUpperCase()} — our host will call you within 15
          minutes to confirm. Tables are held for 15 minutes past the booking time.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/menu"
            className="rounded-full bg-chili-600 px-5 py-2.5 text-sm font-semibold text-cream"
          >
            Pre-read the menu
          </Link>
          <button
            type="button"
            onClick={() => setConfirmation(null)}
            className="rounded-full border border-chili-600/25 px-5 py-2.5 text-sm font-semibold text-chili-700"
          >
            Book another table
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-black/5 bg-white p-6 shadow-xl sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.name}>
          <input
            required
            value={form.name}
            onChange={(event) => update("name")(event.target.value)}
            placeholder="Nusrat Jahan"
            className="input"
          />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <input
            required
            value={form.phone}
            onChange={(event) => update("phone")(event.target.value)}
            placeholder="+8801XXXXXXXXX"
            inputMode="tel"
            className="input"
          />
        </Field>
        <Field label="Date" error={errors.date}>
          <input
            required
            type="date"
            min={today}
            value={form.date}
            onChange={(event) => update("date")(event.target.value)}
            className="input"
          />
        </Field>
        <Field label="Time" error={errors.time}>
          <select
            value={form.time}
            onChange={(event) => update("time")(event.target.value)}
            className="input"
          >
            {TIMES.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Guests" error={errors.guests}>
          <select
            value={form.guests}
            onChange={(event) => update("guests")(event.target.value)}
            className="input"
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((n) => (
              <option key={n} value={String(n)}>
                {n} {n === 1 ? "guest" : "guests"}
              </option>
            ))}
            <option value="14">14+ (private room)</option>
          </select>
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Special request" hint="optional">
          <textarea
            rows={3}
            value={form.specialRequest}
            onChange={(event) => update("specialRequest")(event.target.value)}
            placeholder="Hotpot bar seats, birthday cake service, high chair, nut allergy…"
            className="input"
          />
        </Field>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-full bg-chili-600 py-3.5 text-sm font-semibold tracking-wide text-cream uppercase transition hover:bg-chili-500 disabled:opacity-60"
      >
        {submitting ? "Sending request…" : "Request this table"}
      </button>
      <p className="mt-3 text-center text-[11px] text-ink/45">
        We text the owner instantly and call you back to confirm. No deposit needed.
      </p>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.85rem;
          border: 1px solid rgba(0,0,0,0.12);
          background: #fff;
          padding: 0.7rem 0.9rem;
          font-size: 0.9rem;
          outline: none;
        }
        .input:focus { border-color: #a11d2b; box-shadow: 0 0 0 3px rgba(161,29,43,0.1); }
      `}</style>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-4 block first:mt-0 sm:mt-0">
      <span className="mb-1.5 flex items-baseline gap-2">
        <span className="text-xs font-semibold tracking-wider text-ink/70 uppercase">{label}</span>
        {hint && <span className="text-[10px] text-ink/40">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-red-600">{error}</span>}
    </label>
  );
}
