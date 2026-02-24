import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Zap, Fuel, Brain, ArrowUpRight, ArrowRight, Gauge } from "lucide-react";
import { VehicleMetrics, Alert } from "@/lib/mock-data";

interface PredictionEngineProps {
  vehicles: VehicleMetrics[];
  alerts: Alert[];
}

interface VehiclePrediction {
  vehicleId: string;
  name: string;
  predictedCarbon10Min: number;
  predictedRiskScore: number;
  riskEscalationProb: number;
  fuelExhaustionMinutes: number;
  currentRisk: number;
  riskTrend: "up" | "down" | "stable";
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function computePredictions(vehicles: VehicleMetrics[], alerts: Alert[]): VehiclePrediction[] {
  return vehicles.map((v) => {
    const vehicleAlerts = alerts.filter((a) => a.vehicleId === v.vehicleId);

    // Current risk score
    const currentRisk = Math.min(
      100,
      (v.totalCarbonKg / 500) * 40 +
        (vehicleAlerts.length / 8) * 35 +
        (Math.max(0, 8 - v.fuelEfficiency) / 8) * 25
    );

    // Predicted carbon 10 min: linear projection with speed/efficiency factors
    const carbonRate = v.totalCarbonKg / 5; // per minute in window
    const speedFactor = 1 + Math.max(0, v.avgSpeed - 60) / 100;
    const effPenalty = Math.max(0, (5 - v.fuelEfficiency) / 5);
    const adjustedRate = carbonRate * speedFactor * (1 + effPenalty * 0.3);
    const predictedCarbon10Min = Math.round(v.totalCarbonKg + adjustedRate * 10);

    // Predicted risk score
    const predictedRisk = Math.min(
      100,
      currentRisk * 0.55 +
        Math.min(vehicleAlerts.length * 8, 30) +
        Math.min(v.totalCarbonKg * 0.5, 20) +
        Math.max(0, (v.avgSpeed - 90) * 0.25)
    );

    // Risk escalation probability (sigmoid)
    const delta = predictedRisk - currentRisk;
    const alertPressure = Math.min(vehicleAlerts.length * 5, 25);
    const riskEscalationProb = sigmoid(0.08 * (delta + alertPressure));

    // Fuel exhaustion
    const fuelRatePerMin = (v.totalCarbonKg / 2.68) / 5; // approx liters/min
    const usableFuel = 30; // litres
    const fuelExhaustionMinutes =
      fuelRatePerMin > 0.01 ? Math.round(usableFuel / fuelRatePerMin) : -1;

    const riskTrend: "up" | "down" | "stable" =
      predictedRisk > currentRisk + 5 ? "up" : predictedRisk < currentRisk - 5 ? "down" : "stable";

    return {
      vehicleId: v.vehicleId,
      name: v.name,
      predictedCarbon10Min,
      predictedRiskScore: Math.round(predictedRisk),
      riskEscalationProb: Math.round(riskEscalationProb * 100) / 100,
      fuelExhaustionMinutes,
      currentRisk: Math.round(currentRisk),
      riskTrend,
    };
  }).sort((a, b) => b.riskEscalationProb - a.riskEscalationProb);
}

const PROB_COLOR = (p: number) =>
  p > 0.75 ? "text-destructive" : p > 0.5 ? "text-warning" : p > 0.25 ? "text-chart-4" : "text-primary";

const PROB_BAR = (p: number) =>
  p > 0.75 ? "bg-destructive" : p > 0.5 ? "bg-warning" : p > 0.25 ? "bg-chart-4" : "bg-primary";

export function PredictionEngine({ vehicles, alerts }: PredictionEngineProps) {
  const predictions = useMemo(() => computePredictions(vehicles, alerts), [vehicles, alerts]);

  const fleetAvgEscalation = useMemo(
    () => predictions.reduce((s, p) => s + p.riskEscalationProb, 0) / Math.max(predictions.length, 1),
    [predictions]
  );

  const criticalFuel = predictions.filter(
    (p) => p.fuelExhaustionMinutes > 0 && p.fuelExhaustionMinutes < 60
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-chart-4/15">
            <Brain className="h-4 w-4 text-chart-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Predictive Forecasting Engine</h3>
            <p className="text-[10px] text-muted-foreground">Carbon • Risk • Fuel Exhaustion • Next 10 min</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-bold ${PROB_COLOR(fleetAvgEscalation)}`}>
            {(fleetAvgEscalation * 100).toFixed(0)}%
          </div>
          <div className="text-[9px] text-muted-foreground">Fleet Escalation Risk</div>
        </div>
      </div>

      {/* Fuel Alert Banner */}
      {criticalFuel.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-3 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2"
        >
          <Fuel className="h-3.5 w-3.5 text-warning shrink-0" />
          <span className="text-[10px] text-warning font-medium">
            {criticalFuel.length} vehicle{criticalFuel.length > 1 ? "s" : ""} predicted to reach critical fuel in &lt;60 min:{" "}
            {criticalFuel.map((p) => p.vehicleId).join(", ")}
          </span>
        </motion.div>
      )}

      {/* Predictions Table */}
      <div className="space-y-2.5">
        {predictions.map((pred, idx) => (
          <motion.div
            key={pred.vehicleId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="rounded-lg border border-border bg-secondary/30 p-3"
          >
            {/* Row header */}
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground">{pred.name}</span>
                <span className="ml-2 text-[9px] font-mono text-muted-foreground">{pred.vehicleId}</span>
              </div>
              <div className="flex items-center gap-1">
                {pred.riskTrend === "up" && <ArrowUpRight className="h-3 w-3 text-destructive" />}
                {pred.riskTrend === "stable" && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                {pred.riskTrend === "down" && <ArrowUpRight className="h-3 w-3 text-primary rotate-180" />}
                <span className="text-[10px] text-muted-foreground">Risk trend</span>
              </div>
            </div>

            {/* 3-column metric grid */}
            <div className="grid grid-cols-3 gap-2">
              {/* Carbon forecast */}
              <div className="rounded-md bg-background/60 p-2">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="h-2.5 w-2.5 text-warning" />
                  <span className="text-[9px] text-muted-foreground">Carbon 10min</span>
                </div>
                <div className="text-sm font-bold text-warning">{pred.predictedCarbon10Min}</div>
                <div className="text-[9px] text-muted-foreground">kg CO₂</div>
              </div>

              {/* Risk score */}
              <div className="rounded-md bg-background/60 p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Gauge className="h-2.5 w-2.5 text-chart-4" />
                  <span className="text-[9px] text-muted-foreground">Risk Score</span>
                </div>
                <div className={`text-sm font-bold ${PROB_COLOR(pred.predictedRiskScore / 100)}`}>
                  {pred.predictedRiskScore}
                </div>
                <div className="text-[9px] text-muted-foreground">/ 100</div>
              </div>

              {/* Fuel */}
              <div className="rounded-md bg-background/60 p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Fuel className="h-2.5 w-2.5 text-primary" />
                  <span className="text-[9px] text-muted-foreground">Fuel ETA</span>
                </div>
                <div className={`text-sm font-bold ${pred.fuelExhaustionMinutes > 0 && pred.fuelExhaustionMinutes < 60 ? "text-warning" : "text-primary"}`}>
                  {pred.fuelExhaustionMinutes > 0 ? `${pred.fuelExhaustionMinutes}m` : "Safe"}
                </div>
                <div className="text-[9px] text-muted-foreground">to critical</div>
              </div>
            </div>

            {/* Escalation probability bar */}
            <div className="mt-2">
              <div className="mb-0.5 flex justify-between">
                <span className="text-[9px] text-muted-foreground">Escalation probability</span>
                <span className={`text-[9px] font-bold ${PROB_COLOR(pred.riskEscalationProb)}`}>
                  {(pred.riskEscalationProb * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pred.riskEscalationProb * 100}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.06 }}
                  className={`h-full rounded-full ${PROB_BAR(pred.riskEscalationProb)}`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
