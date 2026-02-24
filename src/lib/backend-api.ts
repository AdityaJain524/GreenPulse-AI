/**
 * Backend API client for connecting to the Pathway FastAPI backend.
 *
 * Set VITE_PATHWAY_API_URL in your environment to point to
 * the running Pathway backend (e.g., http://localhost:8000).
 *
 * When not set, the dashboard uses mock data (default).
 */

const PATHWAY_API_URL = import.meta.env.VITE_PATHWAY_API_URL || "";

export const isBackendConnected = () => !!PATHWAY_API_URL;

export interface BackendMetrics {
  total_emissions_kg: number;
  active_vehicles: number;
  total_alerts: number;
  avg_fleet_efficiency: number;
  vehicles: {
    vehicle_id: string;
    total_carbon_kg: number;
    avg_efficiency: number;
    avg_speed: number;
    total_distance: number;
  }[];
}

export interface BackendAlert {
  vehicle_id: string;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
}

export interface BackendRanking {
  carbon_ranking: {
    rank: number;
    vehicle_id: string;
    total_carbon_kg: number;
    avg_efficiency: number;
  }[];
  sustainability_ranking: {
    rank: number;
    vehicle_id: string;
    score: number;
    grade: string;
  }[];
}

async function fetchApi<T>(path: string): Promise<T | null> {
  if (!PATHWAY_API_URL) return null;
  try {
    const resp = await fetch(`${PATHWAY_API_URL}${path}`);
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

async function postApi<T>(path: string, body?: unknown): Promise<T | null> {
  if (!PATHWAY_API_URL) return null;
  try {
    const resp = await fetch(`${PATHWAY_API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

export async function fetchMetrics(): Promise<BackendMetrics | null> {
  return fetchApi<BackendMetrics>("/metrics");
}

export async function fetchAlerts(): Promise<{ alerts: BackendAlert[] } | null> {
  return fetchApi<{ alerts: BackendAlert[] }>("/alerts");
}

export async function fetchRankings(): Promise<BackendRanking | null> {
  return fetchApi<BackendRanking>("/rankings");
}

export async function fetchSustainability(): Promise<any | null> {
  return fetchApi("/sustainability");
}

// ── Part 1: State Machine ──────────────────────────
export interface BackendVehicleState {
  vehicle_id: string;
  current_state: string;
  previous_state: string;
  transition_reason: string;
  risk_level: string;
  risk_score: number;
}

// ── Part 2: Predictions ────────────────────────────
export interface BackendPrediction {
  vehicle_id: string;
  predicted_carbon_10min: number;
  predicted_risk_score: number;
  risk_escalation_probability: number;
  fuel_exhaustion_minutes: number;
}

// ── Part 3: Fleet Report ───────────────────────────
export interface BackendFleetReport {
  total_carbon: number;
  active_vehicles: number;
  total_alerts: number;
  avg_risk: number;
  avg_sustainability: number;
  fleet_health: string;
  executive_summary: string;
}

export interface BackendPipelineMetrics {
  events_per_second: number;
  total_events_processed: number;
  active_streaming_tables_count: number;
  sliding_window_latency_ms: number;
  last_update_timestamp: string;
  total_streaming_nodes: number;
  memory_usage_mb: number | null;
  uptime_seconds: number;
  pathway_runtime_integrated: boolean;
}

export interface BackendRiskBreakdownRow {
  vehicle_id: string;
  risk_score: number;
  alert_impact_pct: number;
  efficiency_impact_pct: number;
  carbon_impact_pct: number;
  status_impact_pct: number;
  formula: string;
}

export interface BackendStateExplanation {
  vehicle_id: string;
  transition: string;
  reason: {
    risk_score_gt_85: boolean;
    risk_score: number;
    alerts_last_5_min: number;
    escalation_probability: number;
    carbon_growth_slope_positive: boolean;
  };
}

export interface CrisisActionResponse {
  status: "enabled" | "disabled";
  vehicle_id: string | null;
  message: string;
}

export async function fetchVehicleStates(): Promise<BackendVehicleState[] | null> {
  return fetchApi<BackendVehicleState[]>("/vehicle-state");
}

export async function fetchPredictions(): Promise<BackendPrediction[] | null> {
  return fetchApi<BackendPrediction[]>("/predictions");
}

export async function fetchLatestFleetReport(): Promise<BackendFleetReport | null> {
  return fetchApi<BackendFleetReport>("/fleet-report/latest");
}

export async function fetchFleetReportHistory(): Promise<{ reports: BackendFleetReport[] } | null> {
  return fetchApi<{ reports: BackendFleetReport[] }>("/fleet-report/history");
}

export async function fetchPipelineMetrics(): Promise<BackendPipelineMetrics | null> {
  return fetchApi<BackendPipelineMetrics>("/pipeline-metrics");
}

export async function fetchRiskBreakdown(): Promise<{ formula: string; breakdown: BackendRiskBreakdownRow[] } | null> {
  return fetchApi<{ formula: string; breakdown: BackendRiskBreakdownRow[] }>("/risk-breakdown");
}

export async function fetchStateExplanation(vehicleId: string): Promise<BackendStateExplanation | null> {
  return fetchApi<BackendStateExplanation>(`/state-explanation/${vehicleId}`);
}

export async function simulateCrisis(vehicleId: string): Promise<CrisisActionResponse | null> {
  return postApi<CrisisActionResponse>("/simulate-crisis", { vehicle_id: vehicleId });
}

export async function stopCrisis(): Promise<CrisisActionResponse | null> {
  return postApi<CrisisActionResponse>("/stop-crisis");
}

export async function askBackend(question: string): Promise<string | null> {
  if (!PATHWAY_API_URL) return null;
  try {
    const resp = await fetch(`${PATHWAY_API_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.answer;
  } catch {
    return null;
  }
}
