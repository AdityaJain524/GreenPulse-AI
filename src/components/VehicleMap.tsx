import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GPSPoint } from "@/lib/mock-data";
import { VEHICLES } from "@/lib/mock-data";

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const VEHICLE_COLORS: Record<string, string> = {
  "V-101": "#22c55e",
  "V-102": "#3b82f6",
  "V-103": "#f59e0b",
  "V-104": "#ef4444",
  "V-105": "#8b5cf6",
  "V-106": "#06b6d4",
};

interface VehicleMapProps {
  gpsStream: GPSPoint[];
}

export function VehicleMap({ gpsStream }: VehicleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.CircleMarker>>({});
  const trailsRef = useRef<Record<string, L.LatLng[]>>({});

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([20.5, 78.9], 5); // Center on India

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Add zoom control to bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update markers when GPS data changes
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    // Get latest position per vehicle
    const latestPerVehicle: Record<string, GPSPoint> = {};
    gpsStream.forEach((p) => {
      latestPerVehicle[p.vehicleId] = p;
    });

    Object.entries(latestPerVehicle).forEach(([vehicleId, point]) => {
      const color = VEHICLE_COLORS[vehicleId] || "#22c55e";
      const latlng = L.latLng(point.latitude, point.longitude);

      // Update or create marker
      if (markersRef.current[vehicleId]) {
        markersRef.current[vehicleId].setLatLng(latlng);
      } else {
        const marker = L.circleMarker(latlng, {
          radius: 8,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(map);

        const vehicle = VEHICLES.find((v) => v.id === vehicleId);
        marker.bindPopup(
          `<div style="font-family: monospace; color: #0a0f14;">
            <strong>${vehicleId}</strong> — ${vehicle?.name || ""}<br/>
            Speed: ${point.speed.toFixed(0)} km/h
          </div>`
        );

        markersRef.current[vehicleId] = marker;
      }

      // Add to trail
      if (!trailsRef.current[vehicleId]) {
        trailsRef.current[vehicleId] = [];
      }
      trailsRef.current[vehicleId].push(latlng);
      // Keep trail short
      if (trailsRef.current[vehicleId].length > 10) {
        trailsRef.current[vehicleId] = trailsRef.current[vehicleId].slice(-10);
      }
    });
  }, [gpsStream]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Vehicle Tracking
          </h3>
          <p className="text-xs text-muted-foreground">Live GPS positions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {VEHICLES.map((v) => (
            <div key={v.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: VEHICLE_COLORS[v.id] || "#22c55e" }}
              />
              {v.id}
            </div>
          ))}
        </div>
      </div>
      <div ref={mapRef} className="h-[350px] w-full" />
    </div>
  );
}
