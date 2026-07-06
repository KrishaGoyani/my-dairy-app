import asyncio
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query

from app.database import get_db
from app.models.schemas import (
    CustomerCreate,
    CustomerResponse,
    CustomerSortType,
    CustomerUpdate,
)
from app.utils import serialize_doc, to_object_id

router = APIRouter(prefix="/customers", tags=["customers"])


def _customer_entry_time(customer: dict) -> datetime:
    created = customer.get("created_at")
    if created:
        return created
    return customer["_id"].generation_time.replace(tzinfo=None)


def _sort_customers(customers: list[dict], sort: CustomerSortType) -> list[dict]:
    if sort == "name":
        return sorted(customers, key=lambda c: (c.get("name") or "").casefold())
    if sort == "name_desc":
        return sorted(
            customers, key=lambda c: (c.get("name") or "").casefold(), reverse=True
        )
    return sorted(
        customers,
        key=lambda c: (_customer_entry_time(c), str(c["_id"])),
    )


async def _bulk_customer_balances(
    db, customer_ids: list[str]
) -> dict[str, dict[str, float]]:
    if not customer_ids:
        return {}

    delivery_pipeline = [
        {"$match": {"customer_id": {"$in": customer_ids}}},
        {"$group": {"_id": "$customer_id", "total": {"$sum": "$amount"}}},
    ]
    payment_pipeline = [
        {"$match": {"customer_id": {"$in": customer_ids}}},
        {"$group": {"_id": "$customer_id", "total": {"$sum": "$amount"}}},
    ]

    delivery_rows, payment_rows = await asyncio.gather(
        db.deliveries.aggregate(delivery_pipeline).to_list(len(customer_ids)),
        db.payments.aggregate(payment_pipeline).to_list(len(customer_ids)),
    )

    deliveries_map = {row["_id"]: row["total"] for row in delivery_rows}
    payments_map = {row["_id"]: row["total"] for row in payment_rows}

    balances: dict[str, dict[str, float]] = {}
    for cid in customer_ids:
        total_deliveries = deliveries_map.get(cid, 0)
        total_payments = payments_map.get(cid, 0)
        balances[cid] = {
            "total_deliveries": round(total_deliveries, 2),
            "total_payments": round(total_payments, 2),
        }
    return balances


def _balance_from_totals(
    opening_balance: float, totals: dict[str, float]
) -> dict[str, float]:
    total_deliveries = totals.get("total_deliveries", 0)
    total_payments = totals.get("total_payments", 0)
    return {
        "balance": round(opening_balance + total_deliveries - total_payments, 2),
        "total_deliveries": total_deliveries,
        "total_payments": total_payments,
    }


async def _customer_balance(db, customer_id: ObjectId, opening_balance: float) -> dict:
    cid = str(customer_id)
    delivery_agg = await db.deliveries.aggregate(
        [
            {"$match": {"customer_id": cid}},
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$amount"},
                }
            },
        ]
    ).to_list(1)

    payment_agg = await db.payments.aggregate(
        [
            {"$match": {"customer_id": cid}},
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$amount"},
                }
            },
        ]
    ).to_list(1)

    total_deliveries = delivery_agg[0]["total"] if delivery_agg else 0
    total_payments = payment_agg[0]["total"] if payment_agg else 0
    balance = opening_balance + total_deliveries - total_payments

    return {
        "balance": round(balance, 2),
        "total_deliveries": round(total_deliveries, 2),
        "total_payments": round(total_payments, 2),
    }


def _format_customer(doc: dict, balance_info: dict) -> CustomerResponse:
    created = doc.get("created_at")
    if not created:
        created = doc["_id"].generation_time.replace(tzinfo=None)
    return CustomerResponse(
        id=str(doc["_id"]),
        name=doc["name"],
        phone=doc.get("phone", ""),
        address=doc.get("address", ""),
        opening_balance=doc.get("opening_balance", 0),
        is_active=doc.get("is_active", True),
        created_at=created,
        **balance_info,
    )


@router.get("", response_model=list[CustomerResponse])
async def list_customers(
    active_only: bool = True,
    sort: CustomerSortType = Query("entry"),
):
    db = get_db()
    query = {"is_active": True} if active_only else {}
    customers = await db.customers.find(query).to_list(500)
    customers = _sort_customers(customers, sort)

    customer_ids = [str(customer["_id"]) for customer in customers]
    balances = await _bulk_customer_balances(db, customer_ids)

    return [
        _format_customer(
            customer,
            _balance_from_totals(
                customer.get("opening_balance", 0),
                balances.get(str(customer["_id"]), {}),
            ),
        )
        for customer in customers
    ]


@router.post("", response_model=CustomerResponse, status_code=201)
async def create_customer(payload: CustomerCreate):
    db = get_db()
    doc = {
        **payload.model_dump(),
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    inserted = await db.customers.insert_one(doc)
    doc["_id"] = inserted.inserted_id
    balance_info = await _customer_balance(db, doc["_id"], doc["opening_balance"])
    return _format_customer(doc, balance_info)


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str):
    db = get_db()
    try:
        oid = to_object_id(customer_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid customer id") from exc

    customer = await db.customers.find_one({"_id": oid})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    balance_info = await _customer_balance(
        db, customer["_id"], customer.get("opening_balance", 0)
    )
    return _format_customer(customer, balance_info)


@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, payload: CustomerUpdate):
    db = get_db()
    try:
        oid = to_object_id(customer_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid customer id") from exc

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    result = await db.customers.find_one_and_update(
        {"_id": oid},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Customer not found")

    balance_info = await _customer_balance(
        db, result["_id"], result.get("opening_balance", 0)
    )
    return _format_customer(result, balance_info)


@router.delete("/{customer_id}")
async def delete_customer(customer_id: str):
    db = get_db()
    try:
        oid = to_object_id(customer_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid customer id") from exc

    result = await db.customers.update_one(
        {"_id": oid},
        {"$set": {"is_active": False}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"ok": True}
