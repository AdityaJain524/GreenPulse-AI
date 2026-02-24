"""Features package."""
from .carbon import compute_carbon_emissions
from .efficiency import compute_fuel_efficiency
from .derived import detect_acceleration_spikes, detect_idle_vehicles, detect_fuel_drops

__all__ = [
    "compute_carbon_emissions",
    "compute_fuel_efficiency",
    "detect_acceleration_spikes",
    "detect_idle_vehicles",
    "detect_fuel_drops",
]
