from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import auth, warehouses, products, operations
from app.services.websocket import ws_manager

app = FastAPI(
    title="Invenza API",
    description="Modular Inventory Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(warehouses.router)
app.include_router(products.router)
app.include_router(operations.router)


# ── WebSocket ──────────────────────────────────────────────────────────────
@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; server pushes to client
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# ── Health check ───────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "app": "Invenza"}


# ── Startup / shutdown ─────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    # Optionally create tables (use Alembic in production)
    pass


@app.on_event("shutdown")
async def shutdown():
    pass
