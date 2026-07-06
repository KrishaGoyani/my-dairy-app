from datetime import date, timedelta

from app.models.schemas import GroupByType


def months_in_range(date_from: date, date_to: date) -> list[str]:
    months: list[str] = []
    y, m = date_from.year, date_from.month
    while (y, m) <= (date_to.year, date_to.month):
        months.append(f"{y:04d}-{m:02d}")
        if m == 12:
            y, m = y + 1, 1
        else:
            m += 1
    return months


def default_month_range(ref: date | None = None) -> tuple[date, date]:
    ref = ref or date.today()
    start = ref.replace(day=1)
    if ref.month == 12:
        end = date(ref.year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(ref.year, ref.month + 1, 1) - timedelta(days=1)
    return start, end


def format_period_label(date_from: date, date_to: date) -> str:
    if date_from == date_to:
        return date_from.strftime("%d/%m/%Y")
    return f"{date_from.strftime('%d/%m/%Y')} – {date_to.strftime('%d/%m/%Y')}"


def normalize_date_range(
    date_from: date | None,
    date_to: date | None,
    ref: date | None = None,
) -> tuple[date, date, str]:
    if date_from is None and date_to is None:
        date_from, date_to = default_month_range(ref)
    elif date_from is None:
        date_from = date_to
    elif date_to is None:
        date_to = date_from
    if date_from > date_to:
        date_from, date_to = date_to, date_from
    return date_from, date_to, format_period_label(date_from, date_to)


def resolve_period(ref: date, group_by: GroupByType) -> tuple[date, date, str]:
    if group_by == "day":
        return ref, ref, ref.strftime("%d %b %Y")

    if group_by == "week":
        start = ref - timedelta(days=ref.weekday())
        end = start + timedelta(days=6)
        return start, end, f"{start.strftime('%d %b')} – {end.strftime('%d %b %Y')}"

    if group_by == "month":
        return default_month_range(ref) + (ref.strftime("%B %Y"),)

    start = date(ref.year, 1, 1)
    end = date(ref.year, 12, 31)
    return start, end, str(ref.year)
