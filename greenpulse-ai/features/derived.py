"""
PHASE B — Derived Features

Detects:
1. Sudden acceleration spikes
2. Fuel drop anomalies
3. Idle vehicle detection

WHY STREAMING-SAFE:
- Uses pw.temporal.windowby for stateful computations
- State is maintained per-vehicle, per-window
- No global state — fully partitioned by vehicle_id
"""
import pathway as pw
from config import config


def detect_acceleration_spikes(telemetry: pw.Table) -> pw.Table:
    """
    Detect sudden acceleration by comparing consecutive speed readings.

    Uses a 10-second window per vehicle to compute speed change rate.

    WHY WINDOW-BASED:
    - Need at least 2 consecutive readings to compute acceleration
    - 10-second micro-window captures immediate speed changes
    - Pathway handles window state automatically

    Args:
        telemetry: Telemetry table with speed and timestamp

    Returns:
        pw.Table: Telemetry with is_acceleration_spike flag
    """
    threshold = config.anomaly.max_acceleration_kmh_per_sec

    # Compute speed stats in micro-windows
    micro_window = telemetry.windowby(
        pw.this.timestamp,
        window=pw.temporal.tumbling(duration=pw.Duration(seconds=10)),
        instance=pw.this.vehicle_id,
    ).reduce(
        vehicle_id=pw.this._instance,
        max_speed=pw.reducers.max(pw.this.speed),
        min_speed=pw.reducers.min(pw.this.speed),
        window_time=pw.this._pw_window_start,
    )

    # Speed delta > threshold indicates spike
    spikes = micro_window.with_columns(
        speed_delta=pw.this.max_speed - pw.this.min_speed,
        is_acceleration_spike=(pw.this.max_speed - pw.this.min_speed) > threshold,
    )

    return spikes


def detect_idle_vehicles(telemetry: pw.Table) -> pw.Table:
    """
    Detect vehicles that have been idle (speed < 5 km/h) for too long.

    Uses a rolling window to count low-speed data points.

    Args:
        telemetry: Telemetry table

    Returns:
        pw.Table: Vehicle idle status table
    """
    idle_threshold = config.anomaly.max_idle_duration_sec

    # Window by vehicle, check if all readings show low speed
    idle_check = telemetry.windowby(
        pw.this.timestamp,
        window=pw.temporal.tumbling(
            duration=pw.Duration(seconds=idle_threshold)
        ),
        instance=pw.this.vehicle_id,
    ).reduce(
        vehicle_id=pw.this._instance,
        avg_speed=pw.reducers.avg(pw.this.speed),
        data_points=pw.reducers.count(),
        window_time=pw.this._pw_window_start,
    )

    idle_vehicles = idle_check.with_columns(
        is_idle=(pw.this.avg_speed < 5.0) & (pw.this.data_points >= 3),
    )

    return idle_vehicles


def detect_fuel_drops(telemetry: pw.Table) -> pw.Table:
    """
    Detect unusual fuel consumption drops (possible fuel theft or leak).

    Flags any single fuel reading above the threshold.

    Args:
        telemetry: Telemetry table

    Returns:
        pw.Table: Telemetry with fuel_drop_anomaly flag
    """
    threshold = config.anomaly.fuel_drop_threshold_liters

    return telemetry.with_columns(
        is_fuel_drop=pw.this.fuel_liters > threshold,
    )
