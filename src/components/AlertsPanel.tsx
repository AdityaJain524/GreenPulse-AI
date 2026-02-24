import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, Zap } from "lucide-react";
import type { Alert } from "@/lib/mock-data";

const severityConfig = {
  critical: { icon: Zap, className: "border-destructive/50 bg-destructive/5 text-destructive" },
  high: { icon: AlertTriangle, className: "border-warning/50 bg-warning/5 text-warning" },
  medium: { icon: AlertCircle, className: "border-primary/50 bg-primary/5 text-primary" },
  low: { icon: Info, className: "border-muted-foreground/30 bg-muted/50 text-muted-foreground" },
};

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const displayed = alerts.slice(0, 8);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Active Alerts
        </h3>
        <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive">
          {alerts.length}
        </span>
      </div>
      <div className="space-y-2 max-h-[340px] overflow-y-auto scrollbar-thin pr-1">
        <AnimatePresence mode="popLayout">
          {displayed.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className={`flex items-start gap-3 rounded-lg border p-3 ${config.className}`}
              >
                <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">{alert.vehicleId}</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-secondary-foreground">
                      {alert.type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed opacity-80">{alert.message}</p>
                  <p className="mt-1 font-mono text-[10px] opacity-50">
                    {alert.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {alerts.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No alerts — all systems nominal</p>
        )}
      </div>
    </div>
  );
}
