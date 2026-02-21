// ─── Organisation ────────────────────────────────────────────────────────────
export interface Organisation {
  id: string
  name: string
  logoUrl?: string
  employeeCount: number
  stripeCustomerId: string
  businessType: 'software' | 'physical_goods'
  createdAt: string
}

// ─── Accounts ────────────────────────────────────────────────────────────────
export type AccountType = 'checking' | 'savings' | 'credit'

export interface Account {
  id: string
  plaidItemId: string
  name: string
  officialName: string
  institution: string
  institutionColor: string
  type: AccountType
  currency: string
  currentBalance: number
  availableBalance: number
  lastSynced: string
}

// ─── Transactions ────────────────────────────────────────────────────────────
export type HelmCategory =
  | 'Infrastructure'
  | 'SaaS & Tools'
  | 'Payroll'
  | 'Office & Rent'
  | 'Marketing'
  | 'Travel'
  | 'Variable Costs'
  | 'Revenue'
  | 'Other'

export interface Transaction {
  id: string
  accountId: string
  amount: number           // negative = debit, positive = credit
  currency: string
  date: string             // ISO date
  merchantName: string
  merchantLogoUrl?: string
  helmCategory: HelmCategory
  pending: boolean
  recurringId?: string
  autoPayId?: string
}

// ─── Recurring Payments ──────────────────────────────────────────────────────
export type RecurringFrequency = 'monthly' | 'annual' | 'quarterly' | 'irregular'
export type RecurringStatus    = 'active' | 'under_review' | 'cancelled' | 'pending_approval'

export interface RecurringPayment {
  id: string
  merchantName: string
  merchantLogoUrl?: string
  averageAmount: number
  currency: string
  frequency: RecurringFrequency
  lastPaymentDate: string
  nextExpectedDate: string
  totalYtd: number
  helmCategory: HelmCategory
  status: RecurringStatus
  autoPayEnabled: boolean
  usageFlag?: 'active' | 'low' | 'unused'
}

// ─── Insight Cards ───────────────────────────────────────────────────────────
export type InsightType = 'anomaly' | 'saving' | 'runway' | 'subscription' | 'margin'

export interface InsightCard {
  id: string
  type: InsightType
  headline: string
  body: string
  actionLabel?: string
  dismissed: boolean
  generatedAt: string
  urgency: 'low' | 'medium' | 'high'
}

// ─── Approval Queue ──────────────────────────────────────────────────────────
export type ApprovalStatus = 'pending' | 'approved' | 'skipped' | 'completed'

export interface PaymentApproval {
  id: string
  recurringId: string
  merchantName: string
  merchantLogoUrl?: string
  helmCategory: HelmCategory
  expectedAmount: number
  expectedAmountMax: number
  expectedDate: string
  lastPaidAmount: number
  lastPaidDate: string
  status: ApprovalStatus
  stripePaymentId?: string
  approvedAt?: string
}

// ─── Burn Rate / KPIs ────────────────────────────────────────────────────────
export interface MonthlyBurn {
  month: string            // "Jan", "Feb", etc.
  burn: number
  revenue: number
  net: number
}

export interface KPIs {
  totalCashPosition: number
  runway: number           // months
  monthlyBurn: number
  burnTrend: number        // % vs last month (positive = increasing burn)
  dueSoon: number          // total due in next 14 days
  dueSoonCount: number
  financialHealthScore: number
}

// ─── AI Chat ─────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}
