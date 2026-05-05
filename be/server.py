from fastapi import FastAPI, requests, HTTPException
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
import os
from pydantic import BaseModel
import psycopg2
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from datetime import datetime
import requests
import bibtexparser
import test
import uuid
import json
import logging
from tools import store_paper_chunks_with_embeddings, extract_text_from_pdf, chunk_text, generate_initial_summary, update_conversation_notes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

db_host = os.getenv("DB_HOST")
db_name = os.getenv("DB_NAME")
db_user = os.getenv("DB_USER")
db_password = os.getenv("DB_PASSWORD")

app = FastAPI()

# ==================== Agent Session Management ====================
# Dictionary to store active agent sessions
agent_sessions = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_connection():
    return psycopg2.connect(
        host=db_host,
        database=db_name,
        user=db_user,
        password=db_password
    )


# ==================== Models ====================

class ResearchPaper(BaseModel):
    title: str
    authors: str
    description: str
    filePath: str
    citation: str
    notes: Optional[str] = None


class UserPaper(BaseModel):
    paperId: str

class UpdateUserPaper(BaseModel):
    paperId: str
    status: str
    dateFinished: Optional[str] = None

class UpdatePaperNotes(BaseModel):
    conversation_summary: str

class DOIRequest(BaseModel):
    doi: str

class Category(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None


# ==================== Paper Endpoints ====================

@app.get("/papers")
def get_papers():
    """Fetch all research papers"""
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id, title, authors, description, file_path, citation, summary, conversation_notes, date_added
            FROM research_papers
            ORDER BY date_added DESC
        """)
        rows = cur.fetchall()

        papers = [
            {
                "id": r[0],
                "title": r[1],
                "authors": r[2],
                "description": r[3],
                "filePath": r[4],
                "citation": r[5],
                "summary": r[6],
                "conversationNotes": r[7],
                "dateAdded": r[8].isoformat() if r[8] else None,
            }
            for r in rows
        ]
        return papers
    finally:
        cur.close()
        conn.close()


@app.post("/papers")
def create_paper(paper: ResearchPaper):
    """Add a new research paper and generate embeddings"""
    conn = get_connection()
    cur = conn.cursor()

    try:
        # Generate initial summary from PDF
        summary = None
        try:
            logger.info(f"Generating initial summary for paper from {paper.filePath}")
            summary = generate_initial_summary(paper.filePath)
            logger.info("Initial summary generated successfully")
        except Exception as e:
            logger.error(f"Error generating initial summary: {str(e)}", exc_info=True)
            # Include the actual error in the summary for debugging
            summary = f"Summary generation failed: {str(e)[:200]}"
        
        cur.execute("""
            INSERT INTO research_papers (title, authors, description, file_path, citation, summary, conversation_notes, date_added)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (paper.title, paper.authors, paper.description, paper.filePath, paper.citation, summary, None, datetime.now()))
        
        paper_id = cur.fetchone()[0]
        conn.commit()
        logger.info(f"Paper created with ID: {paper_id}")
        
        # Generate embeddings and store chunks
        try:
            logger.info(f"Starting embedding generation for paper {paper_id}")
            logger.info(f"Extracting text from PDF: {paper.filePath}")
            extracted_text = extract_text_from_pdf(paper.filePath)
            logger.info(f"Extracted {len(extracted_text)} characters")
            
            logger.info("Chunking text...")
            text_chunks = chunk_text(extracted_text)
            logger.info(f"Created {len(text_chunks)} chunks")
            
            logger.info("Storing chunks with embeddings...")
            store_paper_chunks_with_embeddings(paper_id, text_chunks)
            logger.info(f"Successfully stored embeddings for paper {paper_id}")
        except Exception as e:
            logger.error(f"Error generating embeddings for paper {paper_id}: {str(e)}", exc_info=True)
            # Continue even if embedding generation fails - paper is still created
        
        return {"id": paper_id, **paper.dict(), "summary": summary, "conversationNotes": None}
    finally:
        cur.close()
        conn.close()


