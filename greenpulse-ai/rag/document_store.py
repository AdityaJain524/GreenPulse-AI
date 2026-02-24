"""
PHASE D — Pathway Document Store for Live RAG

Creates a continuously-updated document store that indexes
alerts, emission summaries, and shipment data for LLM queries.

WHY STREAMING-SAFE:
- Pathway Document Store is natively incremental
- New documents are embedded and indexed as they arrive
- No full re-indexing — only delta updates
- Vector + BM25 hybrid search for best retrieval quality
"""
import pathway as pw
from pathway.xpacks.llm.document_store import DocumentStore
from pathway.xpacks.llm.embedders import SentenceTransformerEmbedder
from config import config


def create_document_store(
    alerts: pw.Table,
    windowed_metrics: pw.Table,
) -> DocumentStore:
    """
    Create a live Pathway Document Store with hybrid indexing.

    Documents indexed:
    1. Alert descriptions (anomaly events)
    2. Emission summaries (per-vehicle carbon stats)
    3. Window metrics (aggregated telemetry)

    WHY HYBRID INDEX:
    - Vector search catches semantic similarity ("inefficient" ≈ "poor fuel economy")
    - BM25 catches exact term matches ("V-101", "speed threshold")
    - Combined scoring gives best retrieval precision

    Args:
        alerts: Streaming alerts table
        windowed_metrics: Windowed aggregation table

    Returns:
        DocumentStore: Live, auto-updating document store
    """
    rag_cfg = config.rag

    # Create embedder
    embedder = SentenceTransformerEmbedder(
        model=rag_cfg.embedding_model,
        dimension=rag_cfg.embedding_dimension,
    )

    # Convert alerts to documents
    alert_docs = alerts.select(
        text=pw.apply(
            lambda vid, atype, sev, msg, ts: (
                f"ALERT [{sev.upper()}] Vehicle {vid}: {msg}. "
                f"Type: {atype}. Time: {ts}"
            ),
            pw.this.vehicle_id,
            pw.this.anomaly_type,
            pw.this.severity,
            pw.this.message,
            pw.this.timestamp,
        ),
        metadata=pw.apply(
            lambda vid, atype: f'{{"vehicle_id": "{vid}", "type": "{atype}", "category": "alert"}}',
            pw.this.vehicle_id,
            pw.this.anomaly_type,
        ),
    )

    # Convert windowed metrics to documents
    metric_docs = windowed_metrics.select(
        text=pw.apply(
            lambda vid, avg_s, fuel, dist, carbon, eff, ws: (
                f"METRICS Vehicle {vid}: "
                f"Avg speed {avg_s:.0f} km/h, "
                f"Fuel consumed {fuel:.1f}L, "
                f"Distance {dist:.1f}km, "
                f"Carbon emitted {carbon:.1f}kg CO₂, "
                f"Efficiency {eff:.1f} km/L. "
                f"Window: {ws}"
            ),
            pw.this.vehicle_id,
            pw.this.avg_speed,
            pw.this.total_fuel,
            pw.this.total_distance,
            pw.this.carbon_kg,
            pw.this.fuel_efficiency,
            pw.this.window_start,
        ),
        metadata=pw.apply(
            lambda vid: f'{{"vehicle_id": "{vid}", "category": "metrics"}}',
            pw.this.vehicle_id,
        ),
    )

    # Combine all document sources
    all_docs = alert_docs.concat(metric_docs)

    # Create document store with hybrid retrieval
    doc_store = DocumentStore(
        docs=all_docs,
        embedder=embedder,
        retriever_factory=None,  # Uses default hybrid retrieval
        n_retrieval_results=rag_cfg.n_retrieval_results,
    )

    return doc_store
