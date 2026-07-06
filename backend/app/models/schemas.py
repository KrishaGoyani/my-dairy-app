from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

GroupByType = Literal["day", "week", "month", "year"]
CustomerSortType = Literal["entry", "name", "name_desc"]

SessionType = Literal["morning", "evening"]
SourceType = Literal["batli", "cow", "potla"]
MilkType = Literal["M", "G", "B"]
PaymentType = Literal["immediate", "monthly"]


class CustomerCreate(BaseModel):
    name: str
    phone: str = ""
    address: str = ""
    opening_balance: float = 0


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    opening_balance: Optional[float] = None
    is_active: Optional[bool] = None


class CustomerResponse(BaseModel):
    id: str
    name: str
    phone: str
    address: str
    opening_balance: float
    is_active: bool
    created_at: Optional[datetime] = None
    balance: float = 0
    total_deliveries: float = 0
    total_payments: float = 0


class RateResponse(BaseModel):
    id: str
    source: SourceType
    milk_type: MilkType
    rate: float
    label: str
    short_label: str = ""
    pack_size: str = ""


class RateUpdate(BaseModel):
    rate: float = Field(gt=0)
    label: Optional[str] = None
    short_label: Optional[str] = None
    pack_size: Optional[str] = None


class RateBulkItem(BaseModel):
    id: str
    rate: float = Field(gt=0)
    label: Optional[str] = None
    short_label: Optional[str] = None
    pack_size: Optional[str] = None


class RateBulkUpdate(BaseModel):
    rates: list[RateBulkItem]


class DeliveryEntryInput(BaseModel):
    source: SourceType
    milk_type: MilkType
    liters: float = Field(ge=0)


class DeliverySessionCreate(BaseModel):
    customer_id: str
    date: date
    session: SessionType
    entries: list[DeliveryEntryInput]
    paid: bool = False
    paid_amount: Optional[float] = Field(default=None, ge=0)
    payment_note: str = ""


class DeliverySessionData(BaseModel):
    entries: list[DeliveryEntryInput]
    paid: bool = False
    paid_amount: float = 0
    session_total: float = 0


class DeliveryDayCustomerData(BaseModel):
    morning: Optional[DeliverySessionData] = None
    evening: Optional[DeliverySessionData] = None


class DeliveryDayResponse(BaseModel):
    customers: dict[str, DeliveryDayCustomerData]


class DeliveryDayBulkItem(BaseModel):
    customer_id: str
    session: SessionType
    entries: list[DeliveryEntryInput]
    paid: bool = False
    paid_amount: Optional[float] = Field(default=None, ge=0)
    payment_note: str = ""


class DeliveryDayBulkSave(BaseModel):
    date: date
    sessions: list[DeliveryDayBulkItem]


class DeliveryDayBulkSaveResponse(BaseModel):
    ok: bool = True
    sessions_saved: int
    total_amount: float


class DeliveryLineResponse(BaseModel):
    id: str
    customer_id: str
    date: date
    session: SessionType
    source: SourceType
    milk_type: MilkType
    liters: float
    rate: float
    amount: float


class PaymentCreate(BaseModel):
    customer_id: str
    date: date
    amount: float = Field(gt=0)
    payment_type: PaymentType = "monthly"
    for_month: Optional[str] = None
    session: Optional[SessionType] = None
    note: str = ""


class PaymentResponse(BaseModel):
    id: str
    customer_id: str
    date: date
    amount: float
    payment_type: PaymentType
    for_month: Optional[str] = None
    session: Optional[SessionType] = None
    note: str


class SessionSummary(BaseModel):
    session: SessionType
    total_liters: float
    total_amount: float
    paid: bool
    paid_amount: float
    lines: list[DeliveryLineResponse]


class DayGroupResponse(BaseModel):
    date: date
    total_liters: float
    total_amount: float
    paid_amount: float
    sessions: list[SessionSummary]
    lines: list[DeliveryLineResponse]


