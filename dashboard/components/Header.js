import { Shield, AlertTriangle } from "lucide-react";

export default function Header({ systemStatus }) {
  const isUnderAttack = systemStatus === "under_attack";

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Shield className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">
            AgentShield
          </h1>
          <p className="text-xs text-zinc-500 -mt-0.5">Agentic API Gateway</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isUnderAttack ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-sm font-medium text-red-400">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Under Attack
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-sm font-medium text-emerald-400">System Normal</span>
          </div>
        )}
        <div className="text-xs text-zinc-600 font-mono">
          v0.1.0
        </div>
      </div>
    </header>
  );
}
