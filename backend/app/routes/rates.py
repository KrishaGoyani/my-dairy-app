from fastapi import APIRouter, HTTPException

from app.database import get_db
from app.models.schemas import RateBulkUpdate, RateResponse, RateUpdate
from app.seed import default_pack_size, default_short_label
from app.utils import to_object_id

router = APIRouter(prefix="/rates", tags=["rates"])

SOURCE_ORDER = {"batli": 0, "cow": 1, "potla": 2}
TYPE_ORDER = {"B": 0, "G": 1, "M": 2}


def _format_rate(rate: dict) -> RateResponse:
    return RateResponse(
        id=str(rate["_id"]),
        source=rate["source"],
        milk_type=rate["milk_type"],
        rate=rate["rate"],
        label=rate.get("label") or rate.get("label_en", ""),
        short_label=rate.get("short_label")
        or default_short_label(rate["source"], rate["milk_type"]),
        pack_size=rate.get("pack_size")
        or default_pack_size(rate["source"], rate["milk_type"]),
    )


def _sort_rates(rates: list[dict]) -> list[dict]:
    return sorted(
        rates,
        key=lambda r: (
            SOURCE_ORDER.get(r["source"], 99),
            TYPE_ORDER.get(r["milk_type"], 99),
        ),
    )


@router.get("", response_model=list[RateResponse])
async def list_rates():
    db = get_db()
    rates = await db.rates.find().to_list(20)
    return [_format_rate(r) for r in _sort_rates(rates)]


@router.patch("/{rate_id}", response_model=RateResponse)
async def update_rate(rate_id: str, payload: RateUpdate):
    db = get_db()
    try:
        oid = to_object_id(rate_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid rate id") from exc

    updates = {"rate": payload.rate}
    if payload.label is not None:
        updates["label"] = payload.label.strip()
    if payload.short_label is not None:
        updates["short_label"] = payload.short_label.strip()
    if payload.pack_size is not None:
        updates["pack_size"] = payload.pack_size.strip()

    result = await db.rates.find_one_and_update(
        {"_id": oid},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Rate not found")
    return _format_rate(result)


@router.put("/bulk", response_model=list[RateResponse])
async def update_rates_bulk(payload: RateBulkUpdate):
    db = get_db()
    if not payload.rates:
        raise HTTPException(status_code=400, detail="No rates provided")

    for item in payload.rates:
        try:
            oid = to_object_id(item.id)
        except ValueError as exc:
            raise HTTPException(
                status_code=400, detail=f"Invalid rate id: {item.id}"
            ) from exc

        updates = {"rate": item.rate}
        if item.label is not None:
            updates["label"] = item.label.strip()
        if item.short_label is not None:
            updates["short_label"] = item.short_label.strip()
        if item.pack_size is not None:
            updates["pack_size"] = item.pack_size.strip()

        result = await db.rates.update_one({"_id": oid}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail=f"Rate not found: {item.id}")

    rates = await db.rates.find().to_list(20)
    return [_format_rate(r) for r in _sort_rates(rates)]
