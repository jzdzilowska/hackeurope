'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type {
  Account, KPIs, MonthlyBurn, InsightCard, PaymentApproval,
  Transaction, RecurringPayment, Organisation, ChatMessage,
} from './types'
import {
  mockAccounts, mockKPIs, mockBurnData, mockCategories,
  mockInsights, mockApprovals, mockTransactions, mockRecurring,
  mockOrg, mockChatHistory,
} from './mock-data'

// Hardcoded test user until auth is implemented
const USER_ID = 'c5cbf7bd-2801-407e-9efe-222d8e93fddc'

export interface CategorySpend {
  name: string
  amount: number
  pct: number
  color: string
}

interface DashboardData {
  org: Organisation
  accounts: Account[]
  kpis: KPIs
  burnData: MonthlyBurn[]
  categories: CategorySpend[]
  insights: InsightCard[]
  approvals: PaymentApproval[]
  transactions: Transaction[]
  recurring: RecurringPayment[]
  chatHistory: ChatMessage[]
  loading: boolean
}

const defaults: DashboardData = {
  org: mockOrg,
  accounts: mockAccounts,
  kpis: mockKPIs,
  burnData: mockBurnData,
  categories: mockCategories,
  insights: mockInsights,
  approvals: mockApprovals,
  transactions: mockTransactions,
  recurring: mockRecurring,
  chatHistory: mockChatHistory,
  loading: true,
}

const DashboardContext = createContext<DashboardData>(defaults)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData>(defaults)

  useEffect(() => {
    async function fetchAll() {
      try {
        const [overview, burn, cats, insights, invoices, txns] = await Promise.all([
          fetch(`/api/dashboard/overview?user_id=${USER_ID}`).then(r => r.json()),
          fetch(`/api/dashboard/burn-chart?user_id=${USER_ID}`).then(r => r.json()),
          fetch(`/api/dashboard/categories?user_id=${USER_ID}`).then(r => r.json()),
          fetch(`/api/dashboard/insights?user_id=${USER_ID}`).then(r => r.json()),
          fetch(`/api/dashboard/invoices?user_id=${USER_ID}`).then(r => r.json()),
          fetch(`/api/dashboard/transactions?user_id=${USER_ID}&limit=50`).then(r => r.json()),
        ])

        setData(prev => ({
          ...prev,
          accounts: overview.accounts ?? prev.accounts,
          kpis: overview.kpis ?? prev.kpis,
          burnData: burn.data ?? prev.burnData,
          categories: cats.categories ?? prev.categories,
          insights: insights.insights ?? prev.insights,
          approvals: invoices.approvals ?? prev.approvals,
          transactions: txns.transactions ?? prev.transactions,
          loading: false,
        }))
      } catch (err) {
        console.error('Dashboard fetch failed, using mock data:', err)
        setData(prev => ({ ...prev, loading: false }))
      }
    }

    fetchAll()
  }, [])

  return (
    <DashboardContext.Provider value={data}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  return useContext(DashboardContext)
}
