import { useMemo, useState } from "react";
import { AlertTriangle, PlayCircle, Square } from "lucide-react";
import { isBackendConnected, simulateCrisis, stopCrisis } from "@/lib/backend-api";
import type { VehicleMetrics } from "@/lib/mock-data";

interface CrisisSimulationPanelProps {
  vehicles: VehicleMetrics[];
}

export function CrisisSimulationPanel({ vehicles }: CrisisSimulationPanelProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.vehicleId ?? "");
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const vehicleOptions = useMemo(
    () => vehicles.map((vehicle) => ({ id: vehicle.vehicleId, name: vehicle.name })),
    [vehicles]
  );

  if (!isBackendConnected()) return null;

  const onStart = async () => {
    if (!selectedVehicleId) return;
    setLoading(true);
    const response = await simulateCrisis(selectedVehicleId);
    if (response?.status === "enabled") {
      setActiveVehicleId(response.vehicle_id);
    }
    setLoading(false);
  };

  const onStop = async () => {
    setLoading(true);
    const response = await stopCrisis();
    if (response?.status === "disabled") {
      setActiveVehicleId(null);
    }
    setLoading(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Simulate Crisis Mode</h3>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeVehicleId ? "bg-warning/10 text-warning" : "bg-secondary text-muted-foreground"}`}>
          {activeVehicleId ? "ACTIVE" : "OFF"}
        </span>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-warning" />
        <p className="text-[10px] text-muted-foreground">
          Reversible per-vehicle simulation that amplifies emissions, alerts, route deviation, risk, and fuel drain.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <select
          className="rounded-md border border-border bg-background px-2 py-2 text-xs text-foreground"
          value={selectedVehicleId}
          onChange={(e) => setSelectedVehicleId(e.target.value)}
          disabled={loading}
        >
          {vehicleOptions.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.id} — {vehicle.name}
            </option>
          ))}
        </select>

        <button
          className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-primary/10 px-2.5 py-2 text-xs font-semibold text-primary disabled:opacity-50"
          onClick={onStart}
          disabled={loading || !selectedVehicleId}
        >
          <PlayCircle className="h-3.5 w-3.5" />
          Start
        </button>

        <button
          className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-2 text-xs font-semibold text-foreground disabled:opacity-50"
          onClick={onStop}
          disabled={loading || !activeVehicleId}
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </button>
      </div>

      {activeVehicleId && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Active target: <span className="font-mono text-foreground">{activeVehicleId}</span>
        </p>
      )}
    </div>
  );
}
