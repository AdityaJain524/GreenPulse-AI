"""
PHASE B — Fuel Efficiency Metrics

WHY STREAMING-SAFE:
- Per-row computation — no state dependency between rows
"""
import pathway as pw


def compute_fuel_efficiency(telemetry: pw.Table) -> pw.Table:
    """
    Compute fuel efficiency (km/L) for each telemetry point.

    Args:
        telemetry: Telemetry table with distance_km and fuel_liters

    Returns:
        pw.Table: Telemetry with fuel_efficiency column
    """
    return telemetry.with_columns(
        fuel_efficiency=pw.if_else(
            pw.this.fuel_liters > 0,
            pw.this.distance_km / pw.this.fuel_liters,
            0.0,
        ),
    )
