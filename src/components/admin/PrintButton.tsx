"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-chili-600 px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-chili-500"
    >
      Print QR cards
    </button>
  );
}
