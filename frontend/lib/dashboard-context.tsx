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
  fireToast: (inv: PaymentApproval) => void
  refresh: () => void
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
  fireToast: () => {},
  refresh: () => {},
  lastSynced: null,
}

const DashboardContext = createContext<DashboardData>(defaults)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData>(defaults)
  const [invoiceAlert, setInvoiceAlert] = useState<PaymentApproval | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  // IDs of invoices that existed when the page first loaded — never toast these
  const knownIds = useRef<Set<string>>(new Set())

  const fetchAll = useCallback(async () => {
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
      approvals.forEach(a => knownIds.current.add(a.id))

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
  }, [])

  // Poll invoices: check for new unseen IDs and fire toast
  const pollInvoices = useCallback(async () => {
    try {
      const json = await fetch(`/api/dashboard/invoices?user_id=${USER_ID}&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json())
      const approvals: PaymentApproval[] = json.approvals ?? []
      const freshOnes = approvals.filter(a => !knownIds.current.has(a.id))
      if (freshOnes.length > 0) {
        setInvoiceAlert(freshOnes[0])
        freshOnes.forEach(a => knownIds.current.add(a.id))
      }
      setLastSynced(new Date())
      setData(prev => ({ ...prev, approvals }))
    } catch (err) {
      console.error('[invoice poll error]', err)
    }
  }, [])

  // Refresh: show toast for the most recent invoice already in the DB
  const refresh = useCallback(async () => {
    try {
      const json = await fetch(`/api/dashboard/invoices?user_id=${USER_ID}&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json())
      const approvals: PaymentApproval[] = json.approvals ?? []
      if (approvals.length > 0) {
        // Sort by createdAt descending, pick the newest
        const sorted = [...approvals].sort((a, b) => {
          return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        })
        setInvoiceAlert(sorted[0])
      }
      setLastSynced(new Date())
      setData(prev => ({ ...prev, approvals }))
    } catch (err) {
      console.error('[refresh error]', err)
    }
  }, [])

  // Initial full fetch on mount — then start the invoice poller
  useEffect(() => {
    const storedName = localStorage.getItem('runwave_org_name')
    const storedBiz  = localStorage.getItem('runwave_biz_type')
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

    fetchAll()

    const pollTimer = setInterval(pollInvoices, 5000)
    return () => clearInterval(pollTimer)
  }, [fetchAll, pollInvoices])

  const clearInvoiceAlert = useCallback(() => setInvoiceAlert(null), [])
  const fireToast = useCallback((inv: PaymentApproval) => setInvoiceAlert(inv), [])

  return (
    <DashboardContext.Provider value={{
      ...data,
      newInvoiceAlert: invoiceAlert,
      clearInvoiceAlert,
      fireToast,
      refresh,
      lastSynced,
    }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  return useContext(DashboardContext)
}
