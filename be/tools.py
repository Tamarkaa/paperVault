import os
from dotenv import load_dotenv
import fitz
import litellm
import requests
from chonkie import SemanticChunker
from sentence_transformers import SentenceTransformer
import warnings
import logging
import psycopg2
from psycopg2.extras import execute_values

# Suppress HuggingFace and SentenceTransformer warnings
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN"] = "1"
warnings.filterwarnings("ignore")
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("huggingface_hub").setLevel(logging.ERROR)

load_dotenv(override=True)
ai_api_key = os.getenv("LLM_API_KEY")
ai_api_base = os.getenv("LLM_API_BASE")
ai_model = os.getenv("LLM_MODEL_NAME")
web_api_key = os.getenv("WEB_API_KEY")
web_api_url = os.getenv("WEB_API_URL")
db_host = os.getenv("DB_HOST")
db_name = os.getenv("DB_NAME")
db_user = os.getenv("DB_USER")
db_password = os.getenv("DB_PASSWORD")

embedder = SentenceTransformer('all-MiniLM-L6-v2')

# ============== Web Search ==============

def search_web(query: str) -> str:
    """Search the web for information."""
    url = web_api_url
    payload = {
        "q": query
    }
    headers = {
        'X-API-KEY': web_api_key,
        'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, json=payload)
    return f"Search results for '{query}': {response.text}"

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file."""
    mypdf = fitz.open(pdf_path)
    all_text = ""  # Initialize an empty string to store the extracted text

    # Iterate through each page in the PDF
    for page_num in range(mypdf.page_count):
        page = mypdf[page_num]  # Get the page
        text = page.get_text("text")  # Extract text from the page
        all_text += text  # Append the extracted text to the all_text string

    return all_text  # Return the extracted text

def chunk_text(text):
    # Initialize the chunker
    chunker = SemanticChunker()

    # Chunk some text
    chunks = chunker(text)

    return chunks  # Return the list of text chunks


# ============== Database Functions for Embeddings ==============

def get_db_connection():
    """Create and return database connection"""
    return psycopg2.connect(
        host=db_host,
        database=db_name,
        user=db_user,
        password=db_password
    )

def store_paper_chunks_with_embeddings(paper_id: str, text_chunks):
    """
    Store paper chunks and their embeddings in the database
    
    Args:
        paper_id: ID of the paper
        text_chunks: List of chunk objects from SemanticChunker (with .text attribute)
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Extract text from chunks
        texts = [c.text if hasattr(c, "text") else str(c) for c in text_chunks]
        
        # Generate embeddings for all chunks
        embeddings_list = embedder.encode(texts, convert_to_numpy=True)
        
        # Prepare data for insertion - embeddings as list of floats
        chunk_data = [
            (
                paper_id,
                text,
                idx,
                embeddings_list[idx].tolist()  # Store as list of floats
            )
            for idx, text in enumerate(texts)
        ]
        
        # Insert chunks and embeddings
        execute_values(
            cur,
            """
            INSERT INTO paper_chunks (paper_id, chunk_text, chunk_index, embedding)
            VALUES %s
            ON CONFLICT DO NOTHING
            """,
            chunk_data
        )
        
        conn.commit()
        print(f"Stored {len(chunk_data)} chunks for paper {paper_id}")
        
    except Exception as e:
        conn.rollback()
        print(f"Error storing chunks: {e}")
        raise
    finally:
        cur.close()
        conn.close()

def retrieve_relevant_chunks(query: str, paper_id: str, k: int = 1, context_size: int = 1) -> list:
    """
    Retrieve the most relevant chunks for a query using pgvector similarity search
    
    Args:
        query: The query string
        paper_id: ID of the paper to search in
        k: Number of top chunks to retrieve
        context_size: Number of adjacent chunks to include for context
    
    Returns:
        List of relevant chunks with context
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Generate embedding for the query
        query_embedding = embedder.encode([query], convert_to_numpy=True)[0]
        query_embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
        
        # Query pgvector for top k similar chunks using cosine similarity
        # Using <-> operator for cosine distance
        cur.execute("""
            SELECT id, chunk_index, chunk_text, embedding <-> %s::vector as distance
            FROM paper_chunks
            WHERE paper_id = %s
            ORDER BY embedding <-> %s::vector
            LIMIT %s
        """, (query_embedding_str, paper_id, query_embedding_str, k))
        
        top_results = cur.fetchall()
        
        if not top_results:
            return []
        
        # Get the indices of top results
        top_indices = [int(r[1]) for r in top_results]
        
        # Expand to include context
        all_indices = set()
        for idx in top_indices:
            start = max(0, idx - context_size)
            end = idx + context_size + 1 if context_size > 0 else idx + 1
            all_indices.update(range(start, end))
        
        # Retrieve all context chunks
        cur.execute("""
            SELECT chunk_text
            FROM paper_chunks
            WHERE paper_id = %s AND chunk_index = ANY(%s)
            ORDER BY chunk_index
        """, (paper_id, sorted(list(all_indices))))
        
        chunks = [row[0] for row in cur.fetchall()]
        return chunks
        
    except Exception as e:
        print(f"Error retrieving chunks: {e}")
        return []
    finally:
        cur.close()
        conn.close()

def retrieval_augmented_generation_with_db(query: str, paper_id: str) -> str:
    """
    Enhanced RAG that retrieves embeddings from database instead of generating them each time.
    Uses database-stored embeddings for efficient document retrieval.
    
    Args:
        query: The user's question
        paper_id: ID of the paper to search in
    
    Returns:
        AI-generated response based on retrieved context from the paper
    """
    # Retrieve relevant chunks from database using pgvector
    relevant_chunks = retrieve_relevant_chunks(query, paper_id, k=1, context_size=1)
    
    if not relevant_chunks:
        return "No relevant information found in the paper."
    
    # Create the user prompt based on retrieved chunks
    user_prompt = "\n".join([f"Context {i + 1}:\n{chunk}\n=====================================\n" for i, chunk in enumerate(relevant_chunks)])
    user_prompt = f"{user_prompt}\nQuestion: {query}"
    
    # Define the system prompt for RAG-based assistance
    system_prompt = "You are an AI assistant that strictly answers based on the given context from a research paper. If the answer cannot be derived directly from the provided context, respond with: 'I do not have enough information to answer that.'"
    
    # Generate AI response using the retrieved context
    response = litellm.completion(
        model=ai_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        api_key=ai_api_key,
        api_base=ai_api_base,
    )
    
    return response.choices[0].message.content


# ============== Paper Summary Generation ==============

def generate_initial_summary(pdf_path: str) -> str:
    """
    Generate an initial summary of a research paper from its PDF.
    Extracts key information about the paper's purpose, methodology, and findings.
    Target: 500 words
    
    Args:
        pdf_path: Path to the PDF file
    
    Returns:
        Initial summary of the paper (plain text, no formatting)
    """
    try:
        # Extract text from PDF (first few pages contain abstract and intro)
        logging.info(f"Extracting text from PDF: {pdf_path}")
        extracted_text = extract_text_from_pdf(pdf_path)
        logging.info(f"Extracted {len(extracted_text)} characters from PDF")
        
        if not extracted_text or len(extracted_text.strip()) == 0:
            logging.error("PDF extraction resulted in empty text")
            return "Unable to extract text from PDF."
        
        # Use first ~3000 characters to generate summary (to fit within token limits and focus on abstract/intro)
        summary_section = extracted_text[:3000]
        
        system_prompt = """You are an expert research summarizer. Generate a concise summary of this research paper based on the provided text.
        
        The summary should include:
        - main research question
        - Key methodology or approach
        - Main findings or contributions
        - Significance or implications

        Keep it to 500 maximum words. Format it clearly with sections.
        Be accurate and only include information explicitly stated in the text."""
        
        logging.info("Calling LLM to generate summary")
        response = litellm.completion(
            model=ai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Generate a summary for this research paper:\n\n{summary_section}"}
            ],
            api_key=ai_api_key,
            api_base=ai_api_base,
        )
        
        summary = response.choices[0].message.content
        logging.info(f"Generated summary with {len(summary)} characters")
        
        return summary
        
    except Exception as e:
        logging.error(f"Error generating initial summary: {str(e)}", exc_info=True)
        return f"Summary generation failed: {str(e)}"


def update_conversation_notes(existing_conversation_notes: str, new_conversation: str) -> str:
    """
    Update conversation notes by having LLM summarize/consolidate them.
    This ensures all conversations (first or subsequent) go through intelligent summarization.
    
    Args:
        existing_conversation_notes: Current conversation notes (can be empty or None)
        new_conversation: The latest conversation text to add
    
    Returns:
        Summarized/consolidated conversation notes
    """
    try:
        existing_notes_text = (existing_conversation_notes or "").strip()
        new_conversation_text = new_conversation.strip()
        
        if not existing_notes_text:
            # First conversation - summarize it
            system_prompt = """You are an expert research note summarizer. Your task is to extract and summarize the key insights from a conversation about a research paper.

            RULES FOR SUMMARIZING:
            1. Extract only the most important insights and findings discussed
            2. Focus on novel insights, questions raised, or important clarifications
            3. Remove redundancy and repetition
            4. Keep it concise but comprehensive
            5. Target length: 300-400 words
            6. Format with clear sections and bullet points if helpful
            7. Be factual and only include what was explicitly discussed"""
            
            user_message = f"""Please summarize the key insights from this conversation about a research paper:

            CONVERSATION:
            {new_conversation_text}

            Extract and summarize only the most important insights and findings."""
        else:
            # Subsequent conversations - merge with existing notes
            system_prompt = """You are an expert research note consolidator. Your task is to intelligently merge conversation notes about a research paper.

            RULES FOR CONSOLIDATING CONVERSATION NOTES ONLY:
            1. Identify and keep ONLY the most important insights and discussions
            2. Remove redundant information - if a point was mentioned before, don't repeat it
            3. Combine similar insights into one clear statement
            4. Prioritize insights that are novel, surprising, or particularly relevant to understanding the paper
            5. Keep factual, well-supported points over speculative ones
            6. Maintain a logical flow from first conversation to latest
            7. Target length: 300-400 words (concise but comprehensive)
            8. Format with clear sections and bullet points if helpful"""
            
            user_message = f"""Please merge these conversation notes about a research paper.

            EXISTING CONVERSATION NOTES:
            {existing_notes_text}

            NEW CONVERSATION:
            {new_conversation_text}

            Merge these intelligently, keeping only the most important insights and removing redundancy."""
        
        response = litellm.completion(
            model=ai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            api_key=ai_api_key,
            api_base=ai_api_base,
        )
        
        consolidated_notes = response.choices[0].message.content
        return consolidated_notes
        
    except Exception as e:
        logging.error(f"Error updating conversation notes: {str(e)}")
        # Fallback: simple append
        if existing_conversation_notes:
            return f"{existing_conversation_notes}\n\n---\n\n{new_conversation}"
        return new_conversation