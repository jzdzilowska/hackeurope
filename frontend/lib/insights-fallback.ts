/**
 * Wholesale fallback data for Wataru Endo Wholesale.
 * Mirrors real ai_insights rows generated on 21 Feb 2026.
 * Used when Supabase returns no data (offline / cold start).
 */

export const FALLBACK_HEALTH = {
  health_score: 75,
  net_worth: 508705.63,
  total_income: 260141.46,
  total_profit: 104418.23,
  total_expenditure: 155723.23,
  avg_monthly_burn: 203440.70,
  profit_margin_pct: 40.1,
  forecast_confidence: 'medium',
  predicted_burn_next_month: 190751.96,
  predicted_income_next_month: 240811.95,
  forecast_reasoning:
    'The OLS forecast for February reflects a typical post-holiday slowdown in income, while expenditure remains relatively stable, driven by increasing operational costs like transportation. This seasonal pattern is common for businesses transitioning from the busy Q4 period.',
  seasonal_risk:
    'Q1 2026 corporate tax payment: based on current profit trends (Jan €99k, Feb predicted €50k), an estimated tax payment for Q1 2026 (Jan–Mar) will likely be due in April — potentially €30k–€50k. Plan cash reserves now.',
  inventory_alert:
    'Consider stocking up on spring/summer merchandise in March–April to prepare for Q2 demand (Mother\'s Day, Father\'s Day, summer season). Current General Merchandise spend is significantly lower than Q4 2025, indicating potential destocking.',
  lazy_cash_alert: null,
  investment_opportunity:
    'Move €100,000 from \'Artisan Home – Business Checking\' to a high-yield savings account (4.5% APY) to generate ~€375/month in passive income — enough to cover all fixed software expenses.',
  score_breakdown: {
    cost_structure: {
      score: 22,
      reasoning:
        'Fixed costs are very low at 5.6% (€8,724), providing excellent operational flexibility. Variable costs at 50.9% (€79,317) indicate healthy scalability. Payroll at 40.2% (€62,627) is substantial but typical for a growth-stage wholesale operation.',
    },
    profit_quality: {
      score: 23,
      reasoning:
        'The profit margin of 40.1% (€104,418 on €260,141 income) is exceptionally strong. Gross margin consistency across months confirms pricing power with key wholesale accounts (Toll Brothers, Lennar Homes, KB Home).',
    },
    cash_efficiency: {
      score: 8,
      reasoning:
        '€344,912 in liquid assets but needs €934,339 for a 6-month buffer. €396,360 in outstanding invoices (€52,450 overdue) signals poor accounts receivable management — this is the single biggest drag on the overall score.',
    },
    expense_control: {
      score: 22,
      reasoning:
        'Strong cost discipline: fixed costs at just 5.6% (€8,724) and variable costs appropriately high at 50.9% (€79,317). No signs of undisciplined spending. Payroll fully justified by the 40.1% profit margin.',
    },
  },
  top_3_controllable_improvements: [
    'Immediately collect the €52,450 in overdue invoices to improve liquidity and resolve the negative stressed runway. (One-time impact: €52,450 cash injection)',
    'Implement stricter payment terms and follow-up to reduce €396,360 in outstanding invoices — improving working capital by €50k–€100k+.',
    'Transfer €100,000 from Business Checking to a high-yield savings account (4.5% APY) to generate ~€375/month in passive income.',
  ],
  payroll_assessment:
    'Payroll at 40.2% (€62,627) of total expenditure is proportionate and productive, directly contributing to the strong 40.1% profit margin.',
  variable_cost_assessment:
    'Variable costs at 50.9% (€79,317) are appropriately high for wholesale operations, reflecting healthy COGS scaling. Key suppliers: Pacific Hardwoods, Mahogany Import Co, Kravet Fabrics, XPO Logistics.',
  benchmark_comparison: {
    summary:
      'Wataru Endo Wholesale demonstrates exceptional unit economics with a 40.1% profit margin — well above the 15–25% wholesale benchmark. The primary weakness is accounts receivable: €52,450 overdue against €396,360 outstanding is a structural cash flow risk that depresses the score from potential 90+ to 75.',
    areas_above_benchmark: [
      'PROFIT MARGIN: 40.1% vs 15–25% benchmark for wholesale distributors — exceptional pricing power with tier-1 homebuilders',
      'COST STRUCTURE: Fixed costs at 5.6% of total spend — best-in-class for operations this size',
    ],
    areas_below_benchmark: [
      'CASH EFFICIENCY: Score 8/25 — €52,450 overdue invoices dragging effective liquidity well below the 6-month buffer benchmark',
      'ACCOUNTS RECEIVABLE: €396,360 outstanding represents 77% of net worth — high concentration risk',
    ],
  },
  cost_breakdown: {
    payroll: { pct: 40.2, amount: 62626.83 },
    variable: { pct: 50.9, amount: 79316.91 },
    fixed: { pct: 5.6, amount: 8724.49 },
    other: { pct: 3.2, amount: 5055.0 },
  },
  historical_months: [
    {
      month: '2025-11',
      income: 248000,
      profit: 62000,
      expenditure: 186000,
      category_spend: { PAYROLL: 75000, TRANSFER_OUT: 55000, TRANSPORTATION: 28000, GENERAL_MERCHANDISE: 18000 },
    },
    {
      month: '2025-12',
      income: 272000,
      profit: 79000,
      expenditure: 193000,
      category_spend: { PAYROLL: 78000, TRANSFER_OUT: 58000, TRANSPORTATION: 30000, GENERAL_MERCHANDISE: 17000 },
    },
    {
      month: '2026-01',
      income: 260141,
      profit: 104418,
      expenditure: 155723,
      category_spend: { PAYROLL: 62627, TRANSFER_OUT: 45000, TRANSPORTATION: 24000, GENERAL_MERCHANDISE: 14000 },
    },
  ],
  executive_briefing: {
    root_cause:
      'The single root cause is a critical cash flow deficit driven by poor accounts receivable management — specifically €52,450 in overdue invoices — exacerbated by €9,818/month in vendor cost creep. This combination erodes liquidity despite a strong 40.1% profit margin, creating a negative stressed runway of −0.3 months.',
    connected_narrative:
      'The Subscription Report reveals a negative stressed runway of −0.3 months, fuelled by €52,450 in overdue invoices and €9,818/month in cost creep. This cash crisis is reflected in the Financial Health Report\'s cash efficiency score of just 8/25 — despite a best-in-class 40.1% profit margin. The forecast shows avg monthly burn of €190,752, making the business highly vulnerable to the looming €30k–€50k Q1 tax payment in April.',
    single_most_impactful_action:
      'Immediately collect the €52,450 in overdue invoices. This single action directly resolves the cash shortfall, improves the cash efficiency score (currently 8/25), and stabilises the negative stressed runway — without cutting any costs or changing operations.',
    if_nothing_changes:
      'The negative stressed runway of −0.3 months will persist, meaning the company cannot meet obligations under any income shock. Within 90 days, the looming €30k–€50k Q1 tax payment in April will further compound this crisis — likely forcing emergency credit draws or delayed supplier payments to Pacific Hardwoods and XPO Logistics.',
  },
}

