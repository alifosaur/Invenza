# Invenza — Inventory Management System

A full-stack, real-time inventory management system built with React + FastAPI.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite), Vanilla CSS |
| Backend | Python 3.9+, FastAPI (async) |
| ORM | SQLAlchemy 2.0 async + Alembic |
| Database | PostgreSQL (asyncpg driver) |
| Auth | JWT access + refresh tokens, bcrypt |
| Real-time | FastAPI native WebSockets |
| Validation | Pydantic v2 |

---

## Getting Started (Docker - Recommended)

The easiest way to run the entire stack is with Docker Compose. This will spin up the PostgreSQL database, the FastAPI backend, and the React frontend.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Run with Docker

1. **Start the stack**
   ```bash
   docker-compose up -d --build
   ```

2. **Access the application**
   - **Frontend:** http://localhost:5174
   - **Backend API Docs:** http://localhost:8000/docs
   - **Database:** `localhost:5432` (User: `postgres`, Password: `password`, DB: `invenza`)

3. **Stop the stack**
   ```bash
   docker-compose down
   ```

*(Note: The Docker setup automatically runs database migrations on startup.)*

---

## Getting Started (Local Development)

If you prefer to run the services locally without Docker:

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+ running locally

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy env file and configure
cp .env.example .env
# Edit .env — set DATABASE_URL to your local Postgres instance

# Run migrations
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

---

## Key Features

- **Hardened Auth**: JWT + bcrypt + In-memory rate limiting + 3-step OTP password reset.
- **Role-based Access**: Inventory Manager (full access) vs Warehouse Staff (operational access).
- **Real-time Dashboard**: Live KPI updates pushed via WebSockets on any stock operation.
- **Operations & Movements**: Track Receipts (IN), Deliveries (OUT), Transfers, and Adjustments.
- **Stock Management**: Transactional stock mutations with `SELECT FOR UPDATE` to prevent race conditions.
