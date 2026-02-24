import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, CheckCircle, TrendingUp, Zap, Navigation, Clock, Fuel } from "lucide-react";
import { VehicleMetrics, Alert } from "@/lib/mock-data";

interface VehicleStateMachineProps {
  vehicles: VehicleMetrics[];
  alerts: Alert[];
}

type VehicleState =
  | "NORMAL"
  | "EFFICIENT"
  | "HIGH_EMISSION"
  | "ROUTE_DEVIATION"
  | "IDLE"
  | "CRITICAL_RISK";

interface VehicleStateInfo {
  vehicleId: string;
  name: string;
  currentState: VehicleState;
  previousState: VehicleState;
  riskScore: number;
  transitionReason: string;
  riskLevel: "minimal" | "low" | "medium" | "high" | "critical";
}

const STATE_CONFIG: Record<
  VehicleState,
  { label: string; color: string; bg: string; icon: React.ReactNode; priority: number }
> = {
  CRITICAL_RISK: {
    label: "Critical Risk",
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/30",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    priority: 6,
  },
  HIGH_EMISSION: {
    label: "High Emission",
    color: "text-warning",
    bg: "bg-warning/10 border-warning/30",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    priority: 5,
  },
  ROUTE_DEVIATION: {
    label: "Route Deviation",
    color: "text-chart-4",
    bg: "bg-chart-4/10 border-chart-4/30",
    icon: <Navigation className="h-3.5 w-3.5" />,
    priority: 4,
  },
  IDLE: {
    label: "Idle",
    color: "text-muted-foreground",
    bg: "bg-muted/50 border-border",
    icon: <Clock className="h-3.5 w-3.5" />,
    priority: 3,
  },
  NORMAL: {
    label: "Normal",
    color: "text-foreground",
    bg: "bg-secondary/50 border-border",
    icon: <Activity className="h-3.5 w-3.5" />,
    priority: 2,
  },
  EFFICIENT: {
    label: "Efficient",
    color: "text-primary",
    bg: "bg-primary/10 border-primary/30",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    priority: 1,
  },
};

function deriveState(vehicle: VehicleMetrics, alerts: Alert[]): VehicleState {
  const vehicleAlerts = alerts.filter((a) => a.vehicleId === vehicle.vehicleId);
  const recentAlerts = vehicleAlerts.slice(-5);

  if (vehicle.fuelEfficiency < 2.5 && recentAlerts.length >= 3) return "CRITICAL_RISK";
  if (vehicleAlerts.some((a) => a.type === "deviation")) return "ROUTE_DEVIATION";
  if (vehicle.totalCarbonKg > 300) return "HIGH_EMISSION";
  if (vehicle.status === "idle" || vehicle.avgSpeed < 5) return "IDLE";
  if (vehicle.fuelEfficiency > 6.5 && vehicleAlerts.length === 0) return "EFFICIENT";
  return "NORMAL";
}

function deriveTransitionReason(state: VehicleState, vehicle: VehicleMetrics, alerts: Alert[]): string {
  const cnt = alerts.filter((a) => a.vehicleId === vehicle.vehicleId).length;
  switch (state) {
    case "CRITICAL_RISK": return `Risk score elevated — ${cnt} alerts, efficiency ${vehicle.fuelEfficiency.toFixed(1)} km/L`;
    case "HIGH_EMISSION": return `Carbon ${vehicle.totalCarbonKg.toFixed(0)} kg exceeds 300 kg threshold`;
    case "ROUTE_DEVIATION": return "GPS coordinates outside permitted route bounds";
    case "IDLE": return `Avg speed ${vehicle.avgSpeed.toFixed(0)} km/h below idle threshold`;
    case "EFFICIENT": return `Efficiency ${vehicle.fuelEfficiency.toFixed(1)} km/L > 6.5 with zero alerts`;
    default: return "All metrics within normal operating parameters";
  }
}

const STATE_DISTRIBUTION_ORDER: VehicleState[] = [
  "CRITICAL_RISK", "HIGH_EMISSION", "ROUTE_DEVIATION", "IDLE", "NORMAL", "EFFICIENT",
];

export function VehicleStateMachine({ vehicles, alerts }: VehicleStateMachineProps) {
  const vehicleStates: VehicleStateInfo[] = useMemo(() => {
    return vehicles.map((v) => {
      const state = deriveState(v, alerts);
      const riskScore = Math.min(
        100,
        (v.totalCarbonKg / 500) * 40 +
          (alerts.filter((a) => a.vehicleId === v.vehicleId).length / 8) * 35 +
          (Math.max(0, 8 - v.fuelEfficiency) / 8) * 25
      );
      return {
        vehicleId: v.vehicleId,
        name: v.name,
        currentState: state,
        previousState: "NORMAL" as VehicleState,
        riskScore: Math.round(riskScore),
        transitionReason: deriveTransitionReason(state, v, alerts),
        riskLevel: (riskScore > 80 ? "critical" : riskScore > 60 ? "high" : riskScore > 40 ? "medium" : riskScore > 20 ? "low" : "minimal") as "critical" | "high" | "medium" | "low" | "minimal",
      };
    }).sort((a, b) => STATE_CONFIG[b.currentState].priority - STATE_CONFIG[a.currentState].priority);
  }, [vehicles, alerts]);

  const distribution = useMemo(() => {
    const counts: Record<string, number> = {};
    vehicleStates.forEach((vs) => {
      counts[vs.currentState] = (counts[vs.currentState] || 0) + 1;
    });
    return counts;
  }, [vehicleStates]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Vehicle State Machine</h3>
            <p className="text-[10px] text-muted-foreground">Event-driven state transitions • Streaming-safe</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          <span className="text-[10px] font-medium text-primary">LIVE</span>
        </div>
      </div>

      {/* State Distribution Summary */}
      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STATE_DISTRIBUTION_ORDER.map((state) => {
          const cfg = STATE_CONFIG[state];
          const count = distribution[state] || 0;
          return (
            <div key={state} className={`rounded-lg border p-2 text-center ${cfg.bg}`}>
              <div className={`flex justify-center mb-1 ${cfg.color}`}>{cfg.icon}</div>
              <div className={`text-lg font-bold ${cfg.color}`}>{count}</div>
              <div className="text-[9px] text-muted-foreground leading-tight">{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {/* Vehicle State Table */}
      <div className="space-y-2">
        {vehicleStates.map((vs, idx) => {
          const cfg = STATE_CONFIG[vs.currentState];
          return (
            <motion.div
              key={vs.vehicleId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`rounded-lg border p-3 ${cfg.bg}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cfg.color}>{cfg.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">{vs.name}</span>
                      <span className="text-[9px] text-muted-foreground font-mono">{vs.vehicleId}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
                      {vs.transitionReason}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className={`text-[10px] font-bold ${cfg.color}`}>{vs.currentState.replace("_", " ")}</div>
                    <div className="text-[9px] text-muted-foreground">Risk: {vs.riskScore}</div>
                  </div>
                  {/* Mini risk bar */}
                  <div className="h-8 w-1.5 rounded-full bg-secondary overflow-hidden flex flex-col justify-end">
                    <div
                      className={`w-full rounded-full transition-all duration-500 ${
                        vs.riskScore > 80 ? "bg-destructive" :
                        vs.riskScore > 60 ? "bg-warning" :
                        vs.riskScore > 40 ? "bg-chart-4" : "bg-primary"
                      }`}
                      style={{ height: `${vs.riskScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
