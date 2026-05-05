import requests
from tools import retrieval_augmented_generation_with_db, search_web
import dspy
from dotenv import load_dotenv
import os

load_dotenv(override=True)
ai_api_key = os.getenv("LLM_API_KEY")

ai_api_base = os.getenv("LLM_API_BASE")
if not ai_api_base:
    raise ValueError("API base not found. Make sure LLM_API_BASE is set in your .env file.")

model = os.getenv("LLM_MODEL_NAME")
if not model:
    raise ValueError("LLM model not found. Make sure LLM_MODEL_NAME is set in your .env file.")


lm = dspy.LM(
    model=model,
    api_key=ai_api_key,
    api_base=ai_api_base,
)

dspy.configure(lm=lm)
dspy.settings.configure(track_usage=True, enable_disk_cache=False, enable_memory_cache=False)

# Global variable to store the current paper_id for RAG
current_paper_id = None

def retrieval_augmented_generation_tool(query: str) -> str:
    """
    Wrapper for RAG that uses the current paper_id from the session.
    This is used by dspy.ReAct as a tool.
    """
    global current_paper_id
    if current_paper_id:
        return retrieval_augmented_generation_with_db(query, current_paper_id)
    else:
        return "Error: No paper selected for RAG"

def get_bibtex_from_doi(doi: str) -> str:
    headers = {
        "Accept": "application/x-bibtex"
    }
    url = f"https://doi.org/{doi}"
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.text


async def chat_with_pdf_stream(message: str, paper_id: str):
    """
    Handle chat interactions about PDFs using a ReAct agent with streaming.
    Yields thinking steps in real-time as they complete, then final answer.
    Uses database-stored embeddings for efficient retrieval.
    
    Args:
        message: The user's message
        paper_id: ID of the paper (required - uses database embeddings)
    """
    if not paper_id:
        yield {"type": "error", "content": "Error: paper_id is required for chat"}
        return
        
    global current_paper_id
    current_paper_id = paper_id
    
    try:
        # Create a ReAct agent with database-backed RAG tools
        tools = [retrieval_augmented_generation_tool, search_web]
            
        react_agent = dspy.ReAct(
            signature="question -> answer",
            tools=tools,
            max_iters=5
        )
        
        stream_listeners = [
            dspy.streaming.StreamListener(signature_field_name="next_thought", allow_reuse=True),
        ]
        stream_react = dspy.streamify(react_agent, stream_listeners=stream_listeners)
        
        output = stream_react(question=message)
        
        chunk_buffer = ""
        # https://dspy.ai/tutorials/streaming/#streaming-multiple-fields
        async for response in output:
            if isinstance(response, dspy.streaming.StreamResponse):
                chunk_buffer += response.chunk
                
                if response.is_last_chunk:
                    if chunk_buffer.strip():  
                        yield {"type": "thought", "content": chunk_buffer.strip()}
                    chunk_buffer = ""
                    
            elif isinstance(response, dspy.Prediction):
                final_answer = str(response.answer).strip()
                if final_answer:
                    yield {"type": "answer", "content": final_answer}
                
    except Exception as e:
        yield {"type": "error", "content": f"Error processing your question: {str(e)}"}
    finally:
        current_paper_id = None


def chat_with_pdf(message: str, paper_id: str) -> str:
    """
    Synchronous wrapper for PDF chat using database-backed embeddings.
    
    Args:
        message: The user's message
        paper_id: ID of the paper (required - uses database embeddings)
    """
    if not paper_id:
        return "Error: paper_id is required for chat"
        
    global current_paper_id
    current_paper_id = paper_id
    
    try:
        # Create a ReAct agent with database-backed RAG tools
        tools = [retrieval_augmented_generation_tool, search_web]
            
        react_agent = dspy.ReAct(
            signature="question -> answer",
            tools=tools,
            max_iters=5
        )
        
        result = react_agent(question=message)
        return str(result.answer)
    except Exception as e:
        return f"Error processing your question: {str(e)}"
    finally:
        current_paper_id = None

