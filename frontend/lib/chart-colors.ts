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
  balance: '#3535ED',
  balanceGradOpacity: [0.35, 0.04],
  inflow: '#00B848',
  outflow: '#E0103A',
  inflowsBar: '#1248E8',
  overheadBar: '#1870C0',
  restockBar: '#CC7800',
  surplusLine: '#00B848',
  floorLine: '#00B848',
  salesBar: '#3535ED',
  restockLine: '#CC7800',
  confidenceHigh: '#00B848',
  confidenceMedium: '#CC7800',
  confidenceLow: '#1E5CAE',
  revenue: '#00C896',
  burn: '#FF3A58',
  tick: '#5a5a64',
  referenceLine: 'rgba(0,0,0,0.08)',
  cursor: 'rgba(0,0,0,0.06)',
}

const DARK: DashboardChartColors = {
  balance: '#6B6BFF',
  balanceGradOpacity: [0.28, 0.03],
  inflow: '#00E05A',
  outflow: '#FF2D55',
  inflowsBar: '#3A6EFF',
  overheadBar: '#2090E0',
  restockBar: '#FF9A00',
  surplusLine: '#00E05A',
  floorLine: '#00E05A',
  salesBar: '#6B6BFF',
  restockLine: '#FF9A00',
  confidenceHigh: '#00E05A',
  confidenceMedium: '#FF9A00',
  confidenceLow: '#3A7ECC',
  revenue: '#00DDAA',
  burn: '#FF4466',
  tick: '#605c56',
  referenceLine: 'rgba(255,255,255,0.08)',
  cursor: 'rgba(255,255,255,0.05)',
}

export function getChartColors(theme?: ChartTheme): DashboardChartColors {
  return theme === 'light' ? LIGHT : DARK
}