@app.delete("/papers/{paper_id}")
def delete_paper(paper_id: str):
    """Delete a research paper and its embeddings"""
    conn = get_connection()
    cur = conn.cursor()

    try:
        # Delete chunks and embeddings first (optional, cascade will handle it)
        cur.execute("DELETE FROM paper_chunks WHERE paper_id = %s", (paper_id,))
        # Delete paper (cascades to user_papers due to foreign key)
        cur.execute("DELETE FROM research_papers WHERE id = %s", (paper_id,))
        cur.execute("DELETE FROM user_papers WHERE paper_id = %s", (paper_id,))
        conn.commit()
        return {"status": "deleted"}
    finally:
        cur.close()
        conn.close()


# ==================== User Papers Endpoints ====================

@app.get("/user-papers")
def get_user_papers():
    """Fetch all user papers"""
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT paper_id, status, date_added, date_finished
            FROM user_papers
            ORDER BY date_added DESC
        """)
        rows = cur.fetchall()

        user_papers = [
            {
                "paperId": r[0],
                "status": r[1],
                "dateAdded": r[2].isoformat() if r[2] else None,
                "dateFinished": r[3].isoformat() if r[3] else None,
            }
            for r in rows
        ]
        return user_papers
    finally:
        cur.close()
        conn.close()


@app.post("/user-papers")
def create_user_paper(user_paper: UserPaper):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO user_papers (paper_id, status, date_added)
            VALUES (%s, %s, %s)
        """, (user_paper.paperId, 'to-read', datetime.now()))
        
        conn.commit()
        return {"paperId": user_paper.paperId, "status": "to-read", "dateAdded": datetime.now().isoformat()}
    finally:
        cur.close()
        conn.close()


@app.put("/user-papers/{paper_id}")
def update_user_paper(paper_id: str, user_paper: UpdateUserPaper):
    """Update a user paper's status"""
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE user_papers
            SET status = %s, date_finished = %s
            WHERE paper_id = %s
        """, (user_paper.status, user_paper.dateFinished, paper_id))
        
        conn.commit()
        return user_paper.dict()
    finally:
        cur.close()
        conn.close()


@app.delete("/user-papers/{paper_id}")
def delete_user_paper(paper_id: str):
    """Remove a paper from user's collection"""
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("DELETE FROM user_papers WHERE paper_id = %s", (paper_id,))
        conn.commit()
        return {"status": "deleted"}
    finally:
        cur.close()
        conn.close()


# ==================== GET DATA FROM DOI ====================


def get_bibtex_from_doi(doi: str) -> str:
    headers = {
        "Accept": "application/x-bibtex"
    }
    url = f"https://doi.org/{doi}"
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.text

def extract_title_and_authors(bibtex: str):
    parser = bibtexparser.loads(bibtex)
    entry = parser.entries[0]

    title = entry.get("title", "")
    authors_raw = entry.get("author", "")

    authors_list = [a.strip() for a in authors_raw.split(" and ")]

    if len(authors_list) > 1:
        first_author = authors_list[0].split(",")[0]
        authors = f"{first_author} et al."
    else:
        authors = authors_list[0] if authors_list else ""

    return title, authors


