from datetime import date, datetime

import asyncio

from fastapi import APIRouter, HTTPException, Query

from app.database import get_db
from app.models.schemas import (
    DayGroupResponse,
    DeliveryDayBulkSave,
    DeliveryDayBulkSaveResponse,
    DeliveryDayCustomerData,
    DeliveryDayResponse,
    DeliveryLineResponse,
    DeliverySessionCreate,
    DeliverySessionData,
    SessionSummary,
)
from app.utils import to_object_id

router = APIRouter(prefix="/deliveries", tags=["deliveries"])

VALID_COMBOS = {
    ("batli", "M"),
    ("cow", "G"),
    ("potla", "M"),
    ("potla", "G"),
    ("potla", "B"),
}


async def _get_rate_map(db) -> dict[tuple[str, str], float]:
    rates = await db.rates.find().to_list(20)
    return {(r["source"], r["milk_type"]): r["rate"] for r in rates}


def _month_range(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)
    from datetime import timedelta

    last_day = end - timedelta(days=1)
    return start, last_day


def _session_data_from_docs(
    lines: list[dict], payment: dict | None
) -> DeliverySessionData:
    return DeliverySessionData(
        entries=[
            {
                "source": line["source"],
                "milk_type": line["milk_type"],
                "liters": line["liters"],
            }
            for line in lines
        ],
        paid=payment is not None,
        paid_amount=payment["amount"] if payment else 0,
        session_total=round(sum(line["amount"] for line in lines), 2),
    )


def _build_session_records(
    *,
    date_str: str,
    customer_id: str,
    session: str,
    entries,
    paid: bool,
    paid_amount: float | None,
    payment_note: str,
    rate_map: dict[tuple[str, str], float],
    now: datetime,
) -> tuple[list[dict], dict | None, float]:
    delivery_docs: list[dict] = []
    session_total = 0.0

    for entry in entries:
        if entry.liters <= 0:
            continue
        combo = (entry.source, entry.milk_type)
        if combo not in VALID_COMBOS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid source/type combo: {entry.source}/{entry.milk_type}",
            )
        rate = rate_map.get(combo)
        if rate is None:
            raise HTTPException(status_code=400, detail="Rate not configured")

        amount = round(entry.liters * rate, 2)
        session_total += amount
        delivery_docs.append(
            {
                "customer_id": customer_id,
                "date": date_str,
                "session": session,
                "source": entry.source,
                "milk_type": entry.milk_type,
                "liters": entry.liters,
                "rate": rate,
                "amount": amount,
                "created_at": now,
            }
        )

    payment_doc = None
    if paid and session_total > 0:
        resolved_paid = paid_amount if paid_amount is not None else session_total
        resolved_paid = min(resolved_paid, session_total)
        if resolved_paid > 0:
            payment_doc = {
                "customer_id": customer_id,
                "date": date_str,
                "session": session,
                "amount": resolved_paid,
                "payment_type": "immediate",
                "for_month": date_str[:7],
                "note": payment_note or "Paid at delivery",
                "created_at": now,
            }

    return delivery_docs, payment_doc, round(session_total, 2)


async def _save_delivery_session(
    db,
    payload: DeliverySessionCreate,
    rate_map: dict[tuple[str, str], float],
) -> dict:
    date_str = payload.date.isoformat()
    session = payload.session
    customer_id = payload.customer_id
    now = datetime.utcnow()

    delivery_docs, payment_doc, session_total = _build_session_records(
        date_str=date_str,
        customer_id=customer_id,
        session=session,
        entries=payload.entries,
        paid=payload.paid,
        paid_amount=payload.paid_amount,
        payment_note=payload.payment_note,
        rate_map=rate_map,
        now=now,
    )

    await db.deliveries.delete_many(
        {
            "customer_id": customer_id,
            "date": date_str,
            "session": session,
        }
    )
    await db.payments.delete_many(
        {
            "customer_id": customer_id,
            "date": date_str,
            "session": session,
            "payment_type": "immediate",
        }
    )

    if delivery_docs:
        await db.deliveries.insert_many(delivery_docs)

    paid_amount = 0.0
    if payment_doc:
        await db.payments.insert_one(payment_doc)
        paid_amount = payment_doc["amount"]

    return {
        "session_total": session_total,
        "paid_amount": round(paid_amount, 2),
        "lines_saved": len(delivery_docs),
    }


