"""
PHASE B — Sliding Window Computations

Implements 5-minute tumbling windows for feature aggregation.

WHY STREAMING-SAFE:
- pw.temporal.windowby creates tumbling windows that auto-expire
- Each window is computed incrementally — only new data in the window
  triggers recomputation
- Old windows are garbage-collected automatically
"""
import pathway as pw
from config import config


def compute_rolling_windows(telemetry: pw.Table) -> pw.Table:
    """
    Compute 5-minute rolling window aggregations per vehicle.

    Aggregations:
    - Average speed (km/h)
    - Total fuel consumed (liters)
    - Total distance (km)
    - Total carbon emissions (kg CO₂)
    - Fuel efficiency (km/L)
    - Data point count

    WHY TUMBLING WINDOW:
    - Fixed 5-minute buckets provide consistent time slices
    - No overlap means no double-counting
    - Each window is independent → easy to parallelize

    Args:
        telemetry: Joined telemetry table with GPS + fuel data

    Returns:
        pw.Table: Windowed aggregation results per vehicle per window
    """
    emission_factor = config.emission.default_emission_factor

    windowed = telemetry.windowby(
        pw.this.timestamp,
        window=pw.temporal.tumbling(
            duration=pw.Duration(seconds=config.window.window_duration_sec)
        ),
        instance=pw.this.vehicle_id,  # Separate windows per vehicle
    ).reduce(
        vehicle_id=pw.this._instance,
        window_start=pw.this._pw_window_start,
        window_end=pw.this._pw_window_end,
        avg_speed=pw.reducers.avg(pw.this.speed),
        max_speed=pw.reducers.max(pw.this.speed),
        min_speed=pw.reducers.min(pw.this.speed),
        total_fuel=pw.reducers.sum(pw.this.fuel_liters),
        total_distance=pw.reducers.sum(pw.this.distance_km),
        data_points=pw.reducers.count(),
    )

    # Compute derived window metrics
    windowed = windowed.with_columns(
        # Carbon = fuel × emission factor
        carbon_kg=pw.this.total_fuel * emission_factor,
        # Fuel efficiency = distance / fuel (handle division by zero)
        fuel_efficiency=pw.if_else(
            pw.this.total_fuel > 0,
            pw.this.total_distance / pw.this.total_fuel,
            0.0,
        ),
        # Speed variance indicator (max - min)
        speed_variance=pw.this.max_speed - pw.this.min_speed,
    )

    return windowed
