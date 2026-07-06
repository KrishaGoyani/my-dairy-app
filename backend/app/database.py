from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import DATABASE_NAME, MONGODB_URL

client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    global client, db
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    await ensure_indexes()


async def ensure_indexes() -> None:
    if db is None:
        return
    await db.customers.create_index("is_active")
    await db.deliveries.create_index("customer_id")
    await db.payments.create_index("customer_id")


async def close_db() -> None:
    global client, db
    if client:
        client.close()
    client = None
    db = None


def get_db() -> AsyncIOMotorDatabase:
    if db is None:
        raise RuntimeError("Database not connected")
    return db
