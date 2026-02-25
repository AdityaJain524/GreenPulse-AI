# GreenPulse AI — Real-Time Carbon & Sustainable Logistics Intelligence

GreenPulse AI is a full-stack, real-time platform for fleet sustainability operations. It combines streaming analytics, anomaly detection, explainable risk intelligence, predictive forecasting, and executive reporting.

## What this project includes

### Core real-time capabilities
- Multi-stream ingestion: GPS, Fuel, Shipment, Weather
- Incremental stream joins and reactive transformations
- Sliding/tumbling window analytics
- Threshold anomalies, Z-score anomalies, and route deviation detection
- Event-driven vehicle state machine
- Predictive risk and carbon forecasting
- Fuel exhaustion ETA prediction
- Automated fleet intelligence reporting


### AI and retrieval
- Pathway Document Store + Hybrid RAG query engine
- FastAPI `/ask` endpoint for context-aware fleet Q&A

## Architecture overview

### Backend (Pathway + FastAPI)
- `greenpulse-ai/main.py`: orchestrates ingestion, joins, windows, features, anomalies, scoring, state machine, predictions, reports, and API registration
- `greenpulse-ai/api/server.py`: REST endpoints for metrics, alerts, rankings, explainability, crisis simulation, and reports
- `greenpulse-ai/streaming/`: incremental join and window logic
- `greenpulse-ai/features/`: carbon, efficiency, and derived metrics
- `greenpulse-ai/anomalies/`: threshold, z-score, route deviation detection
- `greenpulse-ai/state_machine/`: per-vehicle operational states + transition history
- `greenpulse-ai/forecasting/`: predictive risk/carbon/fuel models
- `greenpulse-ai/reporting/`: auto-generated fleet intelligence reports
- `greenpulse-ai/rag/`: document store and live query engine

### Frontend (React + Vite)
- Live dashboard with fleet KPIs, map, alerts, rankings, sustainability, risk/XAI, state machine, prediction engine, and report views
- Crisis mode controls and pipeline metrics panel for demo storytelling
- Chat assistant UI integrated with the backend edge function

## API surface (high-level)

- `GET /metrics`
- `GET /alerts`
- `GET /rankings`
- `GET /sustainability`
- `POST /ask`
- `GET /vehicle-state`
- `GET /state-history`
- `GET /predictions`
- `GET /fleet-report/latest`
- `GET /fleet-report/history`
- `GET /pipeline-metrics`
- `GET /risk-breakdown`
- `GET /state-explanation/{vehicle_id}`
- `POST /simulate-crisis`
- `POST /stop-crisis`
- `GET /health`

## Local setup

### Prerequisites
- Node.js 18+
- npm 9+
- Python 3.10+
- Docker + Docker Compose (optional)
- OpenAI API key (or compatible provider key used by your backend config)

### Frontend
```sh
npm install
npm run dev
```

### Backend
```sh
cd greenpulse-ai
pip install -r requirements.txt
python main.py
```

### Docker
```sh
cd greenpulse-ai
docker-compose -f docker/docker-compose.yaml up
```

## Tech stack

- Pathway (streaming runtime)
- FastAPI + Pydantic
- Python analytics modules
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase Edge Function for chat streaming

## Repository structure

- [src](src): frontend app, components, hooks, integration clients
- [greenpulse-ai](greenpulse-ai): backend pipeline, API, forecasting, reporting, RAG
- [supabase/functions/greenpulse-chat](supabase/functions/greenpulse-chat): chat streaming function
- [public](public): static assets

## Environment configuration

### Frontend (`.env` at repository root)
- `VITE_PATHWAY_API_URL=http://localhost:8000`
- `VITE_SUPABASE_URL=<your_supabase_project_url>`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<your_supabase_anon_key>`

### Backend (`greenpulse-ai`)
- `OPENAI_API_KEY=<your_key>` (or the provider key expected by your RAG/query setup)

### Supabase Edge Function (`supabase/functions/greenpulse-chat`)
- `AI_GATEWAY_API_KEY=<your_key>`
- `AI_GATEWAY_URL=<optional_custom_endpoint>` (defaults in code)

## End-to-end data flow

1. Ingestion modules stream GPS, Fuel, Shipment, and Weather rows into Pathway tables.
2. Incremental joins combine streams into unified telemetry records.
3. Feature modules compute carbon emissions, efficiency, and derived behaviors.
4. Windowing performs rolling/tumbling aggregations for fleet-level and vehicle-level metrics.
5. Anomaly modules flag threshold, z-score, and route-deviation events.
6. Services compute rankings, sustainability, explainable risk, and state transitions.
7. Forecasting predicts risk escalation, carbon trend, and fuel exhaustion ETA.
8. Reporting generates executive fleet intelligence snapshots.
9. FastAPI exposes live state to dashboard widgets and chat context.

## API documentation

| Endpoint | Method | Purpose |
|---|---|---|
| `/metrics` | GET | Fleet KPIs (emissions, efficiency, vehicle rollup) |
| `/alerts` | GET | Live anomaly feed |
| `/rankings` | GET | Carbon + sustainability rankings |
| `/sustainability` | GET | Per-vehicle sustainability scores |
| `/ask` | POST | RAG-powered question answering |
| `/vehicle-state` | GET | Current state-machine output |
| `/state-history` | GET | State transition history |
| `/predictions` | GET | Carbon/risk/fuel forecasts |
| `/fleet-report/latest` | GET | Latest auto-generated intelligence report |
| `/fleet-report/history` | GET | Historical report snapshots |
| `/pipeline-metrics` | GET | Live streaming runtime proof panel |
| `/risk-breakdown` | GET | Explainable weighted risk factors |
| `/state-explanation/{vehicle_id}` | GET | Structured reason for state transitions |
| `/simulate-crisis` | POST | Activate crisis mode for one vehicle |
| `/stop-crisis` | POST | Stop crisis mode and revert behavior |
| `/health` | GET | Runtime health + feature readiness |

## Explainable AI (XAI) formula

Risk score is computed using weighted components:

`Risk Score = 0.35(alerts) + 0.25(efficiency) + 0.25(carbon) + 0.15(status)`

The dashboard and API expose both raw score and percentage contribution by component.

## Crisis simulation usage

1. Open dashboard and choose a target vehicle in **Simulate Crisis Mode**.
2. Start simulation to amplify carbon, alerts, route deviation probability, and fuel burn.
3. Observe automatic updates in:
	- alerts feed,
	- prediction engine,
	- vehicle state machine,
	- fleet health/report sections.
4. Stop simulation to instantly return to baseline streaming behavior.

## Useful commands

```sh
# Frontend
npm run dev
npm run build
npm run test

# Backend
cd greenpulse-ai
python main.py
```

## Troubleshooting

- If frontend shows module resolution errors, run `npm install` at repo root.
- If API calls return 503, ensure backend pipeline has started and tables are registered.
- If chat fails, verify Supabase function secrets (`AI_GATEWAY_API_KEY`, URL) are configured.
- If no streaming updates appear, append fresh rows to sample CSV streams in `greenpulse-ai/data`.

