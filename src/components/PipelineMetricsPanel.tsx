import { useEffect, useState } from "react";
import { Activity, Cpu, Database, Gauge, Info, Timer, Workflow } from "lucide-react";
import { fetchPipelineMetrics, isBackendConnected, type BackendPipelineMetrics } from "@/lib/backend-api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function formatUptime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs}h ${mins}m ${secs}s`;
}

export function PipelineMetricsPanel() {
  const [metrics, setMetrics] = useState<BackendPipelineMetrics | null>(null);

  useEffect(() => {
    if (!isBackendConnected()) return;

    let mounted = true;
    const pull = async () => {
      const data = await fetchPipelineMetrics();
      if (mounted && data) setMetrics(data);
    };

    pull();
    const id = setInterval(pull, 2000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  if (!isBackendConnected() || !metrics) {
    return null;
  }

  const items = [
    { label: "Events/sec", value: metrics.events_per_second.toFixed(2), icon: <Activity className="h-3.5 w-3.5 text-primary" /> },
    { label: "Total Events", value: metrics.total_events_processed.toLocaleString(), icon: <Database className="h-3.5 w-3.5 text-chart-2" /> },
    { label: "Active Tables", value: metrics.active_streaming_tables_count, icon: <Workflow className="h-3.5 w-3.5 text-chart-4" /> },
    { label: "Window Latency", value: `${metrics.sliding_window_latency_ms.toFixed(1)} ms`, icon: <Gauge className="h-3.5 w-3.5 text-warning" /> },
    { label: "Streaming Nodes", value: metrics.total_streaming_nodes, icon: <Cpu className="h-3.5 w-3.5 text-muted-foreground" /> },
    { label: "Uptime", value: formatUptime(metrics.uptime_seconds), icon: <Timer className="h-3.5 w-3.5 text-primary" /> },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Live Pipeline Metrics</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="rounded-full bg-secondary p-1 text-muted-foreground" aria-label="Streaming proof info">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              This panel proves real streaming execution.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-border bg-secondary/30 p-2.5">
            <div className="mb-1 flex items-center gap-1.5">
              {item.icon}
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
            <div className="text-sm font-bold text-foreground">{item.value}</div>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        Last update: {new Date(metrics.last_update_timestamp).toLocaleTimeString()}
        {metrics.memory_usage_mb !== null ? ` • Memory ${metrics.memory_usage_mb.toFixed(1)} MB` : ""}
      </p>
    </div>
  );
}
