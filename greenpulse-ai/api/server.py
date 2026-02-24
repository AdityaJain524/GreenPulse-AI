"""
PHASE E/G — FastAPI Server & Routes (Updated)

New endpoints added:
  /vehicle-state    → current state machine snapshot per vehicle
  /state-history    → append-only state transition log
  /predictions      → carbon, risk, and fuel exhaustion forecasts
  /fleet-report/latest   → most recent auto-generated intelligence report
  /fleet-report/history  → all historical reports
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import os
import time
from datetime import datetime, timezone
from config import config

try:
    import psutil
except Exception:
    psutil = None


app = FastAPI(
    title="GreenPulse AI API",
    description="Real-Time Carbon & Sustainable Logistics Intelligence",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.api.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# In-memory references to Pathway tables
# ──────────────────────────────────────────────
_tables: Dict[str, Any] = {}
_query_engine = None
_api_started_at = time.time()
_last_total_events = 0
_last_eps_time = _api_started_at
_last_eps_value = 0.0
_crisis_state: Dict[str, Any] = {
    "enabled": False,
    "vehicle_id": None,
    "started_at": None,
}


def register_tables(tables: Dict[str, Any], query_engine=None):
    """Register Pathway tables for API access."""
    global _tables, _query_engine
    _tables = tables
    _query_engine = query_engine


def _to_datetime(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            return None
    return None


def _is_crisis_vehicle(vehicle_id: str) -> bool:
    return bool(_crisis_state.get("enabled") and _crisis_state.get("vehicle_id") == vehicle_id)


def _crisis_intensity() -> float:
    started_at = _crisis_state.get("started_at")
    if not _crisis_state.get("enabled") or started_at is None:
        return 0.0
    elapsed = max(0.0, time.time() - float(started_at))
    return min(1.0, elapsed / 120.0)


def _safe_rows(table_name: str) -> List[Dict[str, Any]]:
    table = _tables.get(table_name)
    if table is None:
        return []
    try:
        return list(table)
    except Exception:
        return []


def _get_pipeline_metrics_snapshot() -> Dict[str, Any]:
    global _last_total_events, _last_eps_time, _last_eps_value

    source_tables = ("gps", "fuel", "shipments", "weather")
    source_counts = {name: len(_safe_rows(name)) for name in source_tables}
    total_events = sum(source_counts.values())

    now = time.time()
    delta_events = total_events - _last_total_events
    delta_time = max(1e-6, now - _last_eps_time)
    if delta_events >= 0:
        _last_eps_value = delta_events / delta_time
    _last_total_events = total_events
    _last_eps_time = now

    window_rows = _safe_rows("windowed")
    latest_window_end = None
    for row in window_rows:
        maybe_dt = _to_datetime(row.get("window_end"))
        if maybe_dt and (latest_window_end is None or maybe_dt > latest_window_end):
            latest_window_end = maybe_dt

    sliding_latency_ms = 0.0
    if latest_window_end is not None:
        sliding_latency_ms = max(
            0.0,
            (datetime.now(timezone.utc) - latest_window_end).total_seconds() * 1000.0,
        )

    last_update = None
    for table_name in ("telemetry", "gps", "all_alerts", "predictions"):
        for row in _safe_rows(table_name):
            for key in ("timestamp", "parsed_time", "window_end"):
                maybe_dt = _to_datetime(row.get(key))
                if maybe_dt and (last_update is None or maybe_dt > last_update):
                    last_update = maybe_dt

    memory_mb = None
    if psutil is not None:
        try:
            process = psutil.Process(os.getpid())
            memory_mb = process.memory_info().rss / (1024 * 1024)
        except Exception:
            memory_mb = None

    active_tables = [name for name, table in _tables.items() if table is not None]
    uptime_seconds = now - _api_started_at

    return {
        "events_per_second": round(_last_eps_value, 2),
        "total_events_processed": int(total_events),
        "active_streaming_tables_count": len(active_tables),
        "sliding_window_latency_ms": round(sliding_latency_ms, 2),
        "last_update_timestamp": last_update.isoformat() if last_update else datetime.now(timezone.utc).isoformat(),
        "total_streaming_nodes": len(active_tables),
        "memory_usage_mb": round(memory_mb, 2) if memory_mb is not None else None,
        "uptime_seconds": round(uptime_seconds, 2),
        "pathway_runtime_integrated": True,
    }


# ──────────────────────────────────────────────
# Request / Response Models
# ──────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str
    context: Optional[str] = None


class AskResponse(BaseModel):
    answer: str
    sources: List[str] = []


class MetricsResponse(BaseModel):
    total_emissions_kg: float
    active_vehicles: int
    total_alerts: int
    avg_fleet_efficiency: float
    vehicles: List[Dict[str, Any]]


class VehicleStateResponse(BaseModel):
    vehicle_id: str
    current_state: str
    previous_state: str
    transition_reason: str
    risk_level: str
    risk_score: float


class PredictionResponse(BaseModel):
    vehicle_id: str
    predicted_carbon_10min: float
    predicted_risk_score: float
    risk_escalation_probability: float
    fuel_exhaustion_minutes: float


class FleetReportResponse(BaseModel):
    total_carbon: float
    active_vehicles: int
    total_alerts: int
    avg_risk: float
    avg_sustainability: float
    fleet_health: str
    executive_summary: str


class CrisisRequest(BaseModel):
    vehicle_id: str


# ──────────────────────────────────────────────
# Core Endpoints
# ──────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "name": "GreenPulse AI",
        "version": "2.0.0",
        "status": "operational",
        "streaming": True,
        "features": [
            "real-time-metrics",
            "anomaly-detection",
            "state-machine",
            "predictive-forecasting",
            "fleet-intelligence-reports",
            "live-rag",
            "pipeline-metrics",
            "xai-risk-breakdown",
            "crisis-simulation",
        ],
    }


@app.get("/pipeline-metrics")
async def get_pipeline_metrics():
    return _get_pipeline_metrics_snapshot()


@app.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    rankings = _tables.get("rankings")
    if rankings is None:
        raise HTTPException(503, "Pipeline not ready")

    rows = list(rankings)
    vehicles = []
    total_carbon = 0
    total_eff = 0

    for row in rows:
        v = {
            "vehicle_id": row["vehicle_id"],
            "total_carbon_kg": round(row["total_carbon_kg"], 1),
            "avg_efficiency": round(row["avg_efficiency"], 1),
            "avg_speed": round(row["avg_speed"], 0),
            "total_distance": round(row["total_distance"], 1),
        }
        vehicles.append(v)
        total_carbon += row["total_carbon_kg"]
        total_eff += row["avg_efficiency"]

    n = max(len(vehicles), 1)
    return MetricsResponse(
        total_emissions_kg=round(total_carbon, 1),
        active_vehicles=len(vehicles),
        total_alerts=len(list(_tables.get("all_alerts", []))),
        avg_fleet_efficiency=round(total_eff / n, 1),
        vehicles=sorted(vehicles, key=lambda x: x["total_carbon_kg"], reverse=True),
    )


@app.get("/alerts")
async def get_alerts():
    all_alerts = _tables.get("all_alerts")
    if all_alerts is None:
        return {"alerts": []}

    alerts = []
    for row in list(all_alerts):
        alerts.append({
            "vehicle_id": row.get("vehicle_id", ""),
            "type": row.get("anomaly_type", ""),
            "severity": row.get("severity", ""),
            "message": row.get("message", ""),
            "timestamp": str(row.get("timestamp", "")),
        })

    if _crisis_state.get("enabled") and _crisis_state.get("vehicle_id"):
        vehicle_id = _crisis_state["vehicle_id"]
        intensity = _crisis_intensity()
        alerts.extend(
            [
                {
                    "vehicle_id": vehicle_id,
                    "type": "HIGH_EMISSION",
                    "severity": "high",
                    "message": f"Simulated crisis: carbon emission rate increased ({intensity:.2f} intensity)",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
                {
                    "vehicle_id": vehicle_id,
                    "type": "ROUTE_DEVIATION",
                    "severity": "high",
                    "message": "Simulated crisis: route deviation probability elevated",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
                {
                    "vehicle_id": vehicle_id,
                    "type": "CRITICAL_RISK",
                    "severity": "critical",
                    "message": "Simulated crisis: multi-factor risk escalation triggered",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            ]
        )

    return {"alerts": sorted(alerts, key=lambda x: x["timestamp"], reverse=True)[:50]}


@app.get("/rankings")
async def get_rankings():
    rankings = _tables.get("rankings")
    sustainability = _tables.get("sustainability")
    result = {"carbon_ranking": [], "sustainability_ranking": []}

    if rankings:
        rows = sorted(list(rankings), key=lambda r: r["total_carbon_kg"])
        result["carbon_ranking"] = [
            {
                "rank": i + 1,
                "vehicle_id": r["vehicle_id"],
                "total_carbon_kg": round(r["total_carbon_kg"], 1),
                "avg_efficiency": round(r["avg_efficiency"], 1),
            }
            for i, r in enumerate(rows)
        ]

    if sustainability:
        rows = sorted(list(sustainability), key=lambda r: r.get("sustainability_score", 0), reverse=True)
        result["sustainability_ranking"] = [
            {
                "rank": i + 1,
                "vehicle_id": r["vehicle_id"],
                "score": round(r.get("sustainability_score", 0), 1),
                "grade": r.get("grade", "N/A"),
            }
            for i, r in enumerate(rows)
        ]

    return result


@app.get("/sustainability")
async def get_sustainability():
    sustainability = _tables.get("sustainability")
    if sustainability is None:
        return {"scores": []}

    scores = []
    for row in list(sustainability):
        scores.append({
            "vehicle_id": row["vehicle_id"],
            "score": round(row.get("sustainability_score", 0), 1),
            "grade": row.get("grade", "N/A"),
            "avg_carbon_per_km": round(row.get("avg_carbon_per_km", 0), 2),
            "avg_efficiency": round(row.get("avg_efficiency", 0), 1),
        })

    return {"scores": sorted(scores, key=lambda x: x["score"], reverse=True)}


@app.post("/ask", response_model=AskResponse)
async def ask_question(req: AskRequest):
    if _query_engine is None:
        raise HTTPException(503, "RAG engine not ready")

    try:
        result = _query_engine.answer(req.question)
        return AskResponse(
            answer=result.get("answer", "I couldn't find relevant information."),
            sources=result.get("sources", []),
        )
    except Exception as e:
        raise HTTPException(500, f"Query failed: {str(e)}")


# ──────────────────────────────────────────────
# PART 1: Vehicle State Machine Endpoints
# ──────────────────────────────────────────────

@app.get("/vehicle-state", response_model=List[VehicleStateResponse])
async def get_vehicle_states():
    """
    Current state for every vehicle in the fleet.
    Updated incrementally by Pathway whenever window metrics change.
    States: NORMAL | EFFICIENT | HIGH_EMISSION | ROUTE_DEVIATION | IDLE | CRITICAL_RISK
    """
    vehicle_states = _tables.get("vehicle_states")
    if vehicle_states is None:
        raise HTTPException(503, "State machine not ready")

    states = []
    for row in list(vehicle_states):
        current_state = row.get("current_state", "NORMAL")
        transition_reason = row.get("transition_reason", "")
        risk_level = row.get("risk_level", "low")
        risk_score = round(row.get("risk_score", 0.0), 1)

        if _is_crisis_vehicle(row.get("vehicle_id", "")):
            intensity = _crisis_intensity()
            current_state = "CRITICAL_RISK"
            risk_level = "critical"
            risk_score = min(100.0, round(max(risk_score, 85.0) + intensity * 12.0, 1))
            transition_reason = "Simulated crisis mode active: emission + alerts + route deviation escalation"

        states.append(VehicleStateResponse(
            vehicle_id=row.get("vehicle_id", ""),
            current_state=current_state,
            previous_state=row.get("previous_state", "NORMAL"),
            transition_reason=transition_reason,
            risk_level=risk_level,
            risk_score=risk_score,
        ))

    return sorted(states, key=lambda x: x.risk_score, reverse=True)


@app.get("/state-history")
async def get_state_history(vehicle_id: Optional[str] = None, limit: int = 50):
    """
    Append-only state transition history.
    Optionally filter by vehicle_id.
    """
    state_history = _tables.get("state_history")
    if state_history is None:
        return {"history": []}

    history = []
    for row in list(state_history):
        if vehicle_id and row.get("vehicle_id") != vehicle_id:
            continue
        history.append({
            "vehicle_id": row.get("vehicle_id", ""),
            "state": row.get("state", ""),
            "risk_level": row.get("risk_level", ""),
            "reason": row.get("reason", ""),
        })

    return {"history": history[:limit]}


@app.get("/risk-breakdown")
async def get_risk_breakdown():
    risk_scores = _tables.get("risk_scores")
    if risk_scores is None:
        raise HTTPException(503, "Risk scoring not ready")

    formula = "Risk Score = 0.35(alerts) + 0.25(efficiency) + 0.25(carbon) + 0.15(status)"
    rows = []
    for row in list(risk_scores):
        risk_score = round(row.get("risk_score", 0.0), 1)
        alert_pct = round(row.get("alert_impact_pct", 0.0), 2)
        efficiency_pct = round(row.get("efficiency_impact_pct", 0.0), 2)
        carbon_pct = round(row.get("carbon_impact_pct", 0.0), 2)
        status_pct = round(row.get("status_impact_pct", 0.0), 2)

        if _is_crisis_vehicle(row.get("vehicle_id", "")):
            intensity = _crisis_intensity()
            risk_score = min(100.0, round(max(risk_score, 88.0) + intensity * 10.0, 1))
            alert_pct = round(min(100.0, alert_pct + intensity * 8.0), 2)
            carbon_pct = round(min(100.0, carbon_pct + intensity * 6.0), 2)

        rows.append(
            {
                "vehicle_id": row.get("vehicle_id", ""),
                "risk_score": risk_score,
                "alert_impact_pct": alert_pct,
                "efficiency_impact_pct": efficiency_pct,
                "carbon_impact_pct": carbon_pct,
                "status_impact_pct": status_pct,
                "formula": formula,
            }
        )

    return {
        "formula": formula,
        "breakdown": sorted(rows, key=lambda x: x["risk_score"], reverse=True),
    }


@app.get("/state-explanation/{vehicle_id}")
async def get_state_explanation(vehicle_id: str):
    states = {row.get("vehicle_id", ""): row for row in _safe_rows("vehicle_states")}
    predictions = {row.get("vehicle_id", ""): row for row in _safe_rows("predictions")}
    risk_rows = {row.get("vehicle_id", ""): row for row in _safe_rows("risk_scores")}

    state_row = states.get(vehicle_id)
    if state_row is None:
        raise HTTPException(404, f"Vehicle {vehicle_id} not found")

    pred_row = predictions.get(vehicle_id, {})
    risk_row = risk_rows.get(vehicle_id, {})

    current_state = state_row.get("current_state", "NORMAL")
    previous_state = state_row.get("previous_state", "NORMAL")
    risk_score = float(risk_row.get("risk_score", state_row.get("risk_score", 0.0)))
    alerts_5m = int(risk_row.get("total_alerts", 0))
    escalation_probability = float(pred_row.get("risk_escalation_probability", 0.0))
    predicted_carbon = float(pred_row.get("predicted_carbon_10min", 0.0))
    current_carbon = float(risk_row.get("avg_carbon_kg", 0.0))
    carbon_growth_positive = predicted_carbon > current_carbon

    if _is_crisis_vehicle(vehicle_id):
        current_state = "CRITICAL_RISK"
        risk_score = max(risk_score, 90.0)
        alerts_5m = max(alerts_5m, 3)
        escalation_probability = max(escalation_probability, 0.78)
        carbon_growth_positive = True

    return {
        "vehicle_id": vehicle_id,
        "transition": f"Vehicle {vehicle_id} moved from {previous_state} → {current_state}",
        "reason": {
            "risk_score_gt_85": risk_score > 85.0,
            "risk_score": round(risk_score, 1),
            "alerts_last_5_min": alerts_5m,
            "escalation_probability": round(escalation_probability, 3),
            "carbon_growth_slope_positive": carbon_growth_positive,
        },
    }


# ──────────────────────────────────────────────
# PART 2: Prediction Endpoints
# ──────────────────────────────────────────────

@app.get("/predictions", response_model=List[PredictionResponse])
async def get_predictions():
    """
    Real-time predictive forecasts per vehicle.
    - predicted_carbon_10min: Carbon output predicted 10 min from now (kg)
    - predicted_risk_score: Forecasted risk score (0-100)
    - risk_escalation_probability: Probability of risk increasing (0-1)
    - fuel_exhaustion_minutes: Minutes until critically low fuel (-1 = safe)
    """
    predictions = _tables.get("predictions")
    if predictions is None:
        raise HTTPException(503, "Forecasting engine not ready")

    results = []
    for row in list(predictions):
        predicted_carbon = round(row.get("predicted_carbon_10min", 0.0), 2)
        predicted_risk = round(row.get("predicted_risk_score", 0.0), 1)
        escalation = round(row.get("risk_escalation_probability", 0.0), 3)
        fuel_eta = round(row.get("fuel_exhaustion_minutes", -1.0), 1)

        if _is_crisis_vehicle(row.get("vehicle_id", "")):
            intensity = _crisis_intensity()
            predicted_carbon = round(predicted_carbon * (1.2 + intensity * 0.6), 2)
            predicted_risk = round(min(100.0, max(predicted_risk, 88.0) + intensity * 10.0), 1)
            escalation = round(min(0.99, max(escalation, 0.78) + intensity * 0.15), 3)
            fuel_eta = round(min(59.0, max(10.0, fuel_eta * (0.55 - intensity * 0.15))), 1)

        results.append(PredictionResponse(
            vehicle_id=row.get("vehicle_id", ""),
            predicted_carbon_10min=predicted_carbon,
            predicted_risk_score=predicted_risk,
            risk_escalation_probability=escalation,
            fuel_exhaustion_minutes=fuel_eta,
        ))

    return sorted(results, key=lambda x: x.risk_escalation_probability, reverse=True)


# ──────────────────────────────────────────────
# PART 3: Fleet Intelligence Report Endpoints
# ──────────────────────────────────────────────

@app.get("/fleet-report/latest", response_model=FleetReportResponse)
async def get_latest_fleet_report():
    """
    Latest auto-generated fleet intelligence report.
    Generated every 5 minutes by Pathway's tumbling window engine.
    No cron job — fully event-driven.
    """
    latest_report = _tables.get("latest_report")
    if latest_report is None:
        raise HTTPException(503, "Report generator not ready")

    rows = list(latest_report)
    if not rows:
        raise HTTPException(404, "No reports generated yet")

    row = rows[0]
    total_alerts = int(row.get("total_alerts", 0))
    fleet_health = row.get("fleet_health", "unknown")
    executive_summary = row.get("executive_summary", "")

    if _crisis_state.get("enabled"):
        total_alerts = max(total_alerts, 8)
        fleet_health = "degraded"
        executive_summary = (
            executive_summary
            + f" Crisis simulation active for vehicle {_crisis_state.get('vehicle_id')};"
            " executive posture shifted to incident monitoring."
        )

    return FleetReportResponse(
        total_carbon=round(row.get("total_carbon", 0.0), 2),
        active_vehicles=int(row.get("active_vehicles", 0)),
        total_alerts=total_alerts,
        avg_risk=round(row.get("avg_risk", 0.0), 1),
        avg_sustainability=round(row.get("avg_sustainability", 0.0), 1),
        fleet_health=fleet_health,
        executive_summary=executive_summary,
    )


@app.get("/fleet-report/history")
async def get_fleet_report_history(limit: int = 10):
    """
    Historical fleet intelligence reports (last N reports).
    Appended automatically every 5 minutes by the streaming engine.
    """
    report_history = _tables.get("report_history")
    if report_history is None:
        return {"reports": []}

    reports = []
    for row in list(report_history):
        fleet_health = row.get("fleet_health", "unknown")
        if _crisis_state.get("enabled"):
            fleet_health = "degraded"
        reports.append({
            "total_carbon": round(row.get("total_carbon", 0.0), 2),
            "active_vehicles": int(row.get("active_vehicles", 0)),
            "total_alerts": int(row.get("total_alerts", 0)),
            "avg_risk": round(row.get("avg_risk", 0.0), 1),
            "avg_sustainability": round(row.get("avg_sustainability", 0.0), 1),
            "fleet_health": fleet_health,
            "executive_summary": row.get("executive_summary", ""),
        })

    return {"reports": reports[:limit]}


@app.post("/simulate-crisis")
async def simulate_crisis(req: CrisisRequest):
    _crisis_state["enabled"] = True
    _crisis_state["vehicle_id"] = req.vehicle_id
    _crisis_state["started_at"] = time.time()
    return {
        "status": "enabled",
        "vehicle_id": req.vehicle_id,
        "message": "Crisis mode activated for selected vehicle; streaming pipeline remains incremental.",
    }


@app.post("/stop-crisis")
async def stop_crisis():
    prev_vehicle = _crisis_state.get("vehicle_id")
    _crisis_state["enabled"] = False
    _crisis_state["vehicle_id"] = None
    _crisis_state["started_at"] = None
    return {
        "status": "disabled",
        "vehicle_id": prev_vehicle,
        "message": "Crisis mode stopped and system reverted to baseline streaming behavior.",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "tables_registered": list(_tables.keys()),
        "rag_ready": _query_engine is not None,
        "features": {
            "state_machine": "vehicle_states" in _tables,
            "forecasting": "predictions" in _tables,
            "fleet_reports": "latest_report" in _tables,
            "pipeline_metrics": True,
            "risk_explainability": "risk_scores" in _tables,
            "crisis_mode": _crisis_state.get("enabled", False),
        },
    }
