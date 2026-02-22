'use client'

import {
  createContext, useContext, useState, useEffect, useRef, useCallback,
  type ReactNode,
} from 'react'
import type {
  Account, KPIs, MonthlyBurn, InsightCard, PaymentApproval,
  Transaction, RecurringPayment, Organisation, ChatMessage,
} from './types'
import {
  mockAccounts, mockKPIs, mockBurnData, mockCategories,
  mockInsights, mockApprovals, mockTransactions, mockRecurring,
  mockOrg, mockChatHistory,
} from './mock-data'

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
  // Live update fields
  newInvoiceAlert: PaymentApproval | null
  clearInvoiceAlert: () => void
  lastSynced: Date | null
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
  newInvoiceAlert: null,
  clearInvoiceAlert: () => {},
  lastSynced: null,
}

const DashboardContext = createContext<DashboardData>(defaults)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData>(defaults)
  const [invoiceAlert, setInvoiceAlert] = useState<PaymentApproval | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const seenApprovalIds = useRef<Set<string> | null>(null)

  // Initial full fetch on mount
  useEffect(() => {
    const storedName = localStorage.getItem('helm_org_name')
    const storedBiz  = localStorage.getItem('helm_biz_type')
    if (storedName || storedBiz) {
      const bizMap: Record<string, Organisation['businessType']> = {
        saas: 'software', physical: 'physical_goods', services: 'software', individual: 'software',
      }
      setData(prev => ({
        ...prev,
        org: {
          ...prev.org,
          ...(storedName && { name: storedName }),
          ...(storedBiz && { businessType: bizMap[storedBiz] ?? prev.org.businessType }),
        },
      }))
    }
  }, [])

  useEffect(() => {
    async function fetchAll() {
      try {
        const [overview, burn, cats, insights, invoices, txns] = await Promise.all([
          fetch(`/api/dashboard/overview?user_id=${USER_ID}`).then(r => r.json()),
          fetch(`/api/dashboard/burn-chart?user_id=${USER_ID}`).then(r => r.json()),
          fetch(`/api/dashboard/categories?user_id=${USER_ID}`).then(r => r.json()),
          fetch(`/api/dashboard/insights?user_id=${USER_ID}`).then(r => r.json()),
          fetch(`/api/dashboard/invoices?user_id=${USER_ID}&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
          fetch(`/api/dashboard/transactions?user_id=${USER_ID}&limit=50`).then(r => r.json()),
        ])

        const approvals: PaymentApproval[] = invoices.approvals ?? []
        seenApprovalIds.current = new Set(approvals.map(a => a.id))

        setData(prev => ({
          ...prev,
          accounts: overview.accounts ?? prev.accounts,
          kpis: overview.kpis ?? prev.kpis,
          burnData: burn.data ?? prev.burnData,
          categories: cats.categories ?? prev.categories,
          insights: insights.insights ?? prev.insights,
          approvals,
          transactions: txns.transactions ?? prev.transactions,
          loading: false,
        }))
        setLastSynced(new Date())
      } catch (err) {
        console.error('Dashboard fetch failed, using mock data:', err)
        setData(prev => ({ ...prev, loading: false }))
      }
    }

    fetchAll()
  }, [])

  // Poll invoices every 5 seconds — triggers toast when a new one arrives
  useEffect(() => {
    const poll = async () => {
      try {
        const json = await fetch(`/api/dashboard/invoices?user_id=${USER_ID}&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json())
        const approvals: PaymentApproval[] = json.approvals ?? []

        // Alert for any invoice ID we haven't seen before (baseline set on initial load)
        if (seenApprovalIds.current !== null) {
          const newOnes = approvals.filter(a => !seenApprovalIds.current!.has(a.id))
          if (newOnes.length > 0) {
            setInvoiceAlert(newOnes[0])
          }
        }

        seenApprovalIds.current = new Set(approvals.map(a => a.id))
        setLastSynced(new Date())
        setData(prev => ({ ...prev, approvals }))
      } catch {
        // Silent — keep showing existing data
      }
    }

    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [])

  const clearInvoiceAlert = useCallback(() => setInvoiceAlert(null), [])

  return (
    <DashboardContext.Provider value={{
      ...data,
      newInvoiceAlert: invoiceAlert,
      clearInvoiceAlert,
      lastSynced,
    }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  return useContext(DashboardContext)
}