class SourceBreakdownFields(BaseModel):
    batli_liters: float = 0
    batli_amount: float = 0
    cow_liters: float = 0
    cow_amount: float = 0
    potla_m_liters: float = 0
    potla_m_amount: float = 0
    potla_g_liters: float = 0
    potla_g_amount: float = 0
    potla_b_liters: float = 0
    potla_b_amount: float = 0


class DashboardStats(SourceBreakdownFields):
    group_by: GroupByType
    date_from: date
    date_to: date
    period_label: str
    total_liters: float
    total_amount: float
    total_paid: float
    total_due: float
    delivery_count: int
    delivery_days: int = 0
    customer_count: int = 0
    morning_liters: float = 0
    morning_amount: float = 0
    evening_liters: float = 0
    evening_amount: float = 0


class SessionProductBreakdownFields(BaseModel):
    batli_morning_liters: float = 0
    batli_morning_amount: float = 0
    batli_evening_liters: float = 0
    batli_evening_amount: float = 0
    cow_morning_liters: float = 0
    cow_morning_amount: float = 0
    cow_evening_liters: float = 0
    cow_evening_amount: float = 0
    potla_m_morning_liters: float = 0
    potla_m_morning_amount: float = 0
    potla_m_evening_liters: float = 0
    potla_m_evening_amount: float = 0
    potla_g_morning_liters: float = 0
    potla_g_morning_amount: float = 0
    potla_g_evening_liters: float = 0
    potla_g_evening_amount: float = 0
    potla_b_morning_liters: float = 0
    potla_b_morning_amount: float = 0
    potla_b_evening_liters: float = 0
    potla_b_evening_amount: float = 0


class BillSummary(SourceBreakdownFields):
    customer: CustomerResponse
    month: str
    year: int
    days: list[DayGroupResponse]
    total_liters: float
    total_amount: float
    paid_at_delivery: float
    later_payments: float
    total_paid: float
    opening_balance: float
    current_balance: float
    payments: list[PaymentResponse]


class ReportSummary(BaseModel):
    total_liters: float
    total_amount: float
    total_paid: float
    total_due: float
    customer_count: int
    batli_liters: float = 0
    batli_amount: float = 0
    cow_liters: float = 0
    cow_amount: float = 0
    potla_m_liters: float = 0
    potla_m_amount: float = 0
    potla_g_liters: float = 0
    potla_g_amount: float = 0
    potla_b_liters: float = 0
    potla_b_amount: float = 0


class DailyCustomerReportRow(SourceBreakdownFields, SessionProductBreakdownFields):
    customer_id: str
    name: str
    phone: str
    date: date
    total_liters: float
    morning_liters: float
    morning_amount: float
    evening_liters: float
    evening_amount: float
    total_amount: float
    paid_amount: float
    due_amount: float


class CustomerReportRow(SourceBreakdownFields, SessionProductBreakdownFields):
    customer_id: str
    name: str
    phone: str
    group_by: GroupByType
    date_from: date
    date_to: date
    period_label: str
    delivery_days: int = 0
    total_liters: float = 0
    morning_liters: float = 0
    morning_amount: float = 0
    evening_liters: float = 0
    evening_amount: float = 0
    total_amount: float = 0
    paid_amount: float = 0
    paid_at_delivery: float = 0
    later_payments: float = 0
    due_amount: float = 0


class PaginatedReport(BaseModel):
    items: list[CustomerReportRow]
    page: int
    page_size: int
    total: int
    total_pages: int
    summary: ReportSummary
    group_by: GroupByType
    date_from: date
    date_to: date
    period_label: str


class MonthlyCustomerReportRow(SourceBreakdownFields):
    customer_id: str
    name: str
    phone: str
    year: int
    month: int
    delivery_days: int
    total_liters: float
    total_amount: float
    paid_at_delivery: float
    later_payments: float
    total_paid: float
    due_amount: float


class PaginatedDailyReport(BaseModel):
    items: list[DailyCustomerReportRow]
    page: int
    page_size: int
    total: int
    total_pages: int
    summary: ReportSummary


class PaginatedMonthlyReport(BaseModel):
    items: list[MonthlyCustomerReportRow]
    page: int
    page_size: int
    total: int
    total_pages: int
    summary: ReportSummary
