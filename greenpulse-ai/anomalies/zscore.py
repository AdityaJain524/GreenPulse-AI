"""
PHASE C — Rolling Z-Score Anomaly Detection

Detects statistical outliers using rolling mean and standard deviation.

WHY STREAMING-SAFE:
- Z-score is computed per-vehicle using windowed aggregations
- Pathway's windowby maintains running statistics incrementally
- No need to store full history — just running sum, sum of squares, count
"""
import pathway as pw
import math
from config import config


def detect_zscore_anomalies(telemetry: pw.Table) -> pw.Table:
    """
    Detect anomalies using rolling Z-score on speed and carbon emissions.

    Z-score = (value - mean) / std_dev

    A z-score > 2.5 indicates an outlier.

    WHY Z-SCORE:
    - Adapts to each vehicle's normal behavior
    - Catches gradual drift that thresholds miss
    - Statistically principled — 2.5σ = ~0.6% false positive rate

    Implementation:
    - Uses 5-minute windows to compute mean/std per vehicle
    - Compares each new reading against the window statistics

    Args:
        telemetry: Telemetry table with speed and carbon_kg

    Returns:
        pw.Table: Z-score anomaly alerts
    """
    threshold = config.anomaly.zscore_threshold
    window_sec = config.window.window_duration_sec

    # Compute rolling statistics per vehicle
    stats = telemetry.windowby(
        pw.this.timestamp,
        window=pw.temporal.sliding(
            duration=pw.Duration(seconds=window_sec),
            hop=pw.Duration(seconds=60),
        ),
        instance=pw.this.vehicle_id,
    ).reduce(
        vehicle_id=pw.this._instance,
        mean_speed=pw.reducers.avg(pw.this.speed),
        # We compute std via avg of squares - square of avg
        avg_speed_sq=pw.reducers.avg(pw.this.speed * pw.this.speed),
        mean_carbon=pw.reducers.avg(pw.this.carbon_kg),
        avg_carbon_sq=pw.reducers.avg(pw.this.carbon_kg * pw.this.carbon_kg),
        count=pw.reducers.count(),
        latest_speed=pw.reducers.latest(pw.this.speed),
        latest_carbon=pw.reducers.latest(pw.this.carbon_kg),
        window_time=pw.this._pw_window_start,
    )

    # Compute standard deviation: std = sqrt(E[X²] - E[X]²)
    stats = stats.with_columns(
        std_speed=pw.apply(
            lambda avg_sq, avg: max(math.sqrt(max(avg_sq - avg * avg, 0)), 0.001),
            pw.this.avg_speed_sq,
            pw.this.mean_speed,
        ),
        std_carbon=pw.apply(
            lambda avg_sq, avg: max(math.sqrt(max(avg_sq - avg * avg, 0)), 0.001),
            pw.this.avg_carbon_sq,
            pw.this.mean_carbon,
        ),
    )

    # Compute Z-scores for latest values
    zscores = stats.with_columns(
        speed_zscore=pw.apply(
            lambda val, mean, std: abs(val - mean) / std,
            pw.this.latest_speed,
            pw.this.mean_speed,
            pw.this.std_speed,
        ),
        carbon_zscore=pw.apply(
            lambda val, mean, std: abs(val - mean) / std,
            pw.this.latest_carbon,
            pw.this.mean_carbon,
            pw.this.std_carbon,
        ),
    )

    # Filter anomalies
    anomalies = zscores.filter(
        (pw.this.speed_zscore > threshold) | (pw.this.carbon_zscore > threshold)
    ).select(
        vehicle_id=pw.this.vehicle_id,
        anomaly_type=pw.if_else(
            pw.this.speed_zscore > threshold,
            "speed_zscore",
            "carbon_zscore",
        ),
        severity=pw.if_else(
            (pw.this.speed_zscore > threshold * 1.5)
            | (pw.this.carbon_zscore > threshold * 1.5),
            "critical",
            "high",
        ),
        message=pw.apply(
            lambda vid, sz, cz: (
                f"Z-score anomaly: speed z={sz:.1f}, carbon z={cz:.1f}"
            ),
            pw.this.vehicle_id,
            pw.this.speed_zscore,
            pw.this.carbon_zscore,
        ),
        speed_zscore=pw.this.speed_zscore,
        carbon_zscore=pw.this.carbon_zscore,
        timestamp=pw.this.window_time,
    )

    return anomalies
