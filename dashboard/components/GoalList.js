import { Target } from "lucide-react";

function GoalRow({ goal }) {
  const pct = Math.min((goal.rpm / 1000) * 100, 100);
  const isNearLimit = goal.rpm >= 900;
  const isOverLimit = goal.rpm >= 1000;

  let barColor = "bg-emerald-500";
  if (isOverLimit) barColor = "bg-red-500";
  else if (isNearLimit) barColor = "bg-amber-500";

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono text-zinc-400 truncate max-w-[160px]">
          {goal.id}
        </span>
        <span
          className={`text-xs font-mono font-semibold tabular-nums ${
            isOverLimit ? "text-red-400" : isNearLimit ? "text-amber-400" : "text-zinc-300"
          }`}
        >
          {goal.rpm} RPM
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

export default function GoalList({ goals }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Target className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <h2 className="text-sm font-semibold text-white">Active Goals</h2>
      </div>

      <div className="divide-y divide-zinc-800/50">
        {goals.map((goal) => (
          <GoalRow key={goal.id} goal={goal} />
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center justify-between">
        <span className="text-[11px] text-zinc-500">Burst limit per goal</span>
        <span className="text-[11px] font-mono text-zinc-400">1,000 RPM</span>
      </div>
    </div>
  );
}
