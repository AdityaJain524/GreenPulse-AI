"""
PHASE A — Weather Polling Connector

Polls a weather API every N seconds and emits data as a Pathway table.

WHY STREAMING-SAFE:
- Polling connector emits new rows on each poll cycle
- Pathway treats each poll result as a new event
- Downstream consumers see updates automatically
"""
import pathway as pw
import httpx
from config import config


class WeatherSchema(pw.Schema):
    temperature: float
    wind_speed: float
    rainfall: float
    condition: str
    timestamp: str


def create_weather_stream() -> pw.Table:
    """
    Create a weather polling stream.

    Polls the Open-Meteo API every 10 seconds and converts
    results into a streaming Pathway table.

    Returns:
        pw.Table: Reactive weather data table
    """
    def weather_poller():
        """Generator that polls weather API."""
        import time
        while True:
            try:
                resp = httpx.get(
                    config.stream.weather_api_url,
                    params={
                        "latitude": config.stream.weather_lat,
                        "longitude": config.stream.weather_lon,
                        "current_weather": True,
                    },
                    timeout=5.0,
                )
                data = resp.json().get("current_weather", {})
                yield {
                    "temperature": data.get("temperature", 0.0),
                    "wind_speed": data.get("windspeed", 0.0),
                    "rainfall": 0.0,  # Open-Meteo current doesn't include rainfall
                    "condition": _weather_code_to_condition(
                        data.get("weathercode", 0)
                    ),
                    "timestamp": data.get("time", ""),
                }
            except Exception:
                yield {
                    "temperature": 0.0,
                    "wind_speed": 0.0,
                    "rainfall": 0.0,
                    "condition": "Unknown",
                    "timestamp": "",
                }
            time.sleep(config.stream.weather_poll_interval_sec)

    weather_table = pw.io.python.read(
        weather_poller(),
        schema=WeatherSchema,
        autocommit_duration_ms=10000,
    )

    return weather_table


def _weather_code_to_condition(code: int) -> str:
    """Convert WMO weather code to human-readable condition."""
    if code == 0:
        return "Clear"
    elif code in (1, 2, 3):
        return "Cloudy"
    elif code in (51, 53, 55, 61, 63):
        return "Rain"
    elif code in (65, 67, 80, 81, 82):
        return "Heavy Rain"
    elif code in (45, 48):
        return "Fog"
    elif code in (95, 96, 99):
        return "Storm"
    else:
        return "Cloudy"