export const FALLBACK_SUBSCRIPTIONS = {
  summary:
    'Your company faces an immediate cash crisis with a negative stressed runway and over €52K in overdue invoices. Urgent action is required on cash flow, cost creep (€9.8K/month), and SaaS waste (€585/month) to ensure operational continuity.',
  priority_score: 20,
  total_estimated_monthly_savings: 678.25,
  total_estimated_annual_savings: 8139.0,
  insights: [
    {
      title: 'Critical Runway Shortfall',
      severity: 'critical',
      insight_type: 'runway_stress_test',
      priority_rank: 1,
      headline_metric: 'Negative stressed runway: −0.3 months',
      description:
        'Your cash balance of €508,705, stress-tested at −30% income and +10% expenses, yields a negative runway. The €52,450 in overdue invoices is the primary driver — collecting it this week resolves the crisis.',
      recommended_actions: [
        { action: 'Chase €52,450 in overdue invoices this week', effort: 'low', timeframe: 'Immediate', estimated_impact: '+€52,450 cash injection' },
        { action: 'Negotiate 60-day payment terms with top 3 suppliers', effort: 'medium', timeframe: '2–4 weeks', estimated_impact: '~€40k working capital freed' },
      ],
    },
    {
      title: 'Urgent Overdue Invoices',
      severity: 'critical',
      insight_type: 'invoice_aging',
      priority_rank: 2,
      headline_metric: '€52,450 overdue across 8 accounts',
      description:
        '8 overdue invoices totalling €52,450, oldest 20 days overdue. Additionally €291,910 is due within 30 days. Aggressive collection will directly resolve the runway shortfall.',
      recommended_actions: [
        { action: 'Send overdue notice to all 8 accounts today', effort: 'low', timeframe: 'Today', estimated_impact: 'Potential €52,450 within 7 days' },
        { action: 'Offer 2% early-payment discount to accounts >15 days overdue', effort: 'low', timeframe: '1 week', estimated_impact: 'Accelerate €291k pipeline' },
      ],
    },
    {
      title: 'Unused SaaS Seats',
      severity: 'critical',
      insight_type: 'saas_waste',
      priority_rank: 3,
      headline_metric: '€585.75/month wasted on unused seats',
      description:
        '25 implied SaaS seats across HubSpot, Slack, and Google Workspace — rightsizing to actual team size eliminates €7,029/year in pure waste.',
      recommended_actions: [
        { action: 'Audit active users in HubSpot, Slack, Google Workspace', effort: 'low', timeframe: '1–2 days', estimated_impact: '€585/month saved' },
        { action: 'Downgrade HubSpot to Starter tier if CRM features are underused', effort: 'low', timeframe: '1 week', estimated_impact: '€250–€350/month saved' },
      ],
    },
    {
      title: 'Vendor Price Creep',
      severity: 'warning',
      insight_type: 'price_creep',
      priority_rank: 4,
      headline_metric: '€9,818/month in uncontrolled cost increases',
      description:
        'Expenses with 12 vendors increased significantly over 3 months. Pacific Hardwoods and Mahogany Import Co are the largest contributors. Annual contracts would lock in current pricing.',
      recommended_actions: [
        { action: 'Request annual pricing lock from top 5 suppliers showing >10% increase', effort: 'medium', timeframe: '2–4 weeks', estimated_impact: 'Up to €6k/month stabilised' },
        { action: 'Run competitive RFQ on Pacific Hardwoods volume', effort: 'medium', timeframe: '4–6 weeks', estimated_impact: '5–15% cost reduction' },
      ],
    },
    {
      title: 'Redundant Creative Tools',
      severity: 'warning',
      insight_type: 'duplicate_tools',
      priority_rank: 5,
      headline_metric: '€92.50/month on duplicate design software',
      description:
        'Adobe and Canva serve overlapping functions. Consolidating to Canva Pro (€13/user vs €55/user for Adobe) saves €92.50/month with no capability loss for typical wholesale marketing needs.',
      recommended_actions: [
        { action: 'Survey team on primary tool — Adobe vs Canva', effort: 'low', timeframe: '1 week', estimated_impact: 'Clear consolidation path' },
        { action: 'Cancel Adobe if <20% of features used regularly', effort: 'low', timeframe: '2 weeks', estimated_impact: '€92.50/month saved' },
      ],
    },
  ],
  raw: {
    runway_stress_test: {
      current_balance: 508705.63,
      avg_monthly_burn: 255348.44,
      stressed_runway_months: -0.3,
    },
  },
}
