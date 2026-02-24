# GreenPulse AI — 3-Minute Judge Demo Script

## 0:00–0:30 — Problem Statement
"Logistics fleets still run on delayed dashboards and post-mortem analytics. That means emissions spikes, route deviations, and fuel risks are discovered too late. GreenPulse AI solves this with a true real-time sustainability intelligence platform that detects, predicts, and explains risk while operations are still in motion."

## 0:30–1:00 — Architecture Overview
"Under the hood, this is built on **Pathway** as the streaming runtime. We ingest live GPS, fuel, shipment, and weather feeds, join them incrementally, run sliding and tumbling windows, detect anomalies, update a vehicle state machine, and generate predictive forecasts and fleet reports. Importantly, this is **zero batch recomputation**—only affected rows update through Pathway’s reactive graph."

## 1:00–2:00 — Live System Demo
"I’ll start with the **Live Pipeline Metrics** panel. This is our transparency layer proving real streaming execution: events per second, total processed events, active streaming tables, window latency, graph nodes, and uptime."

"Now on alerts and map, you can see anomalies update as events arrive."

"Next, I’ll trigger **Simulate Crisis Mode** for one vehicle. This gradually increases carbon rate, alert frequency, route deviation probability, and fuel consumption—without touching other vehicles."

"Immediately, the system emits HIGH_EMISSION, ROUTE_DEVIATION, and CRITICAL_RISK signals. Forecasting updates in real time, and fuel exhaustion drops below 60 minutes for the selected vehicle."

"Fleet health also shifts to **Degraded**, and the executive report reflects the incident automatically."

## 2:00–2:30 — Predictive + State Machine Intelligence
"Now we move from monitoring to intelligence. Our prediction engine estimates carbon trajectory, risk escalation probability, and fuel exhaustion ETA. In parallel, the event-driven state machine transitions vehicles across NORMAL, HIGH_EMISSION, ROUTE_DEVIATION, IDLE, and CRITICAL_RISK."

"What makes this enterprise-ready is explainability: the **XAI badge** and reasoning panel show the exact weighted formula and per-vehicle contribution breakdown, plus state-transition reasons like risk threshold crossing, alert pressure, escalation probability, and carbon slope direction."

## 2:30–3:00 — Sustainability Impact + Closing
"GreenPulse AI turns sustainability into an operational control loop: detect now, predict next, explain why, and report automatically every five minutes."

"For enterprises, this means faster interventions, lower fuel waste, lower emissions, and audit-ready decision trails."

"In one platform, we combine Pathway-native streaming analytics, explainable AI, predictive intelligence, and automated reporting—ready for real fleet deployment."