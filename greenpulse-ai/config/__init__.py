"""
GreenPulse AI — Central Configuration

All thresholds, window sizes, emission factors, and API settings
are defined here for easy tuning and hackathon demo adjustments.
"""
import os
from dataclasses import dataclass, field
from typing import Dict, List, Tuple


@dataclass
class StreamConfig:
    """Data stream configuration."""
    gps_csv_path: str = "data/gps_sample.csv"
    fuel_csv_path: str = "data/fuel_sample.csv"
    shipments_csv_path: str = "data/shipments_sample.csv"
    weather_poll_interval_sec: int = 10
    weather_api_url: str = "https://api.open-meteo.com/v1/forecast"
    weather_lat: float = 40.7128
    weather_lon: float = -74.0060


@dataclass
class EmissionConfig:
    """Carbon emission calculation parameters."""
    # kg CO2 per liter of diesel
    diesel_emission_factor: float = 2.68
    # kg CO2 per liter of gasoline
    gasoline_emission_factor: float = 2.31
    # Default factor if fuel type unknown
    default_emission_factor: float = 2.68


@dataclass
class WindowConfig:
    """Sliding window parameters."""
    # Duration of the sliding window in seconds
    window_duration_sec: int = 300  # 5 minutes
    # Slide step in seconds
    slide_step_sec: int = 60  # 1 minute
    # Hop size for tumbling windows
    hop_sec: int = 300  # 5 minutes


@dataclass
class AnomalyConfig:
    """Anomaly detection thresholds."""
    # Threshold-based
    max_speed_kmh: float = 120.0
    min_fuel_efficiency_km_per_l: float = 3.0
    max_idle_duration_sec: int = 600  # 10 minutes

    # Z-score based
    zscore_threshold: float = 2.5
    zscore_window_size: int = 20  # number of data points

    # Route deviation
    route_bounds_km: float = 5.0  # max deviation from expected route

    # Acceleration spike
    max_acceleration_kmh_per_sec: float = 15.0

    # Fuel drop
    fuel_drop_threshold_liters: float = 5.0


@dataclass
class RagConfig:
    """RAG and LLM configuration."""
    # LLM provider: "openai" or "gemini"
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"

    # Embedding model
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384

    # Index settings
    n_retrieval_results: int = 10
    chunk_size: int = 500

    # API keys (from environment)
    @property
    def openai_api_key(self) -> str:
        return os.getenv("OPENAI_API_KEY", "")

    @property
    def gemini_api_key(self) -> str:
        return os.getenv("GEMINI_API_KEY", "")


@dataclass
class ApiConfig:
    """FastAPI server configuration."""
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: List[str] = field(default_factory=lambda: ["*"])
    log_level: str = "info"


@dataclass
class ScoringConfig:
    """Scoring weights for rankings and sustainability."""
    # Risk score weights
    risk_weights: Dict[str, float] = field(default_factory=lambda: {
        "speed_anomalies": 0.25,
        "fuel_inefficiency": 0.25,
        "route_deviations": 0.20,
        "alert_count": 0.15,
        "idle_time": 0.15,
    })

    # Sustainability score weights
    sustainability_weights: Dict[str, float] = field(default_factory=lambda: {
        "carbon_per_km": 0.30,
        "fuel_efficiency": 0.25,
        "speed_compliance": 0.20,
        "route_adherence": 0.15,
        "idle_ratio": 0.10,
    })

    # Leaderboard categories
    leaderboard_categories: List[str] = field(default_factory=lambda: [
        "lowest_carbon",
        "best_efficiency",
        "safest_driver",
        "best_overall",
    ])


@dataclass
class GreenPulseConfig:
    """Root configuration object."""
    stream: StreamConfig = field(default_factory=StreamConfig)
    emission: EmissionConfig = field(default_factory=EmissionConfig)
    window: WindowConfig = field(default_factory=WindowConfig)
    anomaly: AnomalyConfig = field(default_factory=AnomalyConfig)
    rag: RagConfig = field(default_factory=RagConfig)
    api: ApiConfig = field(default_factory=ApiConfig)
    scoring: ScoringConfig = field(default_factory=ScoringConfig)


# Singleton config instance
config = GreenPulseConfig()