@app.post("/api/doi")
def fetch_doi_data(request: DOIRequest):
    try:
        bibtex = get_bibtex_from_doi(request.doi)
        title, authors = extract_title_and_authors(bibtex)

        return {
            "title": title,
            "authors": authors,
            "citation": bibtex
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Simple endpoint to serve PDF files from the repository (safe-guarded to repo root)
@app.get("/pdf")
def serve_pdf(path: str):
    # Resolve path safely and ensure it's inside the repo root.
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

    # If the client provided a relative path, treat it as relative to repo_root.
    if os.path.isabs(path):
        abs_path = os.path.abspath(path)
    else:
        abs_path = os.path.abspath(os.path.join(repo_root, path))

    # Ensure the resolved path is inside the repository root to avoid traversal.
    repo_root_with_sep = repo_root if repo_root.endswith(os.sep) else repo_root + os.sep
    if not (abs_path == repo_root or abs_path.startswith(repo_root_with_sep)):
        raise HTTPException(status_code=403, detail="Access to the requested file is forbidden")

    if not os.path.isfile(abs_path) or not abs_path.lower().endswith('.pdf'):
        raise HTTPException(status_code=404, detail="PDF not found")

    return FileResponse(abs_path, media_type='application/pdf')


# ==================== Agent Lifecycle Endpoints ====================

@app.post("/agent/init")
def init_agent(payload: dict):
    """Initialize a chat agent for a specific PDF.
    Uses database-stored embeddings for efficient retrieval.
    
    Accepts either paperId or filePath:
    - paperId: Direct paper ID (preferred)
    - filePath: File path to look up the paper in database (backward compatible)
    """
    paper_id = payload.get('paperId')
    file_path = payload.get('filePath')
    
    # Try paperId first, then look up by filePath
    if not paper_id and file_path:
        conn = get_connection()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT id FROM research_papers WHERE file_path = %s
            """, (file_path,))
            result = cur.fetchone()
            if result:
                paper_id = result[0]
            else:
                raise HTTPException(status_code=404, detail=f"Paper not found with file_path: {file_path}")
        finally:
            cur.close()
            conn.close()
    
    if not paper_id:
        raise HTTPException(status_code=400, detail="paperId or filePath is required to initialize chat session")
    
    # Generate unique session ID for this PDF session
    session_id = str(uuid.uuid4())
    
    # Store session info
    agent_sessions[session_id] = {
        "paper_id": paper_id,
        "created_at": datetime.now(),
        "message_count": 0
    }
    
    return JSONResponse({
        "session_id": session_id,
        "message": f"Agent initialized for paper: {paper_id}"
    })


@app.post("/agent/close")
def close_agent(payload: dict):
    """Close the chat agent and cleanup session."""
    session_id = payload.get('session_id')
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    if session_id in agent_sessions:
        del agent_sessions[session_id]
        return JSONResponse({"message": "Agent closed successfully"})
    
    return JSONResponse({"message": "Session not found"}, status_code=404)


# Streaming chat endpoint with Server-Sent Events
@app.post("/chat/stream")
async def chat_stream_endpoint(payload: dict):
    """Stream agent thoughts and answer in real-time."""
    try:
        message = payload.get('message', '')
        session_id = payload.get('session_id', None)
        
        # Get paper_id from session (required for database-backed RAG)
        paper_id = None
        if session_id and session_id in agent_sessions:
            paper_id = agent_sessions[session_id].get("paper_id")
            agent_sessions[session_id]["message_count"] += 1
        
        if not paper_id:
            return JSONResponse(
                {"error": "paper_id is required for chat. Please initialize a session with paperId."},
                status_code=400
            )
        
        async def generate():
            """Generator function that streams agent responses."""
            try:
                async for chunk in test.chat_with_pdf_stream(message, paper_id):
                    # Format as Server-Sent Events
                    yield f"data: {json.dumps(chunk)}\n\n"
            except Exception as e:
                error_chunk = {"type": "error", "content": f"Streaming error: {str(e)}"}
                yield f"data: {json.dumps(error_chunk)}\n\n"
        
        return StreamingResponse(generate(), media_type="text/event-stream")
    except Exception as e:
        import traceback
        print(f"Error in streaming chat endpoint: {str(e)}")
        print(traceback.format_exc())
        return JSONResponse(
            {"error": f"Failed to initialize stream: {str(e)}"}, 
            status_code=500
        )


@app.post("/chat")
def chat_endpoint(payload: dict):
    try:
        message = payload.get('message', '')
        session_id = payload.get('session_id', None)
        
        # Get paper_id from session (required for database-backed RAG)
        paper_id = None
        if session_id and session_id in agent_sessions:
            paper_id = agent_sessions[session_id].get("paper_id")
            agent_sessions[session_id]["message_count"] += 1
        
        if not paper_id:
            return JSONResponse(
                {"error": "paper_id is required for chat. Please initialize a session with paperId."},
                status_code=400
            )
        
        # Call the chat function with paper_id
        reply = test.chat_with_pdf(message, paper_id)
        return JSONResponse({"reply": reply})
    except Exception as e:
        import traceback
        print(f"Error in chat endpoint: {str(e)}")
        print(traceback.format_exc())
        return JSONResponse(
            {"error": f"Failed to process message: {str(e)}"}, 
            status_code=500
        )


# ==================== Paper Notes/Summary Endpoints ====================

@app.post("/papers/{paper_id}/update-notes")
def update_paper_notes(paper_id: str, notes_update: UpdatePaperNotes):
    """
    Update research paper notes after a conversation.
    Merges the conversation summary with existing notes intelligently.
    
    Args:
        paper_id: ID of the paper
        notes_update: UpdatePaperNotes with conversation_summary
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        conversation_summary = notes_update.conversation_summary
        
        if not conversation_summary:
            return JSONResponse(
                {"error": "conversation_summary is required"},
                status_code=400
            )
        
        # Get current conversation notes
        cur.execute("""
            SELECT conversation_notes FROM research_papers WHERE id = %s
        """, (paper_id,))
        
        result = cur.fetchone()
        if not result:
            return JSONResponse(
                {"error": f"Paper not found: {paper_id}"},
                status_code=404
            )
        
        existing_conversation_notes = result[0] or ""
        
        # Update only conversation notes
        logger.info(f"Updating conversation notes for paper {paper_id}")
        merged_notes = update_conversation_notes(existing_conversation_notes, conversation_summary)
        logger.info(f"Successfully updated conversation notes for paper {paper_id}")
        
        # Update the paper with merged conversation notes
        cur.execute("""
            UPDATE research_papers SET conversation_notes = %s WHERE id = %s
        """, (merged_notes, paper_id))
        
        conn.commit()
        
        return JSONResponse({
            "status": "updated",
            "notes": merged_notes
        })
        
    except Exception as e:
        logger.error(f"Error updating paper notes: {str(e)}", exc_info=True)
        return JSONResponse(
            {"error": f"Failed to update notes: {str(e)}"},
            status_code=500
        )
    finally:
        cur.close()
        conn.close()


@app.get("/papers/{paper_id}/notes")
def get_paper_notes(paper_id: str):
    """Fetch summary and conversation notes for a specific paper"""
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT summary, conversation_notes FROM research_papers WHERE id = %s
        """, (paper_id,))
        
        result = cur.fetchone()
        if not result:
            return JSONResponse(
                {"error": f"Paper not found: {paper_id}"},
                status_code=404
            )
        
        summary = result[0] or ""
        conversation_notes = result[1] or ""
        
        return JSONResponse({
            "paperId": paper_id,
            "summary": summary,
            "conversationNotes": conversation_notes
        })
        
    except Exception as e:
        logger.error(f"Error fetching paper notes: {str(e)}", exc_info=True)
        return JSONResponse(
            {"error": f"Failed to fetch notes: {str(e)}"},
            status_code=500
        )
    finally:
        cur.close()
        conn.close()


# ==================== Categories Endpoints ====================

@app.get("/categories")
def get_categories():
    """Fetch all categories"""
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id, name, description, color, created_at
            FROM categories
            ORDER BY created_at DESC
        """)
        rows = cur.fetchall()

        categories = [
            {
                "id": r[0],
                "name": r[1],
                "description": r[2],
                "color": r[3],
                "createdAt": r[4].isoformat() if r[4] else None,
            }
            for r in rows
        ]
        return categories
    finally:
        cur.close()
        conn.close()


