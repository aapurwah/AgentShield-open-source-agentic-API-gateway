import { useRef, useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Shield } from "lucide-react";

const STATUS_CONFIG = {
  200: {
    label: "200",
    icon: CheckCircle,
    bgClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dotClass: "bg-emerald-500",
    borderClass: "border-l-emerald-500/40",
  },
  429: {
    label: "429",
    icon: XCircle,
    bgClass: "bg-red-500/10 text-red-400 border-red-500/20",
    dotClass: "bg-red-500",
    borderClass: "border-l-red-500/40",
  },
  418: {
    label: "418",
    icon: AlertTriangle,
    bgClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-500",
    borderClass: "border-l-amber-500/40",
  },
  403: {
    label: "403",
    icon: Shield,
    bgClass: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    dotClass: "bg-orange-500",
    borderClass: "border-l-orange-500/40",
  },
};

function TrafficRow({ entry, isNew }) {
  const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG[200];
  const StatusIcon = cfg.icon;
  const isError = entry.status >= 400;

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/50
        hover:bg-zinc-800/50 transition-colors duration-150
        ${isError ? `border-l-2 ${cfg.borderClass}` : "border-l-2 border-l-transparent"}
        ${isNew ? "animate-slide-in" : ""}
      `}
    >
      <span className="text-[11px] font-mono text-zinc-600 w-[130px] shrink-0">
        {entry.timestamp}
      </span>

      <span
        className={`
          inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium border
          ${cfg.bgClass}
        `}
      >
        <StatusIcon className="w-3 h-3" />
        {cfg.label}
      </span>

      <span className="text-sm font-mono text-zinc-300 truncate max-w-[200px]">
        {entry.goalId || "—"}
      </span>

      <span className="text-zinc-600 mx-1 shrink-0">→</span>

      <span className="text-xs font-mono text-zinc-400 truncate">
        <span className="text-zinc-600 mr-1">{entry.method}</span>
        {entry.endpoint}
      </span>
    </div>
  );
}

export default function TrafficFeed({ traffic }) {
  const scrollRef = useRef(null);
  const prevLengthRef = useRef(traffic.length);
  const newIdsRef = useRef(new Set());

  useEffect(() => {
    if (traffic.length > prevLengthRef.current) {
      const newCount = traffic.length - prevLengthRef.current;
      newIdsRef.current = new Set(
        traffic.slice(0, newCount).map((e) => e.id)
      );
      const timer = setTimeout(() => {
        newIdsRef.current = new Set();
      }, 350);
      prevLengthRef.current = traffic.length;
      return () => clearTimeout(timer);
    } else {
      prevLengthRef.current = traffic.length;
    }
  }, [traffic]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-white">Live Traffic</h2>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          {traffic.length} entries
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
        style={{ maxHeight: "calc(100vh - 320px)" }}
      >
        {traffic.map((entry) => (
          <TrafficRow
            key={entry.id}
            entry={entry}
            isNew={newIdsRef.current.has(entry.id)}
          />
        ))}
      </div>
    </div>
  );
}
