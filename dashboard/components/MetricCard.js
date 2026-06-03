import { Area, AreaChart, ResponsiveContainer } from "recharts";

const SPARKLINE_COLORS = {
  requests: "#60a5fa",
  bursts: "#34d399",
  ddos: "#f87171",
  compute: "#fbbf24",
};

export default function MetricCard({ icon: Icon, label, value, subtext, sparklineKey, sparklineData, accentColor, formatValue }) {
  const data = (sparklineData || []).map((v, i) => ({ i, v }));
  const color = accentColor || SPARKLINE_COLORS[sparklineKey] || "#60a5fa";
  const displayValue = formatValue ? formatValue(value) : value.toLocaleString();

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700/50 transition-colors duration-200 group">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/20 to-transparent pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg border"
              style={{
                backgroundColor: `${color}10`,
                borderColor: `${color}20`,
              }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              {label}
            </span>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div
              className="text-3xl font-bold tabular-nums font-mono tracking-tight"
              style={{ color }}
            >
              {displayValue}
            </div>
            {subtext && (
              <p className="text-xs text-zinc-500 mt-1">{subtext}</p>
            )}
          </div>

          {data.length > 0 && (
            <div className="w-24 h-10 opacity-50 group-hover:opacity-80 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`grad-${sparklineKey}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={color}
                    strokeWidth={1.5}
                    fill={`url(#grad-${sparklineKey})`}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
