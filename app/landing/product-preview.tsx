// A real school-admin dashboard screenshot framed inside a CSS-only MacBook
// shell (bezel + camera notch + base) — no image-generation, no live/
// authenticated iframe, just our own device chrome around a real screen grab.
export function ProductPreview() {
  return (
    <div className="mx-auto w-full max-w-[440px]">
      {/* Laptop lid: bezel + camera notch wrapping the screen */}
      <div className="rounded-t-2xl rounded-b-md bg-gradient-to-b from-gray-800 via-gray-900 to-gray-950 p-2 sm:p-2.5 shadow-2xl shadow-indigo-900/25 ring-1 ring-black/40">
        <div className="flex justify-center pb-1.5 sm:pb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-600 ring-2 ring-gray-800" />
        </div>

        <div className="rounded-lg overflow-hidden ring-1 ring-black/30 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/dashboard-screenshot.png"
            alt="iSMS school admin dashboard"
            className="w-full h-auto block"
          />
        </div>
      </div>

      {/* Laptop base: hinge sliver + a wider keyboard-deck edge peeking out */}
      <div className="relative mx-[-6px] sm:mx-[-10px] h-3 sm:h-3.5 rounded-b-xl bg-gradient-to-b from-gray-300 to-gray-400 shadow-md">
        <div className="absolute left-1/2 top-0 h-1 w-14 sm:w-20 -translate-x-1/2 rounded-b-md bg-gray-500/50" />
      </div>
      <div className="mx-auto mt-1.5 h-1.5 w-[85%] rounded-b-full bg-black/10 blur-sm" />
    </div>
  );
}
