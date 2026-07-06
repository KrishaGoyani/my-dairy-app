"""Shared source breakdown fields — matches delivery grid (Batli / Cow / Potla)."""

PRODUCT_KEYS = [
    ("batli", "M"),
    ("cow", "G"),
    ("potla", "B"),
    ("potla", "G"),
    ("potla", "M"),
]


def product_field_prefix(source: str, milk_type: str) -> str:
    if source == "batli":
        return "batli"
    if source == "cow":
        return "cow"
    return f"potla_{milk_type.lower()}"


def _source_match(source: str, milk_type: str) -> dict:
    if source in ("batli", "cow"):
        return {"$eq": ["$source", source]}
    return {
        "$and": [
            {"$eq": ["$source", source]},
            {"$eq": ["$milk_type", milk_type]},
        ]
    }


def _session_source_agg(source: str, milk_type: str, session: str, metric: str) -> dict:
    field = "$liters" if metric == "liters" else "$amount"
    prefix = product_field_prefix(source, milk_type)
    return {
        f"{prefix}_{session}_{metric}": {
            "$sum": {
                "$cond": [
                    {
                        "$and": [
                            _source_match(source, milk_type),
                            {"$eq": ["$session", session]},
                        ]
                    },
                    field,
                    0,
                ]
            }
        }
    }


SESSION_SOURCE_AGGREGATION_FIELDS = {}
for _source, _milk_type in PRODUCT_KEYS:
    for _session in ("morning", "evening"):
        for _metric in ("liters", "amount"):
            SESSION_SOURCE_AGGREGATION_FIELDS.update(
                _session_source_agg(_source, _milk_type, _session, _metric)
            )


SOURCE_AGGREGATION_FIELDS = {
    "batli_liters": {
        "$sum": {"$cond": [{"$eq": ["$source", "batli"]}, "$liters", 0]}
    },
    "batli_amount": {
        "$sum": {"$cond": [{"$eq": ["$source", "batli"]}, "$amount", 0]}
    },
    "cow_liters": {
        "$sum": {"$cond": [{"$eq": ["$source", "cow"]}, "$liters", 0]}
    },
    "cow_amount": {
        "$sum": {"$cond": [{"$eq": ["$source", "cow"]}, "$amount", 0]}
    },
    "potla_m_liters": {
        "$sum": {
            "$cond": [
                {
                    "$and": [
                        {"$eq": ["$source", "potla"]},
                        {"$eq": ["$milk_type", "M"]},
                    ]
                },
                "$liters",
                0,
            ]
        }
    },
    "potla_m_amount": {
        "$sum": {
            "$cond": [
                {
                    "$and": [
                        {"$eq": ["$source", "potla"]},
                        {"$eq": ["$milk_type", "M"]},
                    ]
                },
                "$amount",
                0,
            ]
        }
    },
    "potla_g_liters": {
        "$sum": {
            "$cond": [
                {
                    "$and": [
                        {"$eq": ["$source", "potla"]},
                        {"$eq": ["$milk_type", "G"]},
                    ]
                },
                "$liters",
                0,
            ]
        }
    },
    "potla_g_amount": {
        "$sum": {
            "$cond": [
                {
                    "$and": [
                        {"$eq": ["$source", "potla"]},
                        {"$eq": ["$milk_type", "G"]},
                    ]
                },
                "$amount",
                0,
            ]
        }
    },
    "potla_b_liters": {
        "$sum": {
            "$cond": [
                {
                    "$and": [
                        {"$eq": ["$source", "potla"]},
                        {"$eq": ["$milk_type", "B"]},
                    ]
                },
                "$liters",
                0,
            ]
        }
    },
    "potla_b_amount": {
        "$sum": {
            "$cond": [
                {
                    "$and": [
                        {"$eq": ["$source", "potla"]},
                        {"$eq": ["$milk_type", "B"]},
                    ]
                },
                "$amount",
                0,
            ]
        }
    },
}


def round_source_fields(data: dict) -> dict:
    return {key: round(data.get(key, 0), 2) for key in SOURCE_AGGREGATION_FIELDS}


def round_session_source_fields(data: dict) -> dict:
    return {
        key: round(data.get(key, 0), 2) for key in SESSION_SOURCE_AGGREGATION_FIELDS
    }


def sum_source_fields(rows: list[dict]) -> dict:
    totals = {key: 0.0 for key in SOURCE_AGGREGATION_FIELDS}
    for row in rows:
        for key in SOURCE_AGGREGATION_FIELDS:
            totals[key] += row.get(key, 0)
    return round_source_fields(totals)


def sum_source_from_deliveries(deliveries: list[dict]) -> dict:
    totals = {key: 0.0 for key in SOURCE_AGGREGATION_FIELDS}
    for doc in deliveries:
        source = doc.get("source")
        milk_type = doc.get("milk_type")
        liters = doc.get("liters", 0)
        amount = doc.get("amount", 0)

        if source == "batli":
            totals["batli_liters"] += liters
            totals["batli_amount"] += amount
        elif source == "cow":
            totals["cow_liters"] += liters
            totals["cow_amount"] += amount
        elif source == "potla":
            if milk_type == "M":
                totals["potla_m_liters"] += liters
                totals["potla_m_amount"] += amount
            elif milk_type == "G":
                totals["potla_g_liters"] += liters
                totals["potla_g_amount"] += amount
            elif milk_type == "B":
                totals["potla_b_liters"] += liters
                totals["potla_b_amount"] += amount

    return round_source_fields(totals)
