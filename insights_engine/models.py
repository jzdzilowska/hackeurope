from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime


# ── Per-insight raw data shapes ────────────────────────────────────────────────

class SeatWasteItem(BaseModel):
    merchant: str
    amount: float
    seat_price: float
    implied_seats: float
    team_size: int
    wasted_seats: float
    estimated_monthly_waste: float


class PriceCreepItem(BaseModel):
    merchant: str
    latest_amount: float
    three_month_avg: float
    pct_increase: float
    latest_date: str
    extra_cost_per_month: float
    projected_annual_extra: float


class AdEfficiencyResult(BaseModel):
    this_month_ad_spend: float
    last_month_ad_spend: float
    this_month_income: float
    last_month_income: float
    ad_spend_pct_change: Optional[float] = None
    income_pct_change: Optional[float] = None
    flagged: bool
    estimated_wasted_spend: Optional[float] = None


class DuplicateServiceItem(BaseModel):
    service_category: str
    competing_merchants: list[str]
    overlap_description: str
    estimated_redundancy: str
    recommendation: str


class IndividualPlanItem(BaseModel):
    merchant: str
    amount_per_person: float
    transaction_count: int
    current_monthly_spend: float
    is_individual_plan: bool
    confidence: str
    enterprise_plan_name: Optional[str] = None
    enterprise_plan_price: Optional[float] = None
    estimated_monthly_savings: Optional[float] = None
    recommendation: str


class FreeTrialTrapItem(BaseModel):
    merchant: str
    trial_date: str
    charge_date: str
    charge_amount: float
    days_until_charge: int


class RunwayStressResult(BaseModel):
    current_balance: Optional[float]           # TODO: populate once accounts table confirmed
    top_3_income_sources: list[dict[str, Any]]
    top_3_income_total: float
    avg_monthly_burn: float
    stressed_balance: Optional[float]
    stressed_runway_months: Optional[float]


# ── AI-enriched output shapes ──────────────────────────────────────────────────

class RecommendedAction(BaseModel):
    action: str
    estimated_impact: str
    effort: str                    # "low" | "medium" | "high"
    timeframe: str


class PrioritisedInsight(BaseModel):
    insight_type: str
    title: str
    severity: str                  # "critical" | "warning" | "info"
    priority_rank: int
    headline_metric: str
    description: str
    recommended_actions: list[RecommendedAction]
    supporting_data: dict[str, Any] = Field(default_factory=dict)


class InsightsResponse(BaseModel):
    user_id: str
    generated_at: datetime
    date_range_months: int
    priority_score: int            # 1–100, overall financial health
    summary: str
    total_estimated_monthly_savings: float
    total_estimated_annual_savings: float
    insights: list[PrioritisedInsight]


# ── Predictive & General Health module ────────────────────────────────────────

class PurchaseAdvisorRequest(BaseModel):
    item_description: str
    price: float
    currency: str = "USD"


class PurchaseAdvisorResponse(BaseModel):
    user_id: str
    evaluated_at: datetime
    item_description: str
    price: float
    currency: str
    # Traffic light
    risk_level: str                             # "green" | "yellow" | "red"
    runway_after_purchase_months: Optional[float]
    verdict: str
    reasoning: str
    alternatives: list[str]
    best_time_to_buy: str
    investment_opportunity: Optional[str]
    # Context snapshot
    current_balance: float
    current_runway_months: Optional[float]
    avg_monthly_burn: float


class ScoreDimension(BaseModel):
    score: int
    reasoning: str


class FinancialHealthReport(BaseModel):
    user_id: str
    generated_at: datetime
    cached: bool = False
    business_context: dict[str, Any] = Field(default_factory=dict)
    # ── Scores ──────────────────────────────────────────────────────────────
    health_score: int              # Controllable elements score (1–100)
    score_breakdown: dict[str, Any] = Field(default_factory=dict)
    # ── P&L ─────────────────────────────────────────────────────────────────
    net_worth: float
    total_expenditure: float
    total_income: float
    total_profit: float
    profit_margin_pct: float
    account_breakdown: list[dict[str, Any]] = Field(default_factory=list)
    # ── Cost structure ───────────────────────────────────────────────────────
    cost_breakdown: dict[str, Any] = Field(default_factory=dict)
    variable_cost_assessment: str
    payroll_assessment: str
    # ── Forecast ─────────────────────────────────────────────────────────────
    avg_monthly_burn: float
    statistical_burn_forecast: float
    statistical_income_forecast: float
    predicted_burn_next_month: float
    predicted_income_next_month: float
    forecast_confidence: str
    forecast_reasoning: str
    historical_months: list[dict[str, Any]] = Field(default_factory=list)
    # ── Benchmark ────────────────────────────────────────────────────────────
    benchmark_comparison: dict[str, Any] = Field(default_factory=dict)
    # ── Alerts ───────────────────────────────────────────────────────────────
    inventory_alert: Optional[str] = None
    seasonal_risk: Optional[str] = None
    lazy_cash_estimate: float
    lazy_cash_alert: Optional[str] = None
    investment_opportunity: Optional[str] = None
    # ── Improvements ─────────────────────────────────────────────────────────
    top_3_controllable_improvements: list[str] = Field(default_factory=list)
