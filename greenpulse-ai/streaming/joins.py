"""
PHASE A — Incremental Joins Module

Combines GPS, fuel, and shipment streams using Pathway's
temporal interval joins. This is the core data fusion layer.

WHY STREAMING-SAFE:
- pw.temporal.interval_join only processes new/changed rows
- Join results auto-update when any input stream changes
- No full cartesian product — only matching time windows are joined
"""
import pathway as pw
from config import config


def join_gps_fuel(gps: pw.Table, fuel: pw.Table) -> pw.Table:
    """
    Temporally join GPS and fuel data within a 30-second window.

    This creates a unified vehicle telemetry table where each GPS
    reading is enriched with the nearest fuel consumption data.

    WHY INTERVAL JOIN:
    - GPS arrives every 2s, fuel every 3s — they don't align perfectly
    - Interval join matches rows within a time tolerance
    - Only new GPS/fuel pairs trigger recomputation

    Args:
        gps: GPS stream table
        fuel: Fuel consumption stream table

    Returns:
        pw.Table: Joined GPS + fuel telemetry table
    """
    joined = pw.temporal.interval_join(
        gps,
        fuel,
        gps.parsed_time,
        fuel.parsed_time,
        pw.temporal.interval(-30, 30),  # ±30 second window
        gps.vehicle_id == fuel.vehicle_id,  # Join on vehicle
    ).select(
        vehicle_id=gps.vehicle_id,
        latitude=gps.latitude,
        longitude=gps.longitude,
        speed=gps.speed,
        fuel_liters=fuel.fuel_liters,
        distance_km=fuel.distance_km,
        fuel_type=fuel.fuel_type,
        timestamp=gps.parsed_time,
    )

    return joined


def join_all_streams(
    gps: pw.Table,
    fuel: pw.Table,
    shipments: pw.Table,
) -> pw.Table:
    """
    Create a comprehensive vehicle telemetry table by joining
    all three streams.

    Join strategy:
    1. GPS + Fuel → telemetry (interval join, ±30s)
    2. telemetry + Shipments → full context (left join on vehicle_id)

    WHY LEFT JOIN FOR SHIPMENTS:
    - Not every GPS point has a corresponding shipment update
    - We want all telemetry data, enriched with shipment info when available

    Args:
        gps: GPS stream
        fuel: Fuel stream
        shipments: Shipment stream

    Returns:
        pw.Table: Fully joined telemetry table
    """
    # Step 1: GPS + Fuel temporal join
    telemetry = join_gps_fuel(gps, fuel)

    # Step 2: Enrich with latest shipment status per vehicle
    # Use asof_join to get the most recent shipment for each vehicle
    latest_shipments = shipments.groupby(pw.this.vehicle_id).reduce(
        vehicle_id=pw.this.vehicle_id,
        shipment_id=pw.reducers.latest(pw.this.shipment_id),
        status=pw.reducers.latest(pw.this.status),
        origin=pw.reducers.latest(pw.this.origin),
        destination=pw.reducers.latest(pw.this.destination),
        is_delayed=pw.reducers.latest(pw.this.is_delayed),
    )

    # Left join telemetry with latest shipment
    enriched = telemetry.join_left(
        latest_shipments,
        telemetry.vehicle_id == latest_shipments.vehicle_id,
    ).select(
        vehicle_id=telemetry.vehicle_id,
        latitude=telemetry.latitude,
        longitude=telemetry.longitude,
        speed=telemetry.speed,
        fuel_liters=telemetry.fuel_liters,
        distance_km=telemetry.distance_km,
        fuel_type=telemetry.fuel_type,
        timestamp=telemetry.timestamp,
        shipment_id=latest_shipments.shipment_id,
        shipment_status=latest_shipments.status,
        is_delayed=latest_shipments.is_delayed,
    )

    return enriched
