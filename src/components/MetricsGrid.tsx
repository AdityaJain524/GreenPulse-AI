import { motion } from "framer-motion";
import { Leaf, Activity, AlertTriangle, Truck, Wind, Droplets, Thermometer, Zap } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  accentColor?: "primary" | "warning" | "destructive";
  pulse?: boolean;
}

function MetricCard({ label, value, unit, icon, accentColor = "primary", pulse }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl border border-border bg-card p-5 ${pulse ? "animate-pulse-glow" : ""}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/5 pointer-events-none" />
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-3xl font-bold text-foreground">{value}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            accentColor === "primary"
              ? "bg-primary/10 text-primary"
              : accentColor === "warning"
              ? "bg-warning/10 text-warning"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

interface MetricsGridProps {
  totalEmissions: number;
  activeVehicles: number;
  alertCount: number;
  dataPoints: number;
  weather: {
    temperature: number;
    windSpeed: number;
    rainfall: number;
    condition: string;
  };
}

export function MetricsGrid({ totalEmissions, activeVehicles, alertCount, dataPoints, weather }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        label="Total Emissions"
        value={totalEmissions.toFixed(1)}
        unit="kg CO₂"
        icon={<Leaf className="h-5 w-5" />}
        pulse
      />
      <MetricCard
        label="Active Vehicles"
        value={activeVehicles}
        unit="online"
        icon={<Truck className="h-5 w-5" />}
      />
      <MetricCard
        label="Active Alerts"
        value={alertCount}
        icon={<AlertTriangle className="h-5 w-5" />}
        accentColor={alertCount > 5 ? "destructive" : "warning"}
      />
      <MetricCard
        label="Stream Events"
        value={dataPoints}
        unit="processed"
        icon={<Zap className="h-5 w-5" />}
      />
    </div>
  );
}
