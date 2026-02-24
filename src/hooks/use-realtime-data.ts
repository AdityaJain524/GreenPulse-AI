import { useState, useEffect, useCallback, useRef } from "react";
import {
  VEHICLES,
  generateGPS,
  generateFuelLog,
  generateShipment,
  generateWeather,
  generateAlert,
  generateVehicleMetrics,
  generateEmissionTimeline,
  EMISSION_FACTOR,
  type GPSPoint,
  type FuelLog,
  type ShipmentStatus,
  type WeatherData,
  type Alert,
  type VehicleMetrics,
  type EmissionSnapshot,
} from "@/lib/mock-data";

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function useRealtimeData() {
  const [gpsStream, setGpsStream] = useState<GPSPoint[]>([]);
  const [fuelStream, setFuelStream] = useState<FuelLog[]>([]);
  const [shipments, setShipments] = useState<ShipmentStatus[]>([]);
  const [weather, setWeather] = useState<WeatherData>(
    () => ({
      temperature: 22,
      windSpeed: 15,
      rainfall: 0,
      condition: "Clear",
      timestamp: new Date(),
    })
  );
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [vehicleMetrics, setVehicleMetrics] = useState<VehicleMetrics[]>(generateVehicleMetrics);
  const [emissionTimeline, setEmissionTimeline] = useState<EmissionSnapshot[]>(generateEmissionTimeline);
  const [totalEmissions, setTotalEmissions] = useState(0);
  const [dataPoints, setDataPoints] = useState(0);

  // Calculate initial total
  useEffect(() => {
    const total = vehicleMetrics.reduce((sum, v) => sum + v.totalCarbonKg, 0);
    setTotalEmissions(total);
  }, []);

  // GPS stream — every 2s
  useEffect(() => {
    const interval = setInterval(() => {
      const v = pick(VEHICLES);
      const point = generateGPS(v.id);
      setGpsStream((prev) => [...prev.slice(-50), point]);
      setDataPoints((p) => p + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fuel stream — every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      const v = pick(VEHICLES);
      const log = generateFuelLog(v.id);
      setFuelStream((prev) => [...prev.slice(-50), log]);
      setDataPoints((p) => p + 1);

      // Update vehicle metrics and total emissions
      const carbonDelta = log.fuelLiters * EMISSION_FACTOR;
      setTotalEmissions((prev) => prev + carbonDelta);
      setVehicleMetrics((prev) =>
        prev.map((vm) =>
          vm.vehicleId === v.id
            ? {
                ...vm,
                totalCarbonKg: vm.totalCarbonKg + carbonDelta,
                fuelEfficiency: log.distanceKm / log.fuelLiters,
              }
            : vm
        )
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Shipment updates — every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      const v = pick(VEHICLES);
      const shipment = generateShipment(v.id);
      setShipments((prev) => [...prev.slice(-20), shipment]);
      setDataPoints((p) => p + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Weather — every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      setWeather(generateWeather());
      setDataPoints((p) => p + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Alerts — random every 4-8s
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const scheduleAlert = () => {
      const delay = 4000 + Math.random() * 4000;
      timeout = setTimeout(() => {
        const v = pick(VEHICLES);
        const alert = generateAlert(v.id);
        setAlerts((prev) => [alert, ...prev].slice(0, 50));
        setVehicleMetrics((prev) =>
          prev.map((vm) =>
            vm.vehicleId === v.id ? { ...vm, alertCount: vm.alertCount + 1 } : vm
          )
        );
        scheduleAlert();
      }, delay);
    };
    scheduleAlert();
    return () => clearTimeout(timeout);
  }, []);

  // Update emission timeline every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      setEmissionTimeline((prev) => {
        const newPoint: EmissionSnapshot = {
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          totalKg: 40 + Math.random() * 80,
          vehicleBreakdown: {},
        };
        return [...prev.slice(1), newPoint];
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    gpsStream,
    fuelStream,
    shipments,
    weather,
    alerts,
    vehicleMetrics,
    emissionTimeline,
    totalEmissions,
    dataPoints,
  };
}
