import { motion } from "framer-motion";
import { Trophy, Leaf, TrendingUp, Award } from "lucide-react";
import type { VehicleMetrics } from "@/lib/mock-data";

interface Props {
  vehicles: VehicleMetrics[];
  totalEmissions: number;
}

function getSustainabilityScore(v: VehicleMetrics): number {
  const effScore = Math.min(v.fuelEfficiency / 8, 1) * 40;
  const carbonPenalty = Math.max(0, 30 - (v.totalCarbonKg / 20));
  const alertPenalty = Math.max(0, 20 - v.alertCount * 3);
  const activeBonus = v.status === "active" ? 10 : v.status === "idle" ? 5 : 0;
  return Math.min(100, Math.max(0, effScore + carbonPenalty + alertPenalty + activeBonus));
}

function getGrade(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "A+", color: "text-primary" };
  if (score >= 65) return { label: "A", color: "text-primary" };
  if (score >= 50) return { label: "B", color: "text-warning" };
  if (score >= 35) return { label: "C", color: "text-warning" };
  return { label: "D", color: "text-destructive" };
}

const medalColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];

export function SustainabilityLeaderboard({ vehicles, totalEmissions }: Props) {
  const ranked = [...vehicles]
    .map((v) => ({ ...v, score: getSustainabilityScore(v) }))
    .sort((a, b) => b.score - a.score);

  const fleetAvg = ranked.reduce((s, v) => s + v.score, 0) / ranked.length;
  const grade = getGrade(fleetAvg);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Sustainability Leaderboard
        </h3>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
          <Leaf className="h-3 w-3 text-primary" />
          <span className="font-mono text-xs font-bold text-primary">Fleet Avg: {fleetAvg.toFixed(0)}</span>
          <span className={`font-mono text-xs font-bold ${grade.color}`}>{grade.label}</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {ranked.map((v, i) => {
          const vGrade = getGrade(v.score);
          return (
            <motion.div
              key={v.vehicleId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2.5"
            >
              <div className="flex h-6 w-6 items-center justify-center">
                {i < 3 ? (
                  <Award className={`h-5 w-5 ${medalColors[i]}`} />
                ) : (
                  <span className="font-mono text-xs text-muted-foreground">#{i + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground">{v.vehicleId}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{v.name}</span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${v.score}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.04 }}
                    className="h-full rounded-full gradient-primary"
                  />
                </div>
              </div>
              <div className="text-right">
                <span className={`font-mono text-sm font-bold ${vGrade.color}`}>{vGrade.label}</span>
                <p className="font-mono text-[10px] text-muted-foreground">{v.score.toFixed(0)}pts</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
