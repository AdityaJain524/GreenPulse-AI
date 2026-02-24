"""
PHASE A — GPS Stream Ingestion Module

Uses Pathway's CSV connector to replay GPS data as a real-time stream.
In production, replace with Kafka or MQTT connector.

WHY STREAMING-SAFE:
- pw.io.csv.read() creates a reactive table that auto-updates when the file changes
- No full recomputation — only new rows trigger downstream updates
- Pathway monitors the file for appends, simulating a real stream
"""
import pathway as pw
from config import config


# Schema definition for GPS data points
class GPSSchema(pw.Schema):
    vehicle_id: str
    latitude: float
    longitude: float
    speed: float  # km/h
    timestamp: str  # ISO format string


def create_gps_stream() -> pw.Table:
    """
    Create a streaming GPS table from CSV file.

    The CSV file is monitored for new rows — any appended data
    automatically flows through the entire pipeline.

    Returns:
        pw.Table: Reactive GPS data table
    """
    gps_table = pw.io.csv.read(
        config.stream.gps_csv_path,
        schema=GPSSchema,
        mode="streaming",  # Monitor file for changes
        autocommit_duration_ms=1000,  # Commit every 1 second
    )

    # Parse timestamp string to Pathway datetime
    gps_table = gps_table.with_columns(
        parsed_time=pw.this.timestamp.dt.strptime("%Y-%m-%dT%H:%M:%S"),
    )

    return gps_table


def create_gps_demo_stream() -> pw.Table:
    """
    Create a simulated GPS stream using Pathway's demo module.
    Useful for hackathon demos without CSV files.

    Returns:
        pw.Table: Simulated GPS data table
    """
    import random

    VEHICLES = ["V-101", "V-102", "V-103", "V-104", "V-105", "V-106"]

    def gps_generator():
        """Infinite generator producing GPS data points."""
        while True:
            vehicle = random.choice(VEHICLES)
            yield {
                "vehicle_id": vehicle,
                "latitude": 40.0 + random.random() * 2.0,
                "longitude": -74.5 + random.random() * 1.5,
                "speed": 20 + random.random() * 100,
                "timestamp": pw.DateTimeNaive.now().isoformat(),
            }

    # Use Pathway's python connector for demo
    gps_table = pw.io.python.read(
        gps_generator(),
        schema=GPSSchema,
        autocommit_duration_ms=2000,
    )

    return gps_table
