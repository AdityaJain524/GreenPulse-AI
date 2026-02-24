import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { VehicleMetrics } from "@/lib/mock-data";

interface VehicleRankingProps {
  vehicles: VehicleMetrics[];
}

export function VehicleRanking({ vehicles }: VehicleRankingProps) {
  const sorted = [...vehicles].sort((a, b) => b.totalCarbonKg - a.totalCarbonKg);
  const maxCarbon = sorted[0]?.totalCarbonKg ?? 1;

  const statusColors: Record<string, string> = {
    active: "bg-primary",
    idle: "bg-warning",
    maintenance: "bg-destructive",
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Vehicle Rankings
      </h3>
      <div className="space-y-3">
        {sorted.map((v, i) => {
          const barWidth = (v.totalCarbonKg / maxCarbon) * 100;
          return (
            <motion.div
              key={v.vehicleId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-foreground">{v.vehicleId}</span>
                  <span className="text-muted-foreground">{v.name}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusColors[v.status]}`} />
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="font-mono">{v.fuelEfficiency.toFixed(1)} km/L</span>
                  <span className="font-mono font-bold text-foreground">
                    {v.totalCarbonKg.toFixed(1)} kg
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full gradient-primary"
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
