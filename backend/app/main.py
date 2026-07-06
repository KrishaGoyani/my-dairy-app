from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.database import close_db, connect_db, get_db
from app.routes import bills, customers, dashboard, deliveries, payments, rates, reports
from app.seed import seed_rates


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await seed_rates(get_db())
    yield
    await close_db()


app = FastAPI(
    title="Dairy Management API",
    description="Admin API for milk delivery and billing",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router, prefix="/api")
app.include_router(rates.router, prefix="/api")
app.include_router(deliveries.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(bills.router, prefix="/api")
app.include_router(reports.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
