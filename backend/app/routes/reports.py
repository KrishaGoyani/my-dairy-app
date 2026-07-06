import math
import re
from datetime import date, timedelta

from fastapi import APIRouter, Query

from app.database import get_db
from app.models.schemas import (
    CustomerReportRow,
    DailyCustomerReportRow,
    GroupByType,
    MonthlyCustomerReportRow,
    PaginatedDailyReport,
    PaginatedMonthlyReport,
    PaginatedReport,
    ReportSummary,
)
from app.source_breakdown import (
    SESSION_SOURCE_AGGREGATION_FIELDS,
    SOURCE_AGGREGATION_FIELDS,
    round_session_source_fields,
    round_source_fields,
    sum_source_fields,
)

from app.periods import default_month_range, months_in_range, normalize_date_range

router = APIRouter(prefix="/reports", tags=["reports"])


def _build_search_query(search: str) -> dict:
    if not search or not search.strip():
        return {"is_active": True}
    pattern = re.escape(search.strip())
    return {
        "is_active": True,
        "$or": [
            {"name": {"$regex": pattern, "$options": "i"}},
            {"phone": {"$regex": pattern, "$options": "i"}},
        ],
    }


async def _aggregate_by_customer(
    db,
    customer_ids: list[str],
    date_from: date,
    date_to: date,
    group_by: GroupByType,
) -> dict:
    if not customer_ids:
        return {}

    from_str = date_from.isoformat()
    to_str = date_to.isoformat()

    group_fields: dict = {
        "_id": "$customer_id",
        "total_liters": {"$sum": "$liters"},
        "total_amount": {"$sum": "$amount"},
        **SOURCE_AGGREGATION_FIELDS,
    }

    if group_by == "day":
        group_fields.update(SESSION_SOURCE_AGGREGATION_FIELDS)
        group_fields.update(
            {
                "morning_liters": {
                    "$sum": {
                        "$cond": [{"$eq": ["$session", "morning"]}, "$liters", 0]
                    }
                },
                "morning_amount": {
                    "$sum": {
                        "$cond": [{"$eq": ["$session", "morning"]}, "$amount", 0]
                    }
                },
                "evening_liters": {
                    "$sum": {
                        "$cond": [{"$eq": ["$session", "evening"]}, "$liters", 0]
                    }
                },
                "evening_amount": {
                    "$sum": {
                        "$cond": [{"$eq": ["$session", "evening"]}, "$amount", 0]
                    }
                },
            }
        )

    group_fields["delivery_days"] = {"$addToSet": "$date"}

    pipeline = [
        {
            "$match": {
                "date": {"$gte": from_str, "$lte": to_str},
                "customer_id": {"$in": customer_ids},
            }
        },
        {"$group": group_fields},
    ]
    rows = await db.deliveries.aggregate(pipeline).to_list(len(customer_ids))
    result = {}
    for row in rows:
        if isinstance(row.get("delivery_days"), list):
            row["delivery_days"] = len(row["delivery_days"])
        result[row["_id"]] = row
    return result


async def _aggregate_payments(
    db,
    customer_ids: list[str],
    date_from: date,
    date_to: date,
    group_by: GroupByType,
) -> dict:
    if not customer_ids:
        return {}

    from_str = date_from.isoformat()
    to_str = date_to.isoformat()
    single_day = date_from == date_to

    if group_by == "day" and single_day:
        pipeline = [
            {
                "$match": {
                    "date": from_str,
                    "customer_id": {"$in": customer_ids},
                }
            },
            {"$group": {"_id": "$customer_id", "paid_amount": {"$sum": "$amount"}}},
        ]
        rows = await db.payments.aggregate(pipeline).to_list(len(customer_ids))
        return {row["_id"]: {"paid_amount": row["paid_amount"]} for row in rows}

    month_keys = months_in_range(date_from, date_to)
    pipeline = [
        {
            "$match": {
                "customer_id": {"$in": customer_ids},
                "$or": [
                    {"date": {"$gte": from_str, "$lte": to_str}},
                    {"for_month": {"$in": month_keys}},
                ],
            }
        },
        {
            "$group": {
                "_id": "$customer_id",
                "total_paid": {"$sum": "$amount"},
                "paid_at_delivery": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$payment_type", "immediate"]},
                            "$amount",
                            0,
                        ]
                    }
                },
                "later_payments": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$payment_type", "monthly"]},
                            "$amount",
                            0,
                        ]
                    }
                },
            }
        },
    ]
    rows = await db.payments.aggregate(pipeline).to_list(len(customer_ids))
    return {row["_id"]: row for row in rows}


