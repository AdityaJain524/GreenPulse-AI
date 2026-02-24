"""
PHASE D — LLM Query Engine

Integrates with OpenAI/Gemini through Pathway LLM xPack
for answering natural language questions about fleet data.

WHY STREAMING-SAFE:
- Query engine reads from the live document store
- Document store auto-updates — queries always get latest data
- LLM calls are stateless — each query is independent
"""
import pathway as pw
from pathway.xpacks.llm.llms import OpenAIChat
from pathway.xpacks.llm.question_answering import AdaptiveRAGQuestionAnswerer
from config import config


def create_query_engine(doc_store):
    """
    Create an LLM-powered query engine using Pathway's
    adaptive RAG question answerer.

    Features:
    - Retrieves relevant documents from the live store
    - Constructs a context-aware prompt
    - Calls OpenAI/Gemini for final answer generation
    - Adaptive: decides whether to retrieve more or answer directly

    Args:
        doc_store: Live Pathway DocumentStore

    Returns:
        AdaptiveRAGQuestionAnswerer: Query engine
    """
    rag_cfg = config.rag

    # Initialize LLM
    llm = OpenAIChat(
        model=rag_cfg.llm_model,
        api_key=rag_cfg.openai_api_key,
    )

    # Create RAG question answerer
    qa = AdaptiveRAGQuestionAnswerer(
        llm=llm,
        indexer=doc_store,
        n_starting_documents=5,
        short_prompt_template=(
            "You are GreenPulse AI, a carbon and logistics intelligence assistant.\n"
            "Use the following fleet data to answer the question.\n"
            "Be concise, data-driven, and use specific vehicle IDs and numbers.\n\n"
            "Context:\n{context}\n\n"
            "Question: {query}\n\n"
            "Answer:"
        ),
    )

    return qa
