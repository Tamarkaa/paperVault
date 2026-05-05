# 📚 PaperVault

A full-stack web application built with:

* **Backend:** Python + FastAPI
* **Frontend:** React + TypeScript (Vite)
* **Database:** PostgreSQL

---

## Prerequisites

Make sure you have the following installed:

* Python **3.8+**
* Node.js **18+** and npm
* PostgreSQL **13+**

---

## Getting Started

### 1. Environment Setup

Copy the example environment file and configure your variables:

```bash
cp .env.example .env
```

Then update `.env` with your credentials.

---

### 2. Database Setup

Create a PostgreSQL database (db/schema.sql

### 3. Backend Setup

```bash
cd be

# Create virtual environment
python -m venv .venv

# Activate it
# macOS / Linux:
source .venv/bin/activate

# Windows:
.venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Start server
python server.py
```

Backend runs at: [http://localhost:8000](http://localhost:8000)

---

### 4. Frontend Setup

```bash
cd fe

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: [http://localhost:5173](http://localhost:5173)

---

## Running the Application

Start the services in this order:

1. **PostgreSQL** (ensure it's running)

2. **Backend**

```bash
cd be
source .venv/bin/activate
python server.py
```

3. **Frontend**

```bash
cd fe
npm run dev
```

Open in browser:
[http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
bookie/
├── be/                 # FastAPI backend
├── fe/                 # React + TypeScript frontend
├── db/                 # PostgreSQL schema
└── .env.example        # Environment variables template
```

---
