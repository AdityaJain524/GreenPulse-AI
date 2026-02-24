# GreenPulse AI — Real-Time Carbon & Sustainable Logistics Intelligence Platform

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PATHWAY STREAMING ENGINE                      │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ GPS      │  │ Fuel     │  │ Shipment │  │ Weather      │   │
│  │ Stream   │  │ Stream   │  │ Stream   │  │ Polling      │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       │              │              │               │            │
│       └──────────────┴──────────────┴───────────────┘            │
│                              │                                    │
│                    ┌─────────▼──────────┐                        │
│                    │  Incremental Join  │                        │
│                    └─────────┬──────────┘                        │
│                              │                                    │
│              ┌───────────────┼───────────────┐                   │
│              │               │               │                    │
│     ┌────────▼───────┐ ┌────▼────────┐ ┌───▼──────────┐        │
│     │ Feature        │ │ Anomaly     │ │ RAG          │        │
│     │ Engineering    │ │ Detection   │ │ Document     │        │
│     │ (5-min window) │ │ (Z-score,   │ │ Store        │        │
│     │                │ │  threshold, │ │ (Vector+BM25)│        │
│     │                │ │  route dev) │ │              │        │
│     └────────┬───────┘ └────┬────────┘ └───┬──────────┘        │
│              │               │               │                    │
│              └───────────────┼───────────────┘                   │
│                              │                                    │
│                    ┌─────────▼──────────┐                        │
│                    │   FastAPI Server   │                        │
│                    │  /metrics /alerts  │                        │
│                    │  /ask /rankings    │                        │
│                    └─────────┬──────────┘                        │
│                              │                                    │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Web Frontend      │
                    │  React Dashboard    │
                    └─────────────────────┘
```

## Project Structure

```
greenpulse-ai/
├── ingestion/              # Data source connectors
│   ├── __init__.py
│   ├── gps_stream.py       # GPS data simulator/ingestion
│   ├── fuel_stream.py      # Fuel consumption stream
│   ├── shipment_stream.py  # Shipment status stream
│   └── weather_poll.py     # Weather API polling connector
├── streaming/              # Core streaming transformations
│   ├── __init__.py
│   ├── joins.py            # Incremental joins across streams
│   └── windows.py          # Sliding window computations
├── features/               # Feature engineering pipeline
│   ├── __init__.py
│   ├── carbon.py           # Carbon emission calculations
│   ├── efficiency.py       # Fuel efficiency metrics
│   └── derived.py          # Derived features (spikes, idle, etc.)
├── anomalies/              # Anomaly detection modules
│   ├── __init__.py
│   ├── threshold.py        # Threshold-based anomaly detection
│   ├── zscore.py           # Rolling Z-score anomaly detection
│   └── route_deviation.py  # Route deviation detection
├── rag/                    # RAG (Retrieval-Augmented Generation)
│   ├── __init__.py
│   ├── document_store.py   # Pathway Document Store
│   ├── indexer.py          # Hybrid vector + BM25 index
│   └── query_engine.py     # LLM query integration
├── api/                    # FastAPI REST endpoints
│   ├── __init__.py
│   ├── server.py           # FastAPI application
│   └── routes.py           # API route definitions
├── services/               # Business logic services
│   ├── __init__.py
│   ├── ranking.py          # Vehicle ranking engine
│   ├── leaderboard.py      # Carbon leaderboard
│   ├── risk_scoring.py     # Risk scoring system
│   └── sustainability.py   # Sustainability score
├── config/                 # Configuration
│   ├── __init__.py
│   └── settings.py         # Central configuration
├── docker/                 # Docker deployment
│   ├── Dockerfile
│   └── docker-compose.yaml
├── data/                   # Sample CSV data for replay
│   ├── gps_sample.csv
│   ├── fuel_sample.csv
│   └── shipments_sample.csv
├── main.py                 # Application entry point
├── requirements.txt        # Python dependencies
└── README.md               # This file
```

## Folder Purposes

| Folder | Purpose |
|--------|---------|
| `ingestion/` | Data source connectors — simulates or ingests GPS, fuel, shipment, and weather streams using Pathway's IO connectors |
| `streaming/` | Core streaming transformations — incremental joins across streams and sliding window computations |
| `features/` | Feature engineering — computes carbon emissions, fuel efficiency, and derived features like acceleration spikes |
| `anomalies/` | Anomaly detection — threshold-based, rolling Z-score, and route deviation detection running incrementally |
| `rag/` | RAG integration — Pathway Document Store with hybrid vector+BM25 index for LLM-powered queries |
| `api/` | FastAPI REST server — serves /metrics, /alerts, /ask, /rankings endpoints for the frontend |
| `services/` | Business logic — vehicle rankings, carbon leaderboard, risk scoring, sustainability scoring |
| `config/` | Central configuration — emission factors, window sizes, thresholds, API keys |
| `docker/` | Deployment — Dockerfile and docker-compose for one-command deployment |
| `data/` | Sample CSV data for replaying as streaming input during demos |

## Setup

```bash
# 1. Clone and install
cd greenpulse-ai
pip install -r requirements.txt

