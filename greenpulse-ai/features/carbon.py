"""
PHASE B — Carbon Emission Calculations

WHY STREAMING-SAFE:
- Pure column-level transformations — each row computed independently
- pw.apply runs on each row as it arrives, no buffering needed
"""
import pathway as pw
from config import config


def compute_carbon_emissions(telemetry: pw.Table) -> pw.Table:
    """
    Compute carbon emissions for each telemetry row.

    Formula: carbon_kg = fuel_liters × emission_factor

    The emission factor depends on fuel type:
    - Diesel: 2.68 kg CO₂/liter
    - Gasoline: 2.31 kg CO₂/liter

    Args:
        telemetry: Joined telemetry table

    Returns:
        pw.Table: Telemetry with carbon_kg column
    """
    emission_cfg = config.emission

    enriched = telemetry.with_columns(
        carbon_kg=pw.if_else(
            pw.this.fuel_type == "diesel",
            pw.this.fuel_liters * emission_cfg.diesel_emission_factor,
            pw.if_else(
                pw.this.fuel_type == "gasoline",
                pw.this.fuel_liters * emission_cfg.gasoline_emission_factor,
                pw.this.fuel_liters * emission_cfg.default_emission_factor,
            ),
        ),
    )

    return enriched
