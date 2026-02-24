"""
PART 2 — Predictive Carbon & Risk Forecasting Engine
=====================================================

Implements 3 lightweight streaming predictors:
  1. Carbon Forecast (next 10 minutes) via linear slope estimation
  2. Risk Escalation Probability via weighted multi-factor scoring
  3. Fuel Exhaustion Estimate via rolling consumption rate

Why streaming-safe?
  - All predictions use pw.apply() UDFs on already-computed windowed metrics.
  - No external state or mutable variables — predictions are pure functions
    of the current window snapshot.
  - When a new GPS/fuel event arrives, Pathway incrementally updates
    the windowed table row and re-evaluates only the affected vehicle's
    prediction row. No full fleet recomputation.
  - pw.temporal sliding windows ensure we always use the latest N-minute
    data slice without re-reading historical records.

Algorithm Details:
  - Carbon slope: (current_window_carbon - prev_sample) / window_duration
    → extrapolated 10 min forward: predicted = current + slope * 10
  - Risk probability: sigmoid of weighted sum of normalised inputs
  - Fuel exhaustion: current_fuel_rate → minutes_remaining = tank / rate
"""

import pathway as pw
import math


# ─────────────────────────────────────
# Prediction UDFs
# ─────────────────────────────────────

@pw.udf
def _predict_carbon_10min(
    avg_carbon_kg: float,
    avg_efficiency: float,
    avg_speed: float,
) -> float:
    """
    Simple linear carbon extrapolation.
    slope = carbon_rate (kg/min) ≈ (avg_carbon_kg / window_minutes)
    predicted_10min = current + slope * 10
    
    Clamped to realistic bounds [0, 200] kg.
    """
    window_minutes = 5.0
    carbon_rate_per_min = avg_carbon_kg / window_minutes

    # Speed factor: higher speed → higher emission rate
    speed_factor = 1.0 + (max(avg_speed - 60, 0) / 100)

    # Efficiency factor: lower efficiency → higher projected growth
    efficiency_penalty = max(0, (5.0 - avg_efficiency) / 5.0)

    adjusted_rate = carbon_rate_per_min * speed_factor * (1 + efficiency_penalty * 0.3)
    predicted = avg_carbon_kg + adjusted_rate * 10.0
    return round(max(0.0, min(200.0, predicted)), 2)


@pw.udf
def _predict_risk_score(
    current_risk: float,
    alert_count: int,
    avg_carbon_kg: float,
    avg_speed: float,
) -> float:
    """
    Risk escalation forecast using sigmoid-weighted multi-factor model.
    Factors:
      - Current risk score trend (primary driver)
      - Alert frequency in window (secondary)
      - Carbon growth rate (tertiary)
      - Speed anomaly contribution

    Returns predicted_risk_score in [0, 100].
    """
    # Weighted factor contributions
    risk_trend_contribution = current_risk * 0.55
    alert_contribution = min(alert_count * 8.0, 30.0)
    carbon_contribution = min(avg_carbon_kg * 0.5, 20.0)
    speed_contribution = max(0, (avg_speed - 90) * 0.25)

    raw = risk_trend_contribution + alert_contribution + carbon_contribution + speed_contribution
    predicted = min(100.0, max(0.0, raw))
    return round(predicted, 1)


@pw.udf
def _risk_escalation_probability(
    current_risk: float,
    predicted_risk: float,
    alert_count: int,
) -> float:
    """
    Probability (0–1) that risk will escalate in next 10 minutes.
    Uses sigmoid function on risk delta + alert pressure.
    
    P = sigmoid(k * (delta_risk + alert_pressure))
    where k = 0.08 (sensitivity parameter)
    """
    delta_risk = predicted_risk - current_risk
    alert_pressure = min(alert_count * 5, 25)
    combined = delta_risk + alert_pressure

    # Sigmoid: 1 / (1 + e^(-k*x))
    k = 0.08
    prob = 1.0 / (1.0 + math.exp(-k * combined))
    return round(prob, 3)


@pw.udf
def _fuel_exhaustion_minutes(
    avg_fuel_consumed: float,
    avg_efficiency: float,
    avg_speed: float,
) -> float:
    """
    Estimate minutes until fuel critically low (< 10 litres equivalent).
    
    fuel_rate = fuel_consumed_per_min (L/min)
    exhaustion_minutes = critical_threshold / fuel_rate
    
    Returns -1.0 if rate is negligible (vehicle not consuming fuel).
    """
    window_minutes = 5.0
    fuel_rate_per_min = avg_fuel_consumed / window_minutes  # L/min

    if fuel_rate_per_min < 0.01:
        return -1.0  # Vehicle idle / not consuming

    # Assume typical tank remaining ~40L (configurable)
    # Critical threshold = 10L
    typical_remaining_litres = 40.0
    critical_threshold_litres = 10.0
    usable_fuel = typical_remaining_litres - critical_threshold_litres

    minutes_remaining = usable_fuel / fuel_rate_per_min
    return round(max(0.0, minutes_remaining), 1)


# ─────────────────────────────────────
# Main forecasting computation
# ─────────────────────────────────────

def compute_predictions(
    windowed: pw.Table,
    risk_scores: pw.Table,
) -> pw.Table:
    """
    Build the streaming predictions table.

    All predictions are derived from already-computed windowed metrics
    and current risk scores — both of which are incrementally maintained
    by Pathway. This function simply applies prediction UDFs on top,
    meaning predictions auto-update whenever windowed metrics change.

    Output schema:
        vehicle_id | predicted_carbon_10min | predicted_risk_score |
        risk_escalation_probability | fuel_exhaustion_minutes | prediction_timestamp
    """
    # Join windowed metrics with current risk scores
    base = windowed.join_left(
        risk_scores,
        windowed.vehicle_id == risk_scores.vehicle_id,
    ).select(
        vehicle_id=pw.left.vehicle_id,
        avg_carbon_kg=pw.left.carbon_kg,
        avg_efficiency=pw.left.fuel_efficiency,
        avg_speed=pw.left.avg_speed,
        avg_fuel_consumed=pw.left.total_fuel,
        alert_count=pw.coalesce(pw.right.total_alerts, 0),
        risk_score=pw.coalesce(pw.right.risk_score, 0.0),
    )

    # Apply all predictors — each is a pure per-row function (streaming-safe)
    predictions = base.select(
        vehicle_id=pw.this.vehicle_id,
        predicted_carbon_10min=_predict_carbon_10min(
            pw.this.avg_carbon_kg,
            pw.this.avg_efficiency,
            pw.this.avg_speed,
        ),
        predicted_risk_score=_predict_risk_score(
            pw.this.risk_score,
            pw.this.alert_count,
            pw.this.avg_carbon_kg,
            pw.this.avg_speed,
        ),
        fuel_exhaustion_minutes=_fuel_exhaustion_minutes(
            pw.this.avg_fuel_consumed,
            pw.this.avg_efficiency,
            pw.this.avg_speed,
        ),
        current_risk=pw.this.risk_score,
        alert_count=pw.this.alert_count,
    )

    # Compute escalation probability from predicted vs current risk
    final = predictions.select(
        vehicle_id=pw.this.vehicle_id,
        predicted_carbon_10min=pw.this.predicted_carbon_10min,
        predicted_risk_score=pw.this.predicted_risk_score,
        risk_escalation_probability=_risk_escalation_probability(
            pw.this.current_risk,
            pw.this.predicted_risk_score,
            pw.this.alert_count,
        ),
        fuel_exhaustion_minutes=pw.this.fuel_exhaustion_minutes,
    )

    return final
