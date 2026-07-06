from fastapi import APIRouter, HTTPException, Query

from app.database import get_db
from app.models.schemas import BillSummary, PaymentResponse
from app.routes.customers import _customer_balance, _format_customer
from app.routes.deliveries import get_grouped_deliveries
from app.source_breakdown import sum_source_from_deliveries
from app.utils import to_object_id

router = APIRouter(prefix="/bills", tags=["bills"])


@router.get("", response_model=BillSummary)
async def get_bill(
    customer_id: str = Query(...),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
):
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
    customer_response = _format_customer(customer, balance_info)

    days = await get_grouped_deliveries(customer_id=customer_id, year=year, month=month)

    month_key = f"{year:04d}-{month:02d}"
    month_deliveries = await db.deliveries.find(
        {
            "customer_id": customer_id,
            "date": {"$regex": f"^{month_key}"},
        }
    ).to_list(5000)

    total_liters = sum(d["liters"] for d in month_deliveries)
    total_amount = sum(d["amount"] for d in month_deliveries)

    source_totals = sum_source_from_deliveries(month_deliveries)

    payments = await db.payments.find(
        {
            "customer_id": customer_id,
            "$or": [
                {"for_month": month_key},
                {
                    "date": {"$regex": f"^{month_key}"},
                },
            ],
        }
    ).sort("date", 1).to_list(500)

    from datetime import date as date_cls

    payment_responses = [
        PaymentResponse(
            id=str(p["_id"]),
            customer_id=p["customer_id"],
            date=date_cls.fromisoformat(p["date"]),
            amount=p["amount"],
            payment_type=p["payment_type"],
            for_month=p.get("for_month"),
            session=p.get("session"),
            note=p.get("note", ""),
        )
        for p in payments
    ]

    paid_at_delivery = sum(
        p["amount"] for p in payments if p["payment_type"] == "immediate"
    )
    later_payments = sum(
        p["amount"] for p in payments if p["payment_type"] == "monthly"
    )
    total_paid = paid_at_delivery + later_payments

    month_names = [
        "",
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ]

    return BillSummary(
        customer=customer_response,
        month=month_names[month],
        year=year,
        days=days,
        total_liters=round(total_liters, 2),
        total_amount=round(total_amount, 2),
        **source_totals,
        paid_at_delivery=round(paid_at_delivery, 2),
        later_payments=round(later_payments, 2),
        total_paid=round(total_paid, 2),
        opening_balance=customer.get("opening_balance", 0),
        current_balance=customer_response.balance,
        payments=payment_responses,
    )