@router.get("/day", response_model=DeliveryDayResponse)
async def get_delivery_day(date_value: date = Query(..., alias="date")):
    db = get_db()
    date_str = date_value.isoformat()

    deliveries = await db.deliveries.find({"date": date_str}).to_list(10000)
    payments = await db.payments.find(
        {"date": date_str, "payment_type": "immediate"}
    ).to_list(5000)

    lines_by_key: dict[tuple[str, str], list[dict]] = {}
    for doc in deliveries:
        key = (doc["customer_id"], doc["session"])
        lines_by_key.setdefault(key, []).append(doc)

    payment_by_key = {
        (payment["customer_id"], payment.get("session")): payment
        for payment in payments
    }

    customer_ids = {customer_id for customer_id, _ in lines_by_key}
    customer_ids.update(customer_id for customer_id, _ in payment_by_key)

    customers: dict[str, DeliveryDayCustomerData] = {}
    for customer_id in customer_ids:
        morning_key = (customer_id, "morning")
        evening_key = (customer_id, "evening")
        morning_lines = lines_by_key.get(morning_key, [])
        evening_lines = lines_by_key.get(evening_key, [])
        morning_payment = payment_by_key.get(morning_key)
        evening_payment = payment_by_key.get(evening_key)

        customer_data = DeliveryDayCustomerData()
        if morning_lines or morning_payment:
            customer_data.morning = _session_data_from_docs(
                morning_lines, morning_payment
            )
        if evening_lines or evening_payment:
            customer_data.evening = _session_data_from_docs(
                evening_lines, evening_payment
            )
        customers[customer_id] = customer_data

    return DeliveryDayResponse(customers=customers)


@router.post("/day/bulk", response_model=DeliveryDayBulkSaveResponse, status_code=201)
async def save_delivery_day_bulk(payload: DeliveryDayBulkSave):
    db = get_db()
    if not payload.sessions:
        return DeliveryDayBulkSaveResponse(sessions_saved=0, total_amount=0)

    date_str = payload.date.isoformat()
    rate_map = await _get_rate_map(db)
    customer_ids = {session.customer_id for session in payload.sessions}

    customer_oids = []
    for customer_id in customer_ids:
        try:
            customer_oids.append(to_object_id(customer_id))
        except ValueError as exc:
            raise HTTPException(
                status_code=400, detail=f"Invalid customer id: {customer_id}"
            ) from exc

    active_customers = await db.customers.find(
        {"_id": {"$in": customer_oids}, "is_active": True},
        {"_id": 1},
    ).to_list(len(customer_oids))
    active_ids = {str(customer["_id"]) for customer in active_customers}

    missing_ids = customer_ids - active_ids
    if missing_ids:
        missing = sorted(missing_ids)[0]
        raise HTTPException(status_code=404, detail=f"Customer not found: {missing}")

    now = datetime.utcnow()
    all_delivery_docs: list[dict] = []
    all_payment_docs: list[dict] = []
    session_filters: list[dict] = []
    sessions_saved = 0
    total_amount = 0.0

    for item in payload.sessions:
        if item.customer_id not in active_ids:
            continue

        delivery_docs, payment_doc, session_total = _build_session_records(
            date_str=date_str,
            customer_id=item.customer_id,
            session=item.session,
            entries=item.entries,
            paid=item.paid,
            paid_amount=item.paid_amount,
            payment_note=item.payment_note,
            rate_map=rate_map,
            now=now,
        )

        session_filters.append(
            {"customer_id": item.customer_id, "session": item.session}
        )
        all_delivery_docs.extend(delivery_docs)
        if payment_doc:
            all_payment_docs.append(payment_doc)
        sessions_saved += 1
        total_amount += session_total

    if session_filters:
        await asyncio.gather(
            db.deliveries.delete_many({"date": date_str, "$or": session_filters}),
            db.payments.delete_many(
                {
                    "date": date_str,
                    "payment_type": "immediate",
                    "$or": session_filters,
                }
            ),
        )

        if all_delivery_docs:
            await db.deliveries.insert_many(all_delivery_docs)
        if all_payment_docs:
            await db.payments.insert_many(all_payment_docs)

    return DeliveryDayBulkSaveResponse(
        sessions_saved=sessions_saved,
        total_amount=round(total_amount, 2),
    )


