"""
PHASE A — Shipment Status Stream Module

WHY STREAMING-SAFE:
- Shipment status changes are discrete events
- Each update triggers only affected downstream computations
- No full table scan needed
"""
import pathway as pw
from config import config


class ShipmentSchema(pw.Schema):
    shipment_id: str
    vehicle_id: str
    status: str  # "in_transit", "delivered", "delayed", "loading"
    origin: str
    destination: str
    timestamp: str


def create_shipment_stream() -> pw.Table:
    """
    Create a streaming shipment status table.

    Returns:
        pw.Table: Reactive shipment status table
    """
    shipment_table = pw.io.csv.read(
        config.stream.shipments_csv_path,
        schema=ShipmentSchema,
        mode="streaming",
        autocommit_duration_ms=2000,
    )

    shipment_table = shipment_table.with_columns(
        parsed_time=pw.this.timestamp.dt.strptime("%Y-%m-%dT%H:%M:%S"),
        is_delayed=pw.this.status == "delayed",
    )

    return shipment_table