@app.post("/categories")
def create_category(category: Category):
    """Create a new category"""
    conn = get_connection()
    cur = conn.cursor()

    try:
        color = category.color or "#c97fc5"
        cur.execute("""
            INSERT INTO categories (name, description, color)
            VALUES (%s, %s, %s)
            RETURNING id, created_at
        """, (category.name, category.description, color))
        
        result = cur.fetchone()
        conn.commit()
        
        return {
            "id": result[0],
            "name": category.name,
            "description": category.description,
            "color": color,
            "createdAt": result[1].isoformat() if result[1] else None,
        }
    except psycopg2.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    finally:
        cur.close()
        conn.close()


@app.delete("/categories/{category_id}")
def delete_category(category_id: str):
    """Delete a category"""
    conn = get_connection()
    cur = conn.cursor()

    try:
        # Delete all paper-category mappings first
        cur.execute("DELETE FROM paper_categories WHERE category_id = %s", (category_id,))
        # Then delete the category
        cur.execute("DELETE FROM categories WHERE id = %s", (category_id,))
        conn.commit()
        return {"status": "deleted"}
    finally:
        cur.close()
        conn.close()


@app.post("/papers/{paper_id}/categories/{category_id}")
def add_paper_to_category(paper_id: str, category_id: str):
    """Add a paper to a category"""
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO paper_categories (paper_id, category_id)
            VALUES (%s, %s)
            RETURNING id
        """, (paper_id, category_id))
        
        result = cur.fetchone()
        conn.commit()
        
        return {"id": result[0], "paperId": paper_id, "categoryId": category_id}
    except psycopg2.IntegrityError:
        conn.rollback()
        # This could mean the paper or category doesn't exist, or it's already in the category
        raise HTTPException(status_code=400, detail="Paper is already in this category or invalid IDs")
    finally:
        cur.close()
        conn.close()


@app.delete("/papers/{paper_id}/categories/{category_id}")
def remove_paper_from_category(paper_id: str, category_id: str):
    """Remove a paper from a category"""
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            DELETE FROM paper_categories 
            WHERE paper_id = %s AND category_id = %s
        """, (paper_id, category_id))
        conn.commit()
        return {"status": "removed"}
    finally:
        cur.close()
        conn.close()


