import { Activity, Zap, ShieldOff, Server } from "lucide-react";
import Header from "../components/Header";
import MetricCard from "../components/MetricCard";
import TrafficFeed from "../components/TrafficFeed";
import GoalList from "../components/GoalList";
import LoopDetectorCard from "../components/LoopDetectorCard";
import useAgentData from "../lib/useAgentData";

function formatCompact(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function Home() {
  const { metrics, traffic, goals, loops, systemStatus } = useAgentData();

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header systemStatus={systemStatus} />

      <main className="px-6 py-6 space-y-6 max-w-[1440px] mx-auto">
        {/* ───── Top Metric Row (4 Bento Cards) ───── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Activity}
            label="Agent Requests"
            value={metrics.totalRequests}
            subtext="Total proxy requests"
            sparklineKey="requests"
            sparklineData={metrics.sparklineData.requests}
            accentColor="#60a5fa"
            formatValue={formatCompact}
          />
          <MetricCard
            icon={Zap}
            label="Bursts Allowed"
            value={metrics.burstsAllowed}
            subtext="Goal-based traffic"
            sparklineKey="bursts"
            sparklineData={metrics.sparklineData.bursts}
            accentColor="#34d399"
            formatValue={formatCompact}
          />
          <MetricCard
            icon={ShieldOff}
            label="DDoS Blocked"
            value={metrics.ddosBlocked}
            subtext="IP rate-limited"
            sparklineKey="ddos"
            sparklineData={metrics.sparklineData.ddos}
            accentColor="#f87171"
            formatValue={formatCompact}
          />
          <MetricCard
            icon={Server}
            label="Compute Saved"
            value={metrics.computeSaved}
            subtext="Via request coalescing"
            sparklineKey="compute"
            sparklineData={metrics.sparklineData.compute}
            accentColor="#fbbf24"
            formatValue={formatCompact}
          />
        </div>

        {/* ───── Main Content: Live Feed + Right Sidebar ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column — Live Traffic Feed */}
          <div className="lg:col-span-2 min-h-0">
            <TrafficFeed traffic={traffic} />
          </div>

          {/* Right Column — Goals + Loop Detection */}
          <div className="space-y-4 min-h-0">
            <GoalList goals={goals} />
            <LoopDetectorCard loops={loops} />
          </div>
        </div>
      </main>
    </div>
  );
}
