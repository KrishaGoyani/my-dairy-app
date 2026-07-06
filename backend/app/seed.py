DEFAULT_RATES = [
    {
        "source": "batli",
        "milk_type": "M",
        "rate": 35,
        "label": "Milk (Mahi)",
        "short_label": "માહી-બાટલી",
        "pack_size": "500ml",
    },
    {
        "source": "cow",
        "milk_type": "G",
        "rate": 30,
        "label": "Cow Milk",
        "short_label": "ગાય-બાટલી",
        "pack_size": "500ml",
    },
    {
        "source": "potla",
        "milk_type": "B",
        "rate": 48,
        "label": "Potla Buffalo",
        "short_label": "બફેલો-પોટલા",
        "pack_size": "6L",
    },
    {
        "source": "potla",
        "milk_type": "G",
        "rate": 42,
        "label": "Potla Gold",
        "short_label": "ગોલ્ડ-પોટલા",
        "pack_size": "6L",
    },
    {
        "source": "potla",
        "milk_type": "M",
        "rate": 42,
        "label": "Potla Mahi",
        "short_label": "માહી-પોટલા",
        "pack_size": "6L",
    },
]

DEFAULT_SHORT_LABELS = {
    ("batli", "M"): "માહી-બાટલી",
    ("cow", "G"): "ગાય-બાટલી",
    ("potla", "B"): "બફેલો-પોટલા",
    ("potla", "G"): "ગોલ્ડ-પોટલા",
    ("potla", "M"): "માહી-પોટલા",
}

DEFAULT_PACK_SIZES = {
    ("batli", "M"): "500ml",
    ("cow", "G"): "500ml",
    ("potla", "M"): "6L",
    ("potla", "G"): "6L",
    ("potla", "B"): "6L",
}


def default_short_label(source: str, milk_type: str) -> str:
    return DEFAULT_SHORT_LABELS.get((source, milk_type), "")


def default_pack_size(source: str, milk_type: str) -> str:
    return DEFAULT_PACK_SIZES.get((source, milk_type), "")


def fix_pouch_text(text: str) -> str:
    """Replace 'Pouch' with 'Potla' and P. prefix with Pot."""
    if not text:
        return text
    fixed = text.replace("Pouch", "Potla").replace("pouch", "Potla")
    if fixed.startswith("P."):
        fixed = "Pot." + fixed[2:]
    return fixed


async def normalize_rates(db) -> None:
    """Remove old fields, fix Pouch naming, ensure short_label and pack_size exist."""
    async for rate in db.rates.find():
        label = fix_pouch_text(rate.get("label") or rate.get("label_en", ""))
        short = fix_pouch_text(
            rate.get("short_label")
            or default_short_label(rate["source"], rate["milk_type"])
        )
        pack = (
            rate.get("pack_size")
            or default_pack_size(rate["source"], rate["milk_type"])
        )
        await db.rates.update_one(
            {"_id": rate["_id"]},
            {
                "$set": {"label": label, "short_label": short, "pack_size": pack},
                "$unset": {"label_guj": "", "label_en": ""},
            },
        )


async def seed_rates(db) -> None:
    await normalize_rates(db)
    count = await db.rates.count_documents({})
    if count == 0:
        await db.rates.insert_many(DEFAULT_RATES)
