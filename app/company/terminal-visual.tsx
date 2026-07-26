// A static "IT" visual built from real output/shape of this codebase — a
// terminal window plus a representative schema snippet — instead of a stock
// photo. Purely presentational, no client JS needed except the cursor blink.
export function TerminalVisual() {
  return (
    <div className="rounded-2xl bg-gray-950 ring-1 ring-white/10 shadow-xl shadow-gray-900/20 overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
        <span className="ml-2 font-mono text-[11px] text-gray-500">schema.prisma</span>
      </div>
      <div className="p-5 font-mono text-[12.5px] leading-relaxed">
        <p><span className="text-violet-400">model</span> <span className="text-blue-400">School</span> {"{"}</p>
        <p className="pl-4"><span className="text-sky-300">id</span> <span className="text-emerald-400">String</span> <span className="text-gray-500">@id @default(cuid())</span></p>
        <p className="pl-4"><span className="text-sky-300">name</span> <span className="text-emerald-400">String</span></p>
        <p className="pl-4"><span className="text-sky-300">students</span> <span className="text-emerald-400">Student[]</span></p>
        <p>{"}"}</p>
        <p className="mt-3 text-gray-600">$ next dev</p>
        <p className="text-gray-400">
          <span className="text-blue-400">▲</span> Next.js 16 <span className="text-gray-600">(Turbopack)</span>
        </p>
        <p className="text-emerald-400">
          ✓ Ready in 1.2s<span className="inline-block w-[7px] h-[13px] bg-gray-500 ml-1 align-middle animate-pulse" />
        </p>
      </div>
    </div>
  );
}