def _build_summary(
    all_delivery: dict,
    all_ids: list[str],
    all_payment: dict,
    customer_count: int,
    group_by: GroupByType,
    date_from: date,
    date_to: date,
) -> ReportSummary:
    delivery_rows = [all_delivery.get(cid, {}) for cid in all_ids]
    source_totals = sum_source_fields(delivery_rows)

    full_liters = sum(r.get("total_liters", 0) for r in delivery_rows)
    full_amount = sum(r.get("total_amount", 0) for r in delivery_rows)

    if group_by == "day" and date_from == date_to:
        full_paid = sum(all_payment.get(cid, {}).get("paid_amount", 0) for cid in all_ids)
    elif group_by == "day":
        full_paid = sum(all_payment.get(cid, {}).get("total_paid", 0) for cid in all_ids)
    else:
        full_paid = sum(
            all_payment.get(cid, {}).get("total_paid", 0) for cid in all_ids
        )

    return ReportSummary(
        total_liters=round(full_liters, 2),
        total_amount=round(full_amount, 2),
        total_paid=round(full_paid, 2),
        total_due=round(max(full_amount - full_paid, 0), 2),
        customer_count=customer_count,
        **source_totals,
    )


def _row_from_customer(
    customer: dict,
    d: dict,
    p: dict,
    group_by: GroupByType,
    date_from: date,
    date_to: date,
    period_label: str,
) -> CustomerReportRow:
    cid = str(customer["_id"])
    source = round_source_fields(d)
    session_source = round_session_source_fields(d) if group_by == "day" else {}

    total_liters = round(d.get("total_liters", 0), 2)
    total_amount = round(d.get("total_amount", 0), 2)

    if group_by == "day":
        if date_from == date_to:
            paid = round(p.get("paid_amount", 0), 2)
        else:
            paid = round(p.get("total_paid", 0), 2)
        return CustomerReportRow(
            customer_id=cid,
            name=customer["name"],
            phone=customer.get("phone", ""),
            group_by=group_by,
            date_from=date_from,
            date_to=date_to,
            period_label=period_label,
            delivery_days=d.get("delivery_days", 0),
            total_liters=total_liters,
            morning_liters=round(d.get("morning_liters", 0), 2),
            morning_amount=round(d.get("morning_amount", 0), 2),
            evening_liters=round(d.get("evening_liters", 0), 2),
            evening_amount=round(d.get("evening_amount", 0), 2),
            total_amount=total_amount,
            paid_amount=paid,
            due_amount=round(max(total_amount - paid, 0), 2),
            **source,
            **session_source,
        )

    paid_at_delivery = round(p.get("paid_at_delivery", 0), 2)
    later_payments = round(p.get("later_payments", 0), 2)
    total_paid = round(p.get("total_paid", 0), 2)

    return CustomerReportRow(
        customer_id=cid,
        name=customer["name"],
        phone=customer.get("phone", ""),
        group_by=group_by,
        date_from=date_from,
        date_to=date_to,
        period_label=period_label,
        delivery_days=d.get("delivery_days", 0),
        total_liters=total_liters,
        total_amount=total_amount,
        paid_amount=total_paid,
        paid_at_delivery=paid_at_delivery,
        later_payments=later_payments,
        due_amount=round(max(total_amount - total_paid, 0), 2),
        **source,
    )


async def _build_report(
    db,
    group_by: GroupByType,
    date_from: date,
    date_to: date,
    period_label: str,
    search: str,
    page: int,
    page_size: int,
) -> PaginatedReport:
    query = _build_search_query(search)

    total = await db.customers.count_documents(query)
    total_pages = max(1, math.ceil(total / page_size)) if total else 1
    skip = (page - 1) * page_size

    customers = (
        await db.customers.find(query)
        .sort("name", 1)
        .skip(skip)
        .limit(page_size)
        .to_list(page_size)
    )

    customer_ids = [str(c["_id"]) for c in customers]
    delivery_map = await _aggregate_by_customer(
        db, customer_ids, date_from, date_to, group_by
    )
    payment_map = await _aggregate_payments(
        db, customer_ids, date_from, date_to, group_by
    )

    items = [
        _row_from_customer(
            customer,
            delivery_map.get(str(customer["_id"]), {}),
            payment_map.get(str(customer["_id"]), {}),
            group_by,
            date_from,
            date_to,
            period_label,
        )
        for customer in customers
    ]

    all_ids = [
        str(c["_id"]) for c in await db.customers.find(query, {"_id": 1}).to_list(5000)
    ]
    all_delivery = await _aggregate_by_customer(
        db, all_ids, date_from, date_to, group_by
    )
    all_payment = await _aggregate_payments(
        db, all_ids, date_from, date_to, group_by
    )

    return PaginatedReport(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
        summary=_build_summary(
            all_delivery, all_ids, all_payment, total, group_by, date_from, date_to
        ),
        group_by=group_by,
        date_from=date_from,
        date_to=date_to,
        period_label=period_label,
    )


