"""
Clean Gujarati / old fields from MongoDB (customers + rates).
Run: cd backend && source venv/bin/activate && python -m app.clean_db
"""

import asyncio

from app.database import close_db, connect_db, get_db
from app.seed import normalize_rates


async def main() -> None:
    await connect_db()
    db = get_db()

    # Remove name_gujarati from all customers if it exists
    result = await db.customers.update_many(
        {"name_gujarati": {"$exists": True}},
        {"$unset": {"name_gujarati": ""}},
    )
    print(f"customers: removed name_gujarati from {result.modified_count} document(s)")

    await normalize_rates(db)
    print("rates: fixed naming, set short_label and pack_size")

    sample = await db.customers.find_one()
    if sample:
        print(f"\nSample customer keys: {list(sample.keys())}")

    rate = await db.rates.find_one()
    if rate:
        print(f"Sample rate keys: {list(rate.keys())}")

    await close_db()
    print("\nDone — DB stores English only. Gujarati is UI-only in the app.")


if __name__ == "__main__":
    asyncio.run(main())
