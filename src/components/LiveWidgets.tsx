import { Thermometer, Wind, Droplets, Cloud, CloudRain, CloudLightning, CloudFog } from "lucide-react";
import type { WeatherData } from "@/lib/mock-data";
import type { ShipmentStatus } from "@/lib/mock-data";

const weatherIcons: Record<string, React.ElementType> = {
  Clear: Cloud,
  Cloudy: Cloud,
  Rain: CloudRain,
  "Heavy Rain": CloudRain,
  Fog: CloudFog,
  Storm: CloudLightning,
};

export function WeatherWidget({ weather }: { weather: WeatherData }) {
  const Icon = weatherIcons[weather.condition] || Cloud;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Weather
      </h3>
      <div className="flex items-center gap-4">
        <Icon className="h-8 w-8 text-primary" />
        <div className="space-y-1">
          <p className="font-mono text-lg font-bold text-foreground">{weather.condition}</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Thermometer className="h-3 w-3" /> {weather.temperature.toFixed(0)}°C
            </span>
            <span className="flex items-center gap-1">
              <Wind className="h-3 w-3" /> {weather.windSpeed.toFixed(0)} km/h
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="h-3 w-3" /> {weather.rainfall.toFixed(0)} mm
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const statusColors: Record<string, string> = {
  in_transit: "bg-primary/20 text-primary",
  delivered: "bg-success/20 text-success",
  delayed: "bg-warning/20 text-warning",
  loading: "bg-secondary text-secondary-foreground",
};

export function ShipmentFeed({ shipments }: { shipments: ShipmentStatus[] }) {
  const displayed = shipments.slice(-6).reverse();
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Shipment Feed
      </h3>
      <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin">
        {displayed.map((s, i) => (
          <div key={`${s.shipmentId}-${i}`} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-foreground">{s.shipmentId}</span>
              <span className="text-muted-foreground">{s.origin} → {s.destination}</span>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[s.status]}`}>
              {s.status.replace("_", " ")}
            </span>
          </div>
        ))}
        {displayed.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">Awaiting shipment data...</p>
        )}
      </div>
    </div>
  );
}