@router.get("", response_model=PaginatedReport)
async def get_report(
    group_by: GroupByType = Query(default="day"),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    date_value: date | None = Query(default=None, alias="date"),
    search: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
):
    db = get_db()
    if date_from is None and date_to is None and date_value is not None:
        date_from = date_to = date_value
    date_from, date_to, period_label = normalize_date_range(date_from, date_to)
    return await _build_report(
        db, group_by, date_from, date_to, period_label, search, page, page_size
    )


@router.get("/daily", response_model=PaginatedDailyReport)
async def get_daily_report(
    date_value: date = Query(..., alias="date"),
    search: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
):
    db = get_db()
    report = await _build_report(
        db,
        "day",
        date_value,
        date_value,
        date_value.strftime("%d %b %Y"),
        search,
        page,
        page_size,
    )
    items = [
        DailyCustomerReportRow(
            customer_id=r.customer_id,
            name=r.name,
            phone=r.phone,
            date=date_value,
            total_liters=r.total_liters,
            morning_liters=r.morning_liters,
            morning_amount=r.morning_amount,
            evening_liters=r.evening_liters,
            evening_amount=r.evening_amount,
            total_amount=r.total_amount,
            paid_amount=r.paid_amount,
            due_amount=r.due_amount,
            batli_liters=r.batli_liters,
            batli_amount=r.batli_amount,
            cow_liters=r.cow_liters,
            cow_amount=r.cow_amount,
            potla_m_liters=r.potla_m_liters,
            potla_m_amount=r.potla_m_amount,
            potla_g_liters=r.potla_g_liters,
            potla_g_amount=r.potla_g_amount,
            potla_b_liters=r.potla_b_liters,
            potla_b_amount=r.potla_b_amount,
            batli_morning_liters=r.batli_morning_liters,
            batli_morning_amount=r.batli_morning_amount,
            batli_evening_liters=r.batli_evening_liters,
            batli_evening_amount=r.batli_evening_amount,
            cow_morning_liters=r.cow_morning_liters,
            cow_morning_amount=r.cow_morning_amount,
            cow_evening_liters=r.cow_evening_liters,
            cow_evening_amount=r.cow_evening_amount,
            potla_m_morning_liters=r.potla_m_morning_liters,
            potla_m_morning_amount=r.potla_m_morning_amount,
            potla_m_evening_liters=r.potla_m_evening_liters,
            potla_m_evening_amount=r.potla_m_evening_amount,
            potla_g_morning_liters=r.potla_g_morning_liters,
            potla_g_morning_amount=r.potla_g_morning_amount,
            potla_g_evening_liters=r.potla_g_evening_liters,
            potla_g_evening_amount=r.potla_g_evening_amount,
            potla_b_morning_liters=r.potla_b_morning_liters,
            potla_b_morning_amount=r.potla_b_morning_amount,
            potla_b_evening_liters=r.potla_b_evening_liters,
            potla_b_evening_amount=r.potla_b_evening_amount,
        )
        for r in report.items
    ]
    return PaginatedDailyReport(
        items=items,
        page=report.page,
        page_size=report.page_size,
        total=report.total,
        total_pages=report.total_pages,
        summary=report.summary,
    )


@router.get("/monthly", response_model=PaginatedMonthlyReport)
async def get_monthly_report(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    search: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
):
    db = get_db()
    ref = date(year, month, 1)
    date_from, date_to = default_month_range(ref)
    period_label = ref.strftime("%B %Y")
    report = await _build_report(
        db, "month", date_from, date_to, period_label, search, page, page_size
    )
    items = [
        MonthlyCustomerReportRow(
            customer_id=r.customer_id,
            name=r.name,
            phone=r.phone,
            year=year,
            month=month,
            delivery_days=r.delivery_days,
            total_liters=r.total_liters,
            total_amount=r.total_amount,
            paid_at_delivery=r.paid_at_delivery,
            later_payments=r.later_payments,
            total_paid=r.paid_amount,
            due_amount=r.due_amount,
            batli_liters=r.batli_liters,
            batli_amount=r.batli_amount,
            cow_liters=r.cow_liters,
            cow_amount=r.cow_amount,
            potla_m_liters=r.potla_m_liters,
            potla_m_amount=r.potla_m_amount,
            potla_g_liters=r.potla_g_liters,
            potla_g_amount=r.potla_g_amount,
            potla_b_liters=r.potla_b_liters,
            potla_b_amount=r.potla_b_amount,
        )
        for r in report.items
    ]
    return PaginatedMonthlyReport(
        items=items,
        page=report.page,
        page_size=report.page_size,
        total=report.total,
        total_pages=report.total_pages,
        summary=report.summary,
    )
