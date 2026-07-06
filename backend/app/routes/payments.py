from datetime import date, datetime

from fastapi import APIRouter, HTTPException, Query

from app.database import get_db
from app.models.schemas import PaymentCreate, PaymentResponse
from app.routes.customers import _customer_balance
from app.utils import to_object_id

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("", response_model=PaymentResponse, status_code=201)
async def create_payment(payload: PaymentCreate):
    db = get_db()
    try:
        customer_oid = to_object_id(payload.customer_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid customer id") from exc

    customer = await db.customers.find_one({"_id": customer_oid, "is_active": True})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    doc = {
        "customer_id": payload.customer_id,
        "date": payload.date.isoformat(),
        "amount": payload.amount,
        "payment_type": payload.payment_type,
        "for_month": payload.for_month,
        "session": payload.session,
        "note": payload.note,
        "created_at": datetime.utcnow(),
    }
    inserted = await db.payments.insert_one(doc)

    return PaymentResponse(
        id=str(inserted.inserted_id),
        customer_id=doc["customer_id"],
        date=payload.date,
        amount=doc["amount"],
        payment_type=doc["payment_type"],
        for_month=doc.get("for_month"),
        session=doc.get("session"),
        note=doc.get("note", ""),
    )


@router.get("", response_model=list[PaymentResponse])
async def list_payments(
    customer_id: str = Query(...),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
):
    db = get_db()
    month_key = f"{year:04d}-{month:02d}"

    payments = await db.payments.find(
        {
            "customer_id": customer_id,
            "$or": [
                {"for_month": month_key},
                {
                    "date": {"$regex": f"^{month_key}"},
                    "payment_type": "immediate",
                },
            ],
        }
    ).sort("date", 1).to_list(500)

    return [
        PaymentResponse(
            id=str(p["_id"]),
            customer_id=p["customer_id"],
            date=date.fromisoformat(p["date"]),
            amount=p["amount"],
            payment_type=p["payment_type"],
            for_month=p.get("for_month"),
            session=p.get("session"),
            note=p.get("note", ""),
        )
        for p in payments
    ]
