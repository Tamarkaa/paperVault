-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create research_papers table
CREATE TABLE IF NOT EXISTS research_papers (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title VARCHAR(255) NOT NULL,
    authors TEXT NOT NULL,
    description TEXT,
    file_path VARCHAR(1024) NOT NULL,
    citation TEXT NOT NULL,
    summary TEXT DEFAULT NULL,
    conversation_notes TEXT DEFAULT NULL,
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_papers table 
CREATE TABLE IF NOT EXISTS user_papers (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    paper_id VARCHAR(255) NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'to-read',
    -- status can be: 'to-read', 'reading', 'read'
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_finished TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create paper_chunks table for embeddings
CREATE TABLE IF NOT EXISTS paper_chunks (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    paper_id VARCHAR(255) NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding vector(384),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create categories table for custom paper categories
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#c97fc5',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create paper_categories table
CREATE TABLE IF NOT EXISTS paper_categories (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    paper_id VARCHAR(255) NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
    category_id VARCHAR(255) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(paper_id, category_id)
);


CREATE INDEX IF NOT EXISTS idx_user_papers_paper_id ON user_papers(paper_id);
CREATE INDEX IF NOT EXISTS idx_user_papers_status ON user_papers(status);
CREATE INDEX IF NOT EXISTS idx_research_papers_date_added ON research_papers(date_added DESC);
CREATE INDEX IF NOT EXISTS idx_paper_chunks_paper_id ON paper_chunks(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_chunks_embedding 
ON paper_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_paper_categories_paper_id ON paper_categories(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_categories_category_id ON paper_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
