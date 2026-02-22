export type RunwaveCategory =
  | 'Infrastructure'
  | 'Software & Services'
  | 'Payroll'
  | 'Office & Rent'
  | 'Marketing'
  | 'Travel'
  | 'Variable Costs'
  | 'Revenue'
  | 'Other';

const PAYROLL_VENDORS = [
  'gusto', 'adp', 'paychex', 'payroll', 'rippling', 'justworks',
];

const SAAS_VENDORS = [
  'aws', 'amazon web services', 'slack', 'adobe', 'hubspot',
  'salesforce', 'zoom', 'dropbox', 'github', 'atlassian',
  'microsoft', 'google workspace', 'cloudflare', 'stripe',
  'sendgrid', 'mailchimp', 'notion', 'figma', 'vercel',
  'heroku', 'datadog', 'linear', 'intercom', 'twilio',
];

const MARKETING_VENDORS = [
  'google ads', 'facebook ads', 'meta ads', 'linkedin ads',
  'twitter ads', 'tiktok ads', 'mailchimp', 'sendgrid',
];

function merchantMatches(merchantName: string | null, vendors: string[]): boolean {
  if (!merchantName) return false;
  const lower = merchantName.toLowerCase();
  return vendors.some((v) => lower.includes(v));
}

export function mapPlaidToRunwaveCategory(
  categoryPrimary: string | null,
  merchantName: string | null,
): RunwaveCategory {
  // Payroll detection first — overrides any Plaid category
  if (merchantMatches(merchantName, PAYROLL_VENDORS)) return 'Payroll';

  // Marketing detection
  if (merchantMatches(merchantName, MARKETING_VENDORS)) return 'Marketing';

  if (!categoryPrimary) return 'Other';

  switch (categoryPrimary) {
    case 'INCOME':
    case 'TRANSFER_IN':
      return 'Revenue';

    case 'RENT_AND_UTILITIES':
      return 'Office & Rent';

    case 'TRAVEL':
    case 'TRANSPORTATION':
      return 'Travel';

    case 'LOAN_PAYMENTS':
    case 'BANK_FEES':
      return 'Infrastructure';

    case 'FOOD_AND_DRINK':
    case 'GENERAL_MERCHANDISE':
    case 'ENTERTAINMENT':
    case 'PERSONAL_CARE':
    case 'HOME_IMPROVEMENT':
    case 'MEDICAL':
      return 'Variable Costs';

    case 'GENERAL_SERVICES':
      return merchantMatches(merchantName, SAAS_VENDORS) ? 'Software & Services' : 'Other';

    case 'GOVERNMENT_AND_NON_PROFIT':
    case 'TRANSFER_OUT':
    default:
      return 'Other';
  }
}

export const RUNWAVE_CATEGORY_COLORS: Record<RunwaveCategory, string> = {
  'Infrastructure': '#3b82f6',
  'Software & Services': '#8b5cf6',
  'Payroll': '#ec4899',
  'Office & Rent': '#f59e0b',
  'Marketing': '#10b981',
  'Travel': '#06b6d4',
  'Variable Costs': '#6366f1',
  'Revenue': '#22c55e',
  'Other': '#64748b',
};

// Institution colors for account display
const INSTITUTION_COLORS: Record<string, string> = {
  'Chase': '#0076BE',
  'Bank of America': '#E11B22',
  'Wells Fargo': '#D71E28',
  'Citi': '#003366',
  'Capital One': '#004879',
  'US Bank': '#0033A0',
  'PNC Bank': '#F58025',
  'TD Bank': '#00AC3E',
  'First Platypus Bank': '#1a5cff',
  'First Gingham Credit Union': '#6B8E23',
  'Tartan Bank': '#8B0000',
  'Tattersall Federal Credit Union': '#2F4F4F',
};

export function getInstitutionColor(institutionName: string | null): string {
  if (institutionName && INSTITUTION_COLORS[institutionName]) {
    return INSTITUTION_COLORS[institutionName];
  }
  // Deterministic color from string hash
  const str = institutionName || 'unknown';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 50%)`;
}

export function mapAccountType(type: string, subtype: string | null): 'checking' | 'savings' | 'credit' {
  if (type === 'credit') return 'credit';
  if (subtype === 'savings') return 'savings';
  return 'checking';
}
