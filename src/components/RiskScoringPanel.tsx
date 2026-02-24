import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { VehicleMetrics, Alert } from "@/lib/mock-data";
import {
  fetchRiskBreakdown,
  fetchStateExplanation,
  isBackendConnected,
  type BackendRiskBreakdownRow,
  type BackendStateExplanation,
} from "@/lib/backend-api";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Props {
  vehicles: VehicleMetrics[];
  alerts: Alert[];
}

interface LocalBreakdownRow {
  vehicle_id: string;
  risk_score: number;
  alert_impact_pct: number;
  efficiency_impact_pct: number;
  carbon_impact_pct: number;
  status_impact_pct: number;
}

function computeFallbackBreakdown(
  vehicle: VehicleMetrics,
  vehicleAlerts: Alert[]
): LocalBreakdownRow {
  const alertRaw = Math.min(100, vehicleAlerts.length * 18);
  const efficiencyRaw =
    vehicle.fuelEfficiency < 4 ? 80 : vehicle.fuelEfficiency < 5.5 ? 55 : 20;
  const carbonRaw = Math.min(100, (vehicle.totalCarbonKg / 500) * 100);
  const statusRaw =
    vehicle.status === "maintenance"
      ? 70
      : vehicle.status === "idle"
        ? 35
        : 15;

  const weightedAlert = 0.35 * alertRaw;
  const weightedEfficiency = 0.25 * efficiencyRaw;
  const weightedCarbon = 0.25 * carbonRaw;
  const weightedStatus = 0.15 * statusRaw;
  const riskScore = weightedAlert + weightedEfficiency + weightedCarbon + weightedStatus;

  return {
    vehicle_id: vehicle.vehicleId,
    risk_score: Math.round(riskScore),
    alert_impact_pct: riskScore > 0 ? (weightedAlert / riskScore) * 100 : 0,
    efficiency_impact_pct: riskScore > 0 ? (weightedEfficiency / riskScore) * 100 : 0,
    carbon_impact_pct: riskScore > 0 ? (weightedCarbon / riskScore) * 100 : 0,
    status_impact_pct: riskScore > 0 ? (weightedStatus / riskScore) * 100 : 0,
  };
}

function barColor(value: number): string {
  if (value >= 35) return "bg-destructive";
  if (value >= 20) return "bg-warning";
  return "bg-primary";
}

export function RiskScoringPanel({ vehicles, alerts }: Props) {
  const [backendRows, setBackendRows] = useState<BackendRiskBreakdownRow[] | null>(null);
  const [formula, setFormula] = useState(
    "Risk Score = 0.35(alerts) + 0.25(efficiency) + 0.25(carbon) + 0.15(status)"
  );
  const [explanations, setExplanations] = useState<
    Record<string, BackendStateExplanation>
  >({});

  useEffect(() => {
    if (!isBackendConnected()) return;
    let mounted = true;

    const pull = async () => {
      const data = await fetchRiskBreakdown();
      if (!mounted || !data) return;
      setBackendRows(data.breakdown);
      setFormula(data.formula);
    };

    pull();
    const id = setInterval(pull, 3000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!backendRows || !isBackendConnected()) return;
    let mounted = true;

    const pullExplanations = async () => {
      const topVehicleIds = backendRows.slice(0, 6).map((row) => row.vehicle_id);
      const responses = await Promise.all(
        topVehicleIds.map((vehicleId) => fetchStateExplanation(vehicleId))
      );
      if (!mounted) return;
      const next: Record<string, BackendStateExplanation> = {};
      responses.forEach((response) => {
        if (response) next[response.vehicle_id] = response;
      });
      setExplanations(next);
    };

    pullExplanations();
  }, [backendRows]);

  const rows = useMemo(() => {
    if (backendRows && backendRows.length > 0) {
      return [...backendRows].sort((a, b) => b.risk_score - a.risk_score);
    }

    return vehicles
      .map((vehicle) => {
        const vehicleAlerts = alerts.filter(
          (alert) => alert.vehicleId === vehicle.vehicleId
        );
        return computeFallbackBreakdown(vehicle, vehicleAlerts);
      })
      .sort((a, b) => b.risk_score - a.risk_score);
  }, [backendRows, vehicles, alerts]);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          Risk Assessment
        </h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          XAI ENABLED
        </span>
      </div>

      <div className="mb-3 rounded-lg border border-border bg-secondary/30 px-3 py-2">
        <p className="text-[10px] text-muted-foreground">{formula}</p>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => {
          const explanation = explanations[row.vehicle_id];
          return (
            <motion.div
              key={row.vehicle_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-lg border border-border bg-secondary/20 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-foreground">
                  {row.vehicle_id}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground">
                  Risk {row.risk_score.toFixed(0)}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "Alert Impact %", value: row.alert_impact_pct },
                  { label: "Efficiency Impact %", value: row.efficiency_impact_pct },
                  { label: "Carbon Impact %", value: row.carbon_impact_pct },
                  { label: "Status Impact %", value: row.status_impact_pct },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${barColor(item.value)}`}
                        style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[8px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>

              {explanation && (
                <Accordion type="single" collapsible className="mt-2">
                  <AccordionItem
                    value={`explain-${row.vehicle_id}`}
                    className="border-border/40"
                  >
                    <AccordionTrigger className="py-2 text-[10px] font-semibold text-muted-foreground hover:no-underline">
                      Expand reasoning panel
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1 rounded-md bg-background/50 p-2 text-[10px] text-muted-foreground">
                        <p className="text-foreground">{explanation.transition}</p>
                        <p>
                          - Risk Score &gt; 85: {explanation.reason.risk_score_gt_85 ? "Yes" : "No"} (
                          {explanation.reason.risk_score.toFixed(1)})
                        </p>
                        <p>- Alerts in last 5 min: {explanation.reason.alerts_last_5_min}</p>
                        <p>
                          - Escalation probability: {explanation.reason.escalation_probability.toFixed(3)}
                        </p>
                        <p>
                          - Carbon growth slope positive: {explanation.reason.carbon_growth_slope_positive ? "Yes" : "No"}
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </motion.div>
          );
        })}

        {rows.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            No risk data available yet.
          </div>
        )}
      </div>
    </div>
  );
}
