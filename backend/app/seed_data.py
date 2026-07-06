"""
Seed MongoDB Atlas: create collections (via insert) + 1 sample customer.
Uses MongoDB ObjectId for _id automatically.
Run: cd backend && source venv/bin/activate && python -m app.seed_data
"""

import asyncio
from datetime import datetime

from app.config import DATABASE_NAME, MONGODB_URL
from app.database import close_db, connect_db, get_db
from app.seed import DEFAULT_RATES, seed_rates


async def main() -> None:
    print(f"Connecting to: {MONGODB_URL.split('@')[-1]}")
    print(f"Database: {DATABASE_NAME}")

    await connect_db()
    db = get_db()

    await seed_rates(db)
    rates_count = await db.rates.count_documents({})
    print(f"Collection 'rates': {rates_count} document(s)")

    existing = await db.customers.find_one({"name": "Rushibhai"})
    if existing:
        print(f"Collection 'customers': sample already exists")
        print(f"  _id (ObjectId): {existing['_id']}")
        print(f"  name: {existing['name']}")
    else:
        doc = {
            "name": "Rushibhai",
            "phone": "9876543210",
            "address": "Main Road",
            "opening_balance": 0,
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        result = await db.customers.insert_one(doc)
        print("Collection 'customers': inserted 1 sample record")
        print(f"  _id (ObjectId): {result.inserted_id}")
        print(f"  name: {doc['name']}")

    collections = await db.list_collection_names()
    print(f"\nCollections in '{DATABASE_NAME}': {', '.join(sorted(collections))}")

    await close_db()
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