@app.get("/papers/{paper_id}/categories")
def get_paper_categories(paper_id: str):
    """Get all categories for a specific paper"""
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT c.id, c.name, c.description, c.color, c.created_at
            FROM categories c
            INNER JOIN paper_categories pc ON c.id = pc.category_id
            WHERE pc.paper_id = %s
            ORDER BY c.created_at DESC
        """, (paper_id,))
        rows = cur.fetchall()

        categories = [
            {
                "id": r[0],
                "name": r[1],
                "description": r[2],
                "color": r[3],
                "createdAt": r[4].isoformat() if r[4] else None,
            }
            for r in rows
        ]
        return categories
    finally:
        cur.close()
        conn.close()


@app.get("/categories/{category_id}/papers")
def get_category_papers(category_id: str):
    """Get all papers in a specific category"""
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT rp.id, rp.title, rp.authors, rp.description, rp.file_path, rp.citation, 
                   rp.summary, rp.conversation_notes, rp.date_added
            FROM research_papers rp
            INNER JOIN paper_categories pc ON rp.id = pc.paper_id
            WHERE pc.category_id = %s
            ORDER BY rp.date_added DESC
        """, (category_id,))
        rows = cur.fetchall()

        papers = [
            {
                "id": r[0],
                "title": r[1],
                "authors": r[2],
                "description": r[3],
                "filePath": r[4],
                "citation": r[5],
                "summary": r[6],
                "conversationNotes": r[7],
                "dateAdded": r[8].isoformat() if r[8] else None,
            }
            for r in rows
        ]
        return papers
    finally:
        cur.close()
        conn.close()

