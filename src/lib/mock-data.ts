// Vehicle fleet data
export const VEHICLES = [
  { id: "V-101", name: "Truck Alpha", type: "Heavy Freight" },
  { id: "V-102", name: "Truck Beta", type: "Medium Freight" },
  { id: "V-103", name: "Van Gamma", type: "Light Delivery" },
  { id: "V-104", name: "Truck Delta", type: "Heavy Freight" },
  { id: "V-105", name: "Van Epsilon", type: "Light Delivery" },
  { id: "V-106", name: "Truck Zeta", type: "Medium Freight" },
];

export const EMISSION_FACTOR = 2.68; // kg CO2 per liter diesel

export interface GPSPoint {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: Date;
}

export interface FuelLog {
  vehicleId: string;
  fuelLiters: number;
  distanceKm: number;
  timestamp: Date;
}

export interface ShipmentStatus {
  shipmentId: string;
  vehicleId: string;
  status: "in_transit" | "delivered" | "delayed" | "loading";
  origin: string;
  destination: string;
  timestamp: Date;
}

export interface WeatherData {
  temperature: number;
  windSpeed: number;
  rainfall: number;
  condition: string;
  timestamp: Date;
}

export interface Alert {
  id: string;
  type: "anomaly" | "inefficiency" | "deviation" | "weather";
  severity: "low" | "medium" | "high" | "critical";
  vehicleId: string;
  message: string;
  timestamp: Date;
}

export interface VehicleMetrics {
  vehicleId: string;
  name: string;
  type: string;
  totalCarbonKg: number;
  fuelEfficiency: number; // km/L
  avgSpeed: number;
  tripCount: number;
  alertCount: number;
  status: "active" | "idle" | "maintenance";
}

export interface EmissionSnapshot {
  time: string;
  totalKg: number;
  vehicleBreakdown: Record<string, number>;
}

// Random helpers
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max));
const pick = <T>(arr: T[]): T => arr[randInt(0, arr.length)];

// Generate GPS point — India region (Delhi–Mumbai–Bangalore corridor)
export function generateGPS(vehicleId: string): GPSPoint {
  return {
    vehicleId,
    latitude: rand(12.9, 28.7),   // Bangalore to Delhi
    longitude: rand(72.8, 77.6),   // Mumbai to Delhi
    speed: rand(20, 120),
    timestamp: new Date(),
  };
}

// Generate fuel log
export function generateFuelLog(vehicleId: string): FuelLog {
  const fuelLiters = rand(2, 15);
  return {
    vehicleId,
    fuelLiters,
    distanceKm: fuelLiters * rand(3, 8),
    timestamp: new Date(),
  };
}

// Generate shipment
const CITIES = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad"];
let shipmentCounter = 200;
export function generateShipment(vehicleId: string): ShipmentStatus {
  return {
    shipmentId: `S-${++shipmentCounter}`,
    vehicleId,
    status: pick(["in_transit", "delivered", "delayed", "loading"] as const),
    origin: pick(CITIES),
    destination: pick(CITIES),
    timestamp: new Date(),
  };
}

// Generate weather
export function generateWeather(): WeatherData {
  const conditions = ["Clear", "Cloudy", "Rain", "Heavy Rain", "Fog", "Storm"];
  return {
    temperature: rand(-5, 35),
    windSpeed: rand(0, 60),
    rainfall: rand(0, 30),
    condition: pick(conditions),
    timestamp: new Date(),
  };
}

// Generate alert
let alertCounter = 0;
const ALERT_TEMPLATES: { type: Alert["type"]; severity: Alert["severity"]; msg: string }[] = [
  { type: "anomaly", severity: "high", msg: "Unusual speed spike detected — {speed} km/h" },
  { type: "inefficiency", severity: "medium", msg: "Fuel efficiency dropped below threshold — {eff} km/L" },
  { type: "deviation", severity: "high", msg: "Route deviation detected — {dist} km off route" },
  { type: "weather", severity: "critical", msg: "Severe weather alert — {cond} in vehicle area" },
  { type: "anomaly", severity: "low", msg: "Minor idle time anomaly — {min} min idle" },
  { type: "inefficiency", severity: "medium", msg: "Excessive fuel consumption in last segment" },
];

export function generateAlert(vehicleId: string): Alert {
  const tpl = pick(ALERT_TEMPLATES);
  const msg = tpl.msg
    .replace("{speed}", String(randInt(110, 160)))
    .replace("{eff}", rand(2, 4).toFixed(1))
    .replace("{dist}", rand(5, 25).toFixed(1))
    .replace("{cond}", pick(["Storm", "Heavy Rain", "Fog"]))
    .replace("{min}", String(randInt(15, 60)));
  return {
    id: `ALT-${++alertCounter}`,
    type: tpl.type,
    severity: tpl.severity,
    vehicleId,
    message: msg,
    timestamp: new Date(),
  };
}

// Generate initial vehicle metrics
export function generateVehicleMetrics(): VehicleMetrics[] {
  return VEHICLES.map((v) => ({
    vehicleId: v.id,
    name: v.name,
    type: v.type,
    totalCarbonKg: rand(50, 500),
    fuelEfficiency: rand(3, 8),
    avgSpeed: rand(40, 90),
    tripCount: randInt(3, 20),
    alertCount: randInt(0, 8),
    status: pick(["active", "idle", "maintenance"] as const),
  }));
}

// Generate emission timeline (last 24 hours in 30-min buckets)
export function generateEmissionTimeline(): EmissionSnapshot[] {
  const now = new Date();
  const snapshots: EmissionSnapshot[] = [];
  for (let i = 47; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 30 * 60 * 1000);
    const breakdown: Record<string, number> = {};
    let total = 0;
    VEHICLES.forEach((v) => {
      const val = rand(2, 25);
      breakdown[v.id] = val;
      total += val;
    });
    snapshots.push({
      time: time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      totalKg: total,
      vehicleBreakdown: breakdown,
    });
  }
  return snapshots;
}