# 2. Set environment variables
export OPENAI_API_KEY="your-key"  # or GEMINI_API_KEY

# 3. Run with Docker (recommended)
docker-compose -f docker/docker-compose.yaml up

# 4. Or run directly
python main.py
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/metrics` | GET | Current fleet metrics (emissions, efficiency, speed) |
| `/alerts` | GET | Active anomaly alerts |
| `/rankings` | GET | Vehicle rankings by carbon, efficiency, risk |
| `/ask` | POST | LLM-powered query (RAG) |
| `/vehicles/{id}` | GET | Individual vehicle detail |
| `/sustainability` | GET | Fleet sustainability scores |
| `/pipeline-metrics` | GET | Live streaming runtime proof (events/sec, latency, active tables, uptime) |
| `/risk-breakdown` | GET | Explainable risk component percentages + explicit weighted formula |
| `/state-explanation/{vehicle_id}` | GET | Structured transition reasoning for state-machine decisions |
| `/simulate-crisis` | POST | Enable reversible crisis simulation for one selected vehicle |
| `/stop-crisis` | POST | Disable crisis simulation and restore baseline behavior |

## How Streaming Works

1. **Data Ingestion**: Pathway reads from CSV files (simulated) or Kafka topics (production). Each source is a `pw.Table` that auto-updates when new rows arrive.

2. **Incremental Joins**: GPS + Fuel + Shipment tables are joined using `pw.temporal.interval_join` — only new/changed rows trigger recomputation.

3. **Sliding Windows**: 5-minute tumbling windows aggregate speed, fuel, and emissions. Pathway's `windowby` automatically maintains window state.

4. **Anomaly Detection**: Runs as streaming transformers on the joined table. Z-scores are computed incrementally using running mean/std.

5. **RAG Index**: The Document Store continuously ingests alert and emission summaries. Vector embeddings are updated live, enabling instant LLM queries.

6. **API Layer**: FastAPI serves the latest state of all Pathway tables. No polling needed — data is always current.

## How to Test Live Updates

1. Start the system: `python main.py`
2. Open the dashboard URL (for local dev, your Vite app URL)
3. Add rows to `data/gps_sample.csv` — the system detects changes within 1 second
4. Watch metrics, alerts, and rankings update automatically
5. Ask the AI: "What changed in the last minute?"

## Hackathon Compliance

- ✅ Uses Pathway as real-time streaming engine
- ✅ Streaming transformations (incremental joins, windows, aggregations)
- ✅ Live/simulated real-time streams
- ✅ LLM xPack integration for RAG
- ✅ Production-structured (modular architecture)
- ✅ Software-only (no hardware dependencies)
- ✅ Auto-updates when new data arrives

## Strategic Judge-Facing Upgrades

- **Architecture Transparency Layer**: `GET /pipeline-metrics` surfaces runtime throughput, window latency, node counts, and uptime directly from live Pathway tables. This increases technical credibility by making streaming execution measurable and auditable during demo.
- **Explainable AI Layer**: `GET /risk-breakdown` and `GET /state-explanation/{vehicle_id}` expose weighted risk contributions and structured state-transition reasons, enabling decision traceability rather than black-box scores.
- **Demo Narrative Mode**: `POST /simulate-crisis` and `POST /stop-crisis` activate a reversible, per-vehicle crisis path that automatically propagates into predictions, alerts, and fleet reports without batch recomputation.