@router.post("/session", status_code=201)
async def create_delivery_session(payload: DeliverySessionCreate):
    db = get_db()
    try:
        customer_oid = to_object_id(payload.customer_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid customer id") from exc

    customer = await db.customers.find_one({"_id": customer_oid, "is_active": True})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    rate_map = await _get_rate_map(db)
    result = await _save_delivery_session(db, payload, rate_map)
    return {"ok": True, **result}


@router.get("/grouped", response_model=list[DayGroupResponse])
async def get_grouped_deliveries(
    customer_id: str = Query(...),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
):
    db = get_db()
    start, end = _month_range(year, month)

    deliveries = await db.deliveries.find(
        {
            "customer_id": customer_id,
            "date": {
                "$gte": start.isoformat(),
                "$lte": end.isoformat(),
            },
        }
    ).sort([("date", 1), ("session", 1)]).to_list(5000)

    payments = await db.payments.find(
        {
            "customer_id": customer_id,
            "payment_type": "immediate",
            "date": {
                "$gte": start.isoformat(),
                "$lte": end.isoformat(),
            },
        }
    ).to_list(5000)

    payment_by_key = {
        (p["date"], p.get("session")): p["amount"] for p in payments
    }

    days_map: dict[str, dict] = {}

    for doc in deliveries:
        day_key = doc["date"]
        if day_key not in days_map:
            days_map[day_key] = {
                "date": date.fromisoformat(day_key),
                "lines": [],
                "sessions_map": {},
            }

        line = DeliveryLineResponse(
            id=str(doc["_id"]),
            customer_id=doc["customer_id"],
            date=date.fromisoformat(doc["date"]),
            session=doc["session"],
            source=doc["source"],
            milk_type=doc["milk_type"],
            liters=doc["liters"],
            rate=doc["rate"],
            amount=doc["amount"],
        )
        days_map[day_key]["lines"].append(line)

        sess_key = doc["session"]
        if sess_key not in days_map[day_key]["sessions_map"]:
            paid_amt = payment_by_key.get((day_key, sess_key), 0)
            days_map[day_key]["sessions_map"][sess_key] = {
                "session": sess_key,
                "total_liters": 0,
                "total_amount": 0,
                "paid": paid_amt > 0,
                "paid_amount": paid_amt,
                "lines": [],
            }

        sm = days_map[day_key]["sessions_map"][sess_key]
        sm["total_liters"] += doc["liters"]
        sm["total_amount"] += doc["amount"]
        sm["lines"].append(line)

    result = []
    for day_key in sorted(days_map.keys()):
        day = days_map[day_key]
        sessions = [
            SessionSummary(
                session=s["session"],
                total_liters=round(s["total_liters"], 2),
                total_amount=round(s["total_amount"], 2),
                paid=s["paid"],
                paid_amount=round(s["paid_amount"], 2),
                lines=s["lines"],
            )
            for s in day["sessions_map"].values()
        ]
        total_liters = sum(l.liters for l in day["lines"])
        total_amount = sum(l.amount for l in day["lines"])
        paid_amount = sum(s.paid_amount for s in sessions)

        result.append(
            DayGroupResponse(
                date=day["date"],
                total_liters=round(total_liters, 2),
                total_amount=round(total_amount, 2),
                paid_amount=round(paid_amount, 2),
                sessions=sessions,
                lines=day["lines"],
            )
        )

    return result


@router.get("/session")
async def get_session(
    customer_id: str = Query(...),
    date_value: date = Query(..., alias="date"),
    session: str = Query(...),
):
    db = get_db()
    date_str = date_value.isoformat()

    lines = await db.deliveries.find(
        {
            "customer_id": customer_id,
            "date": date_str,
            "session": session,
        }
    ).to_list(20)

    payment = await db.payments.find_one(
        {
            "customer_id": customer_id,
            "date": date_str,
            "session": session,
            "payment_type": "immediate",
        }
    )

    session_data = _session_data_from_docs(lines, payment)
    return session_data.model_dump()
