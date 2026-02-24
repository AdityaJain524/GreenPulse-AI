"""Ingestion package — all data source connectors."""
from .gps_stream import create_gps_stream, create_gps_demo_stream
from .fuel_stream import create_fuel_stream
from .shipment_stream import create_shipment_stream
from .weather_poll import create_weather_stream

__all__ = [
    "create_gps_stream",
    "create_gps_demo_stream",
    "create_fuel_stream",
    "create_shipment_stream",
    "create_weather_stream",
]
