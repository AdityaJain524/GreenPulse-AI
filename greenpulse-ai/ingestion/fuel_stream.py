"""
PHASE A — Fuel Consumption Stream Module

Ingests fuel consumption logs as a streaming table.

WHY STREAMING-SAFE:
- Each fuel log is an independent event — no ordering dependency
- Pathway processes each new row incrementally
- Downstream joins and aggregations only recompute affected windows
"""
import pathway as pw
from config import config


class FuelSchema(pw.Schema):
    vehicle_id: str
    fuel_liters: float
    distance_km: float
    fuel_type: str  # "diesel" or "gasoline"
    timestamp: str


def create_fuel_stream() -> pw.Table:
    """
    Create a streaming fuel consumption table from CSV.

    Returns:
        pw.Table: Reactive fuel consumption table
    """
    fuel_table = pw.io.csv.read(
        config.stream.fuel_csv_path,
        schema=FuelSchema,
        mode="streaming",
        autocommit_duration_ms=1000,
    )

    fuel_table = fuel_table.with_columns(
        parsed_time=pw.this.timestamp.dt.strptime("%Y-%m-%dT%H:%M:%S"),
    )

    return fuel_table
