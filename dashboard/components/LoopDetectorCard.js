import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

export default function LoopDetectorCard({ loops }) {
  const hasLoops = loops.length > 0;

  return (
    <div
      className={`
        rounded-xl border p-5 transition-colors duration-300
        ${hasLoops ? "border-amber-500/30 bg-amber-500/5" : "border-zinc-800 bg-zinc-900"}
      `}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className={`flex items-center justify-center w-7 h-7 rounded-lg border ${
            hasLoops
              ? "bg-amber-500/10 border-amber-500/20"
              : "bg-zinc-800 border-zinc-700/50"
          }`}
        >
          <AlertTriangle
            className={`w-3.5 h-3.5 ${hasLoops ? "text-amber-400" : "text-zinc-600"}`}
          />
        </div>
        <h2 className="text-sm font-semibold text-white">Loop Detection</h2>
        {hasLoops && (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
            {loops.length}
          </span>
        )}
      </div>

      {!hasLoops ? (
        <div className="flex items-center gap-2 py-4">
          <CheckCircle2 className="w-4 h-4 text-zinc-700" />
          <span className="text-sm text-zinc-600">No loops detected</span>
        </div>
      ) : (
        <div className="space-y-2">
          {loops.map((loop, i) => (
            <div
              key={`${loop.taskId}-${i}`}
              className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-slide-in"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-mono text-amber-300 font-medium">
                    {loop.taskId}
                  </span>
                  <ArrowRight className="w-3 h-3 text-amber-600" />
                  <span className="text-xs font-mono text-amber-400/80 truncate">
                    {loop.endpoint}
                  </span>
                </div>
                <p className="text-[11px] text-amber-400/60 mt-1">
                  Hit endpoint {loop.hits} times in 5s — stuck loop assumed
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
