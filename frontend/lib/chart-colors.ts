/**
 * Chart palettes. Same colors in light and dark mode (dark palette used for both).
 */
export type ChartTheme = 'light' | 'dark'

export interface DashboardChartColors {
  // CashflowChart
  balance: string
  balanceGradOpacity: [number, number]
  inflow: string
  outflow: string
  // SurplusChart
  inflowsBar: string
  overheadBar: string
  restockBar: string
  surplusLine: string
  floorLine: string
  // RestockForecast
  salesBar: string
  restockLine: string
  confidenceHigh: string
  confidenceMedium: string
  confidenceLow: string
  // BurnRateChart
  revenue: string
  burn: string
  // Axis/tick (for Recharts tick fill)
  tick: string
  referenceLine: string
  cursor: string
}

const LIGHT: DashboardChartColors = {
  balance: '#5050e8',
  balanceGradOpacity: [0.35, 0.04],
  inflow: '#0e9e4a',
  outflow: '#d62850',
  inflowsBar: '#1a5fd4',
  overheadBar: '#3d7aa8',
  restockBar: '#c76b0a',
  surplusLine: '#0e9e4a',
  floorLine: '#0e9e4a',
  salesBar: '#5050e8',
  restockLine: '#c76b0a',
  confidenceHigh: '#0e9e4a',
  confidenceMedium: '#c76b0a',
  confidenceLow: '#4a6a9a',
  revenue: '#2d9d6a',
  burn: '#e05a5a',
  tick: '#5a5a64',
  referenceLine: 'rgba(0,0,0,0.08)',
  cursor: 'rgba(0,0,0,0.06)',
}

const DARK: DashboardChartColors = {
  balance: '#6b6bb8',
  balanceGradOpacity: [0.22, 0.03],
  inflow: '#4a9a72',
  outflow: '#a86a78',
  inflowsBar: '#5a7ab0',
  overheadBar: '#5a7088',
  restockBar: '#8a7a5a',
  surplusLine: '#4a9a72',
  floorLine: '#4a9a72',
  salesBar: '#6b6bb8',
  restockLine: '#8a7a5a',
  confidenceHigh: '#4a9a72',
  confidenceMedium: '#8a7a5a',
  confidenceLow: '#6a7a92',
  revenue: '#7a9a8a',
  burn: '#a88a8a',
  tick: '#605c56',
  referenceLine: 'rgba(255,255,255,0.08)',
  cursor: 'rgba(255,255,255,0.05)',
}

export function getChartColors(_theme?: ChartTheme): DashboardChartColors {
  return DARK
}
