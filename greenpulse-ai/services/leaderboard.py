# GreenPulse AI - Carbon Leaderboard
"""
PHASE G — Carbon Leaderboard

Maintains a live leaderboard ranking vehicles by their
carbon efficiency (lowest carbon per km = best).

WHY THIS IMPROVES JUDGING SCORE:
- Gamification increases engagement
- Shows competitive dynamics in real-time
- Demonstrates Pathway's live reduce + sort
"""
import pathway as pw


def compute_carbon_leaderboard(windowed: pw.Table) -> pw.Table:
    """
    Compute carbon leaderboard: rank by carbon per km (ascending).

    Args:
        windowed: Window metrics

    Returns:
        pw.Table: Leaderboard with rank positions
    """
    leaderboard = windowed.groupby(pw.this.vehicle_id).reduce(
        vehicle_id=pw.this.vehicle_id,
        total_carbon_kg=pw.reducers.sum(pw.this.carbon_kg),
        total_distance_km=pw.reducers.sum(pw.this.total_distance),
        avg_efficiency=pw.reducers.avg(pw.this.fuel_efficiency),
        windows_counted=pw.reducers.count(),
    )

    leaderboard = leaderboard.with_columns(
        carbon_per_km=pw.if_else(
            pw.this.total_distance_km > 0,
            pw.this.total_carbon_kg / pw.this.total_distance_km,
            0.0,
        ),
    )

    return leaderboard
