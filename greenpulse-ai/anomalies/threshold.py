"""
PHASE C — Threshold-Based Anomaly Detection

Simple rule-based anomaly detection on streaming data.

WHY STREAMING-SAFE:
- Pure per-row boolean evaluations — no cross-row dependencies
- Each row is classified independently as it arrives
- Output table auto-updates with each new input row
"""
import pathway as pw
from config import config


def detect_threshold_anomalies(telemetry: pw.Table) -> pw.Table:
    """
    Apply threshold-based anomaly rules to each telemetry row.

    Rules:
    1. Speed > 120 km/h → speed anomaly
    2. Fuel efficiency < 3.0 km/L → efficiency anomaly

    WHY THRESHOLD-BASED:
    - Simple, interpretable, zero latency
    - No warmup period needed (unlike statistical methods)
    - Guaranteed O(1) per row

    Args:
        telemetry: Telemetry table with speed and fuel_efficiency

    Returns:
        pw.Table: Anomaly flags table
    """
    anomaly_cfg = config.anomaly

    anomalies = telemetry.with_columns(
        is_speed_anomaly=pw.this.speed > anomaly_cfg.max_speed_kmh,
        is_efficiency_anomaly=pw.if_else(
            pw.this.fuel_efficiency > 0,
            pw.this.fuel_efficiency < anomaly_cfg.min_fuel_efficiency_km_per_l,
            False,
        ),
    )

    # Filter to only anomalous rows for the alerts table
    alerts = anomalies.filter(
        pw.this.is_speed_anomaly | pw.this.is_efficiency_anomaly
    ).select(
        vehicle_id=pw.this.vehicle_id,
        anomaly_type=pw.if_else(
            pw.this.is_speed_anomaly,
            "speed_threshold",
            "efficiency_threshold",
        ),
        severity=pw.if_else(
            pw.this.is_speed_anomaly & (pw.this.speed > 140),
            "critical",
            pw.if_else(pw.this.is_speed_anomaly, "high", "medium"),
        ),
        message=pw.if_else(
            pw.this.is_speed_anomaly,
            pw.apply(
                lambda s: f"Speed threshold exceeded: {s:.0f} km/h",
                pw.this.speed,
            ),
            pw.apply(
                lambda e: f"Fuel efficiency below threshold: {e:.1f} km/L",
                pw.this.fuel_efficiency,
            ),
        ),
        speed=pw.this.speed,
        fuel_efficiency=pw.this.fuel_efficiency,
        timestamp=pw.this.timestamp,
    )

    return alerts
