import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, CheckCircle, AlertTriangle, Clock, RefreshCw, ChevronDown } from "lucide-react";
import { VehicleMetrics, Alert } from "@/lib/mock-data";

interface FleetReportProps {
  vehicles: VehicleMetrics[];
  alerts: Alert[];
  totalEmissions: number;
}

interface FleetReport {
  totalCarbon: number;
  activeVehicles: number;
  totalAlerts: number;
  avgRisk: number;
  avgSustainability: number;
  fleetHealth: "healthy" | "degraded" | "critical";
  sustainabilityGrade: "A" | "B" | "C" | "D";
  highestCarbonVehicle: string;
  mostInefficientVehicle: string;
  highestRiskVehicle: string;
  executiveSummary: string;
  generatedAt: Date;
  windowMinutes: number;
}

function generateReport(
  vehicles: VehicleMetrics[],
  alerts: Alert[],
  totalEmissions: number
): FleetReport {
  const activeVehicles = vehicles.filter((v) => v.status === "active").length;

  const sortedByCarbon = [...vehicles].sort((a, b) => b.totalCarbonKg - a.totalCarbonKg);
  const sortedByEfficiency = [...vehicles].sort((a, b) => a.fuelEfficiency - b.fuelEfficiency);

  const avgRisk =
    vehicles.reduce((s, v) => {
      const cnt = alerts.filter((a) => a.vehicleId === v.vehicleId).length;
      const r =
        (v.totalCarbonKg / 500) * 40 +
        (cnt / 8) * 35 +
        (Math.max(0, 8 - v.fuelEfficiency) / 8) * 25;
      return s + Math.min(100, r);
    }, 0) / Math.max(vehicles.length, 1);

  const avgSustainability = Math.max(
    0,
    100 - avgRisk * 0.5 - (alerts.length / 20) * 25 + vehicles.reduce((s, v) => s + v.fuelEfficiency, 0) / vehicles.length * 3
  );

  const fleetHealth: "healthy" | "degraded" | "critical" =
    alerts.length > 12 ? "critical" : alerts.length > 6 ? "degraded" : "healthy";

  const sustainabilityGrade: "A" | "B" | "C" | "D" =
    avgSustainability > 75 ? "A" : avgSustainability > 55 ? "B" : avgSustainability > 35 ? "C" : "D";

  const highestRisk = [...vehicles].sort((a, b) => {
    const rA = alerts.filter((al) => al.vehicleId === a.vehicleId).length;
    const rB = alerts.filter((al) => al.vehicleId === b.vehicleId).length;
    return rB - rA;
  })[0];

  const trend = totalEmissions > 200 ? "above" : "within";
  const summary =
    `Fleet Intelligence Report — 5-Minute Window | ` +
    `Total carbon output: ${totalEmissions.toFixed(1)} kg across ${activeVehicles} active vehicles, ` +
    `${trend} normal operating range. ` +
    `Fleet health: ${fleetHealth.toUpperCase()} with ${alerts.length} alerts. ` +
    `Sustainability grade: ${sustainabilityGrade} (avg ${avgSustainability.toFixed(0)}/100). ` +
    `Avg fleet risk: ${avgRisk.toFixed(0)}/100. ` +
    `${sortedByCarbon[0]?.name ?? "—"} recorded highest emissions. ` +
    `${fleetHealth === "critical" ? "Immediate intervention recommended." : fleetHealth === "degraded" ? "Monitor closely." : "Operations nominal."}`;

  return {
    totalCarbon: totalEmissions,
    activeVehicles,
    totalAlerts: alerts.length,
    avgRisk: Math.round(avgRisk),
    avgSustainability: Math.round(Math.min(100, avgSustainability)),
    fleetHealth,
    sustainabilityGrade,
    highestCarbonVehicle: sortedByCarbon[0]?.name ?? "—",
    mostInefficientVehicle: sortedByEfficiency[0]?.name ?? "—",
    highestRiskVehicle: highestRisk?.name ?? "—",
    executiveSummary: summary,
    generatedAt: new Date(),
    windowMinutes: 5,
  };
}

