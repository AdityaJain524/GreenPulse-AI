"""
GreenPulse AI v2.0 — Main Entry Point
======================================

Orchestrates the complete streaming pipeline including:
  1. Data Ingestion (GPS, Fuel, Shipment, Weather)
  2. Incremental Joins
  3. Feature Engineering + Sliding Windows
  4. Anomaly Detection (3 systems)
  5. Vehicle State Machine (NEW)
  6. Predictive Forecasting (NEW)
  7. Fleet Intelligence Reports (NEW)
  8. Live RAG with Document Store
  9. Rankings + Risk + Sustainability Scores
 10. FastAPI server

New modules (v2.0):
  state_machine/ → 6-state event-driven vehicle state machine
  forecasting/   → Carbon, risk, and fuel exhaustion predictions
  reporting/     → 5-minute auto-generated fleet intelligence reports
"""
import threading
import pathway as pw
import uvicorn
from loguru import logger

from ingestion import (
    create_gps_stream,
    create_fuel_stream,
    create_shipment_stream,
    create_weather_stream,
)
from streaming import join_all_streams, compute_rolling_windows
from features import (
    compute_carbon_emissions,
    compute_fuel_efficiency,
    detect_acceleration_spikes,
    detect_idle_vehicles,
    detect_fuel_drops,
)
from anomalies import (
    detect_threshold_anomalies,
    detect_zscore_anomalies,
    detect_route_deviations,
)
from state_machine import compute_vehicle_states, compute_state_history
from forecasting import compute_predictions
from reporting import compute_fleet_reports
from rag import create_document_store, create_query_engine
from services import (
    compute_vehicle_rankings,
    compute_risk_scores,
    compute_sustainability_scores,
)
from api import app, register_tables
from config import config


def build_pipeline():
    """
    Full streaming pipeline — v2.0.

    Data flow (with new modules):

    GPS ──┐                                        ┌→ State Machine ──→ /vehicle-state
    Fuel ─┤── Join ──→ Carbon ──→ Windows ─────────┤→ Forecasting ───→ /predictions
    Ship ─┘           Efficiency    Rankings        └→ Fleet Reports ──→ /fleet-report
                      Features      Risk
                                    Sustainability
                      Anomalies ──────────────────────────────────────→ RAG + Alerts
    """
    logger.info("🌿 GreenPulse AI v2.0 — Building pipeline...")

    # PHASE A: Ingestion
    logger.info("📡 Creating data streams...")
    gps = create_gps_stream()
    fuel = create_fuel_stream()
    shipments = create_shipment_stream()
    weather = create_weather_stream()

    # PHASE A: Incremental Joins
    logger.info("🔗 Performing incremental joins...")
    telemetry = join_all_streams(gps, fuel, shipments)

    # PHASE B: Feature Engineering
    logger.info("⚙️ Computing features...")
    telemetry = compute_carbon_emissions(telemetry)
    telemetry = compute_fuel_efficiency(telemetry)

    accel_spikes = detect_acceleration_spikes(telemetry)
    idle_vehicles = detect_idle_vehicles(telemetry)
    fuel_drops = detect_fuel_drops(telemetry)

    # PHASE B: Sliding Windows
    logger.info("📊 Computing rolling windows...")
    windowed = compute_rolling_windows(telemetry)

    # PHASE C: Anomaly Detection
    logger.info("🚨 Starting anomaly detection...")
    threshold_alerts = detect_threshold_anomalies(telemetry)
    zscore_alerts = detect_zscore_anomalies(telemetry)
    route_alerts = detect_route_deviations(telemetry)
    all_alerts = threshold_alerts.concat(zscore_alerts).concat(route_alerts)

    # PHASE G: Rankings & Scoring
    logger.info("🏆 Computing rankings and scores...")
    rankings = compute_vehicle_rankings(windowed)
    risk_scores = compute_risk_scores(windowed, threshold_alerts, zscore_alerts, route_alerts)
    sustainability = compute_sustainability_scores(windowed)

    # PART 1: Vehicle State Machine (NEW)
    logger.info("🤖 Building vehicle state machine...")
    vehicle_states = compute_vehicle_states(windowed, risk_scores, route_alerts)
    state_history = compute_state_history(vehicle_states)

    # PART 2: Predictive Forecasting (NEW)
    logger.info("🔮 Initialising predictive forecasting engine...")
    predictions = compute_predictions(windowed, risk_scores)

    # PART 3: Fleet Intelligence Reports (NEW)
    logger.info("📋 Activating fleet report generator (5-min tumbling window)...")
    latest_report, report_history = compute_fleet_reports(
        windowed, all_alerts, risk_scores, sustainability
    )

    # PHASE D: Live RAG (include new tables)
    logger.info("🧠 Building live RAG document store...")
    doc_store = create_document_store(all_alerts, windowed)
    query_engine = create_query_engine(doc_store)

    # Register ALL tables for API access
    register_tables(
        {
            "gps": gps,
            "fuel": fuel,
            "shipments": shipments,
            "weather": weather,
            "telemetry": telemetry,
            "windowed": windowed,
            "threshold_alerts": threshold_alerts,
            "zscore_alerts": zscore_alerts,
            "route_alerts": route_alerts,
            "all_alerts": all_alerts,
            "rankings": rankings,
            "risk_scores": risk_scores,
            "sustainability": sustainability,
            "accel_spikes": accel_spikes,
            "idle_vehicles": idle_vehicles,
            # v2.0 new tables
            "vehicle_states": vehicle_states,
            "state_history": state_history,
            "predictions": predictions,
            "latest_report": latest_report,
            "report_history": report_history,
        },
        query_engine=query_engine,
    )

    logger.info("✅ GreenPulse AI v2.0 pipeline ready!")
    return windowed


def main():
    logger.info("🌿 GreenPulse AI v2.0 — Starting up...")

    build_pipeline()

    api_thread = threading.Thread(
        target=uvicorn.run,
        args=(app,),
        kwargs={
            "host": config.api.host,
            "port": config.api.port,
            "log_level": config.api.log_level,
        },
        daemon=True,
    )
    api_thread.start()
    logger.info(f"🌐 API server on http://{config.api.host}:{config.api.port}")

    logger.info("🚀 Starting Pathway streaming engine...")
    pw.run(monitoring_level=pw.MonitoringLevel.ALL)


if __name__ == "__main__":
    main()
