from datetime import date

from fastapi import APIRouter, Query

from app.database import get_db
from app.models.schemas import DashboardStats, GroupByType
from app.periods import months_in_range, normalize_date_range
from app.source_breakdown import sum_source_from_deliveries

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


async def _fetch_dashboard_stats(
    db,
    group_by: GroupByType,
    date_from: date,
    date_to: date,
    period_label: str,
) -> DashboardStats:
    from_str = date_from.isoformat()
    to_str = date_to.isoformat()

    deliveries = await db.deliveries.find(
        {"date": {"$gte": from_str, "$lte": to_str}}
    ).to_list(10000)

    source = sum_source_from_deliveries(deliveries)
    total_liters = round(sum(d.get("liters", 0) for d in deliveries), 2)
    total_amount = round(sum(d.get("amount", 0) for d in deliveries), 2)

    morning_liters = round(
        sum(d.get("liters", 0) for d in deliveries if d.get("session") == "morning"),
        2,
    )
    morning_amount = round(
        sum(d.get("amount", 0) for d in deliveries if d.get("session") == "morning"),
        2,
    )
    evening_liters = round(
        sum(d.get("liters", 0) for d in deliveries if d.get("session") == "evening"),
        2,
    )
    evening_amount = round(
        sum(d.get("amount", 0) for d in deliveries if d.get("session") == "evening"),
        2,
    )

    delivery_days = len({d.get("date") for d in deliveries if d.get("date")})
    customer_count = len({d.get("customer_id") for d in deliveries if d.get("customer_id")})

    single_day = date_from == date_to
    if group_by == "day" and single_day:
        payments = await db.payments.find(
            {"date": from_str, "payment_type": "immediate"}
        ).to_list(5000)
        total_paid = round(sum(p.get("amount", 0) for p in payments), 2)
    else:
        month_keys = months_in_range(date_from, date_to)
        pipeline = [
            {
                "$match": {
                    "$or": [
                        {"date": {"$gte": from_str, "$lte": to_str}},
                        {"for_month": {"$in": month_keys}},
                    ]
                }
            },
            {"$group": {"_id": None, "total_paid": {"$sum": "$amount"}}},
        ]
        rows = await db.payments.aggregate(pipeline).to_list(1)
        total_paid = round(rows[0]["total_paid"], 2) if rows else 0.0

    total_due = round(max(total_amount - total_paid, 0), 2)

    return DashboardStats(
        group_by=group_by,
        date_from=date_from,
        date_to=date_to,
        period_label=period_label,
        total_liters=total_liters,
        total_amount=total_amount,
        total_paid=total_paid,
        total_due=total_due,
        delivery_count=len(deliveries),
        delivery_days=delivery_days,
        customer_count=customer_count,
        morning_liters=morning_liters,
        morning_amount=morning_amount,
        evening_liters=evening_liters,
        evening_amount=evening_amount,
        **source,
    )


@router.get("", response_model=DashboardStats)
async def get_dashboard_stats(
    group_by: GroupByType = Query(default="day"),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    date_value: date | None = Query(default=None, alias="date"),
):
    db = get_db()
    if date_from is None and date_to is None and date_value is not None:
        date_from = date_to = date_value
    date_from, date_to, period_label = normalize_date_range(date_from, date_to)
    return await _fetch_dashboard_stats(db, group_by, date_from, date_to, period_label)


@router.get("/today", response_model=DashboardStats)
async def get_today_stats(
    date_value: date | None = Query(default=None, alias="date"),
):
    db = get_db()
    ref = date_value or date.today()
    return await _fetch_dashboard_stats(db, "day", ref, ref, ref.strftime("%d %b %Y"))
