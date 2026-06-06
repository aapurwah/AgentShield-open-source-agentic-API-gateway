import React from "react";
import {
  LineChart,
  Line,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

function Sparkline({ data = [], color = "#60a5fa" }) {
  const points = (data || []).map((v, i) => ({ i, v }));
  return (
    <div style={{ width: 300, height: 60 }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 2, right: 4, left: 0, bottom: 2 }}>
          <XAxis dataKey="i" hide />
          <YAxis hide domain={[0, 'dataMax']} />
          <ReTooltip formatter={(value) => [value, "count"]} />
          <Line type="monotone" dataKey="v" stroke={color} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatusTimeline({ traffic = [] }) {
  const recent = traffic.slice(0, 32).reverse();
  const getColor = (s) => {
    if (s >= 500) return "bg-red-600";
    if (s >= 400) return "bg-amber-500";
    if (s === 429) return "bg-red-500";
    if (s === 418) return "bg-amber-400";
    return "bg-emerald-500";
  };

  return (
    <div className="flex items-end gap-0.5 h-12">
      {recent.map((t) => (
        <div
          key={t.id || `${t.timestamp}-${t.path}`}
          title={`${t.timestamp} ${t.path || t.endpoint} ${t.status}`}
          className={`${getColor(t.status)} rounded-sm`} 
          style={{ width: 6, height: `${Math.min(100, 10 + (t.status >= 400 ? 28 : 8))}%` }}
        />
      ))}
    </div>
  );
}

export default function AgentVisualizer({ metrics = {}, traffic = [] }) {
  const { sparklineData = {} } = metrics || {};

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Agent Visualizer</h3>
        <span className="text-[11px] font-mono text-zinc-500">Live</span>
      </div>

      <div className="px-4 py-4 grid grid-cols-1 gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-400">Requests (last intervals)</div>
            <Sparkline data={sparklineData.requests || []} color="#60a5fa" />
          </div>

          <div className="text-right">
            <div className="text-sm font-semibold text-white">{metrics.totalRequests || 0}</div>
            <div className="text-[11px] text-zinc-500">total requests</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-400">Bursts</div>
            <Sparkline data={sparklineData.bursts || []} color="#34d399" />
          </div>

          <div className="text-right">
            <div className="text-sm font-semibold text-white">{metrics.burstsAllowed || 0}</div>
            <div className="text-[11px] text-zinc-500">bursts allowed</div>
          </div>
        </div>

        <div>
          <div className="text-xs text-zinc-400 mb-2">Recent events timeline</div>
          <StatusTimeline traffic={traffic} />
        </div>
      </div>
    </div>
  );
}