const HEALTH_CONFIG = {
  healthy: { label: "Healthy", color: "text-primary", bg: "bg-primary/10 border-primary/30", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  degraded: { label: "Degraded", color: "text-warning", bg: "bg-warning/10 border-warning/30", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  critical: { label: "Critical", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
};

const GRADE_COLOR = { A: "text-primary", B: "text-chart-4", C: "text-warning", D: "text-destructive" };

export function FleetIntelligenceReport({ vehicles, alerts, totalEmissions }: FleetReportProps) {
  const [countdown, setCountdown] = useState(300); // 5 min in seconds
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<FleetReport[]>([]);

  const report = useMemo(
    () => generateReport(vehicles, alerts, totalEmissions),
    [vehicles, alerts, totalEmissions]
  );

  // Countdown timer to show "next report in X seconds"
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          // Auto-archive current report to history
          setHistory((prev) => [report, ...prev].slice(0, 5));
          return 300;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [report]);

  const healthCfg = HEALTH_CONFIG[report.fleetHealth];
  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-chart-2/15">
            <FileText className="h-4 w-4 text-chart-2" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Fleet Intelligence Report</h3>
            <p className="text-[10px] text-muted-foreground">Auto-generated • 5-min tumbling window • Event-driven</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-[10px] text-muted-foreground">
            Next in {mins}:{secs.toString().padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Fleet Health + Grade Banner */}
      <div className={`mb-4 flex items-center justify-between rounded-lg border p-3 ${healthCfg.bg}`}>
        <div className="flex items-center gap-2">
          <span className={healthCfg.color}>{healthCfg.icon}</span>
          <div>
            <div className={`text-xs font-bold ${healthCfg.color}`}>Fleet Status: {healthCfg.label}</div>
            <div className="text-[10px] text-muted-foreground">
              {report.totalAlerts} alerts • {report.activeVehicles} active vehicles
            </div>
          </div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-black ${GRADE_COLOR[report.sustainabilityGrade]}`}>
            {report.sustainabilityGrade}
          </div>
          <div className="text-[9px] text-muted-foreground">Sustainability</div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Total Carbon", value: `${report.totalCarbon.toFixed(0)} kg`, sub: "last 5 min" },
          { label: "Avg Risk", value: `${report.avgRisk}/100`, sub: "fleet average" },
          { label: "Sustainability", value: `${report.avgSustainability}/100`, sub: "fleet score" },
          { label: "Alerts", value: String(report.totalAlerts), sub: "triggered" },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-border bg-secondary/30 p-2.5 text-center">
            <div className="text-base font-bold text-foreground">{m.value}</div>
            <div className="text-[9px] font-medium text-muted-foreground">{m.label}</div>
            <div className="text-[8px] text-muted-foreground">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Vehicle Highlights */}
      <div className="mb-4 space-y-1.5">
        {[
          { label: "Highest Carbon", value: report.highestCarbonVehicle, icon: "🔴" },
          { label: "Most Inefficient", value: report.mostInefficientVehicle, icon: "⚠️" },
          { label: "Highest Risk", value: report.highestRiskVehicle, icon: "🚨" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-3 py-1.5">
            <span className="text-[10px] text-muted-foreground">{item.icon} {item.label}</span>
            <span className="text-[10px] font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Executive Summary (expandable) */}
      <div className="mb-3 rounded-lg border border-border bg-secondary/20 p-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-[10px] font-semibold text-foreground flex items-center gap-1.5">
            <FileText className="h-3 w-3 text-chart-2" />
            Executive Summary (AI-generated)
          </span>
          <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                {report.executiveSummary}
              </p>
              <div className="mt-2 text-[9px] text-muted-foreground/60">
                Generated: {report.generatedAt.toLocaleTimeString()} • Window: {report.windowMinutes} min tumbling
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">Report History ({history.length})</span>
          </div>
          <div className="space-y-1">
            {history.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded border border-border/50 bg-secondary/10 px-2.5 py-1">
                <span className="text-[9px] text-muted-foreground">
                  {r.generatedAt.toLocaleTimeString()} — {r.fleetHealth} — {r.totalAlerts} alerts
                </span>
                <span className={`text-[9px] font-bold ${GRADE_COLOR[r.sustainabilityGrade]}`}>
                  {r.sustainabilityGrade}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
