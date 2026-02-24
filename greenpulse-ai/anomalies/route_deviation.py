"""
PHASE C — Route Deviation Detection

Compares GPS coordinates against expected route bounds.

WHY STREAMING-SAFE:
- Per-row distance computation — no cross-row dependency
- Uses Haversine formula for accurate GPS distance
- Each GPS point is evaluated independently
"""
import pathway as pw
import math
from config import config


# Expected route center points per vehicle (for demo)
# In production, load from a route planning database
EXPECTED_ROUTES = {
    "V-101": (40.7128, -74.0060),   # New York area
    "V-102": (42.3601, -71.0589),   # Boston area
    "V-103": (39.9526, -75.1652),   # Philadelphia area
    "V-104": (40.7357, -74.1724),   # Newark area
    "V-105": (41.7658, -72.6734),   # Hartford area
    "V-106": (39.2904, -76.6122),   # Baltimore area
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute Haversine distance between two GPS points in km."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def detect_route_deviations(telemetry: pw.Table) -> pw.Table:
    """
    Detect if a vehicle has deviated from its expected route.

    Computes the Haversine distance between the current GPS position
    and the expected route center. If distance > route_bounds_km,
    flag as deviation.

    WHY PER-ROW:
    - Each GPS point can be independently evaluated against bounds
    - No windowing needed — immediate detection
    - Haversine is a pure function with no side effects

    Args:
        telemetry: Telemetry table with latitude, longitude

    Returns:
        pw.Table: Route deviation alerts
    """
    max_deviation = config.anomaly.route_bounds_km

    # Compute distance from expected route per row
    with_deviation = telemetry.with_columns(
        route_deviation_km=pw.apply(
            lambda vid, lat, lon: _compute_deviation(vid, lat, lon),
            pw.this.vehicle_id,
            pw.this.latitude,
            pw.this.longitude,
        ),
    )

    # Filter deviations
    deviations = with_deviation.filter(
        pw.this.route_deviation_km > max_deviation
    ).select(
        vehicle_id=pw.this.vehicle_id,
        anomaly_type="route_deviation",
        severity=pw.if_else(
            pw.this.route_deviation_km > max_deviation * 3,
            "critical",
            pw.if_else(
                pw.this.route_deviation_km > max_deviation * 2,
                "high",
                "medium",
            ),
        ),
        message=pw.apply(
            lambda vid, dev: f"Route deviation: {dev:.1f} km from expected route",
            pw.this.vehicle_id,
            pw.this.route_deviation_km,
        ),
        deviation_km=pw.this.route_deviation_km,
        latitude=pw.this.latitude,
        longitude=pw.this.longitude,
        timestamp=pw.this.timestamp,
    )

    return deviations


def _compute_deviation(vehicle_id: str, lat: float, lon: float) -> float:
    """Compute distance from expected route center."""
    expected = EXPECTED_ROUTES.get(vehicle_id, (40.7128, -74.0060))
    return haversine_km(lat, lon, expected[0], expected[1])
