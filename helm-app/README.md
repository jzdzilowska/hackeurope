# HELM — UI Architecture Reference

## Quick Start
```bash
npm install
npm run dev
# Open http://localhost:3000
# → auto-redirects to /dashboard
# Onboarding: http://localhost:3000/onboarding
```

---

## File Map
```
app/
  layout.tsx              Root layout, dark mode
  page.tsx                Redirects → /dashboard
  dashboard/page.tsx      Main dashboard — assembles all components
  onboarding/page.tsx     4-step onboarding flow (org → connect → sync → done)

components/
  layout/
    Sidebar.tsx           240px sticky left sidebar, nav + account pills
  dashboard/
    CashPositionHero.tsx  Aurora gradient hero, total cash + account pills
    KPICards.tsx          Runway · Burn Rate · Due Soon (3-col grid)
    BurnRateChart.tsx     Recharts AreaChart, 6-month burn vs revenue
    CategoryBreakdown.tsx Animated horizontal progress bars per category
    InsightCards.tsx      Horizontal scroll, dismissible AI insight cards
    UpcomingPayments.tsx  Recurring payments list with usage signal dots
    ApprovalQueue.tsx     Stripe approval cards with full interaction flow
    AIChat.tsx            Slide-in panel, streaming text, canned responses

lib/
  types.ts                All TypeScript interfaces
  mock-data.ts            All realistic mock data (org, accounts, txns etc.)
  utils.ts                formatCurrency, formatDate, cn(), generateStripeRef()
```

---

## Design Tokens (from tailwind.config.ts)

| Token              | Value       | Usage                              |
|--------------------|-------------|-------------------------------------|
| `background`       | `#0D0D0D`   | Page background                     |
| `surface`          | `#141414`   | Cards                               |
| `surface-raised`   | `#1A1A1A`   | Elevated cards, inputs              |
| `surface-high`     | `#222222`   | Hover states, inner elements        |
| `border`           | `#242424`   | Default borders                     |
| `border-focus`     | `#383838`   | Hover/focus borders                 |
| `accent`           | `#C9E651`   | Primary action, badges, live dot    |
| `success`          | `#A8D672`   | Positive states, approved           |
| `warning`          | `#F5C842`   | Amber runway, moderate burn         |
| `danger`           | `#F26E6E`   | Critical runway, overspend          |
| `chart-lime`       | `#C9E651`   | Progress fills, primary chart line  |
| `chart-pink`       | `#F2AABB`   | Burn rate line                      |
| `chart-sage`       | `#A8D6B8`   | Revenue line                        |
| `chart-sky`        | `#A8CBF0`   | Secondary data                      |
| `text-primary`     | `#F5F5F5`   | Headings, key values                |
| `text-secondary`   | `#A0A0A0`   | Body text, labels                   |
| `text-muted`       | `#686868`   | Section labels, timestamps          |
| Aurora gradient    | lime→cream  | Hero card, AI avatar, CTA button    |

---

## Component State Map

```
Dashboard page
├── chatOpen (boolean)          → controls AIChat panel open/close
│
├── CashPositionHero            (no local state — reads mockKPIs)
├── KPICards                    (no local state — reads mockKPIs)
├── BurnRateChart               (no local state — reads mockBurnData)
├── CategoryBreakdown           (no local state — reads mockCategories)
│
├── InsightCards
│   └── dismissed (Set<string>) → which insight cards have been dismissed
│
├── ApprovalQueue
│   └── per-card: state ('idle'|'loading'|'approved'|'skipped')
│                 stripeRef (string, set after approval)
│
└── AIChat
    ├── messages (ChatMessage[]) → grows as user sends queries
    ├── input (string)
    ├── loading (boolean)
    └── streamingId (string|null) → which message is currently streaming
```

---

## Framer Motion Usage Map

| Component           | Animation                            | Purpose                      |
|---------------------|--------------------------------------|------------------------------|
| `CashPositionHero`  | `y: 10 → 0, opacity: 0 → 1`         | Hero number entrance         |
| `CashPositionHero`  | Account pills stagger (0.08s delay)  | Progressive data reveal      |
| `CashPositionHero`  | `RefreshCw` rotate loop              | Sync indicator               |
| `KPICards`          | Stagger `y: 12 → 0` per card         | Grid entrance                |
| `KPICards`          | Progress bar width animate           | Runway fill on load          |
| `KPICards`          | Sparkline bar heights animate         | Burn mini chart on load      |
| `CategoryBreakdown` | Each bar: `width: 0 → pct%`          | Data reveal (staggered)      |
| `InsightCards`      | `scale: 0.96 → 1, y: 8 → 0`         | Card entrance                |
| `InsightCards`      | `AnimatePresence` exit on dismiss    | Card collapse on X click     |
| `ApprovalQueue`     | Card `y: 8 → 0` entrance            | Card entrance                |
| `ApprovalQueue`     | Badge `AnimatePresence` swap         | Pending → Processing → Done  |
| `ApprovalQueue`     | Stripe ref `height: 0 → auto`        | Confirmation reveal          |
| `ApprovalQueue`     | Exit on skip                         | Card collapse                |
| `AIChat`            | Panel `x: 100% → 0` spring          | Slide in from right          |
| `AIChat`            | Backdrop `opacity: 0 → 1`           | Dim background               |
| `AIChat`            | Typing dots stagger opacity          | Loading indicator            |
| `Onboarding`        | Step `AnimatePresence` cross-fade    | Step transitions             |
| `Onboarding`        | Bank row stagger entrance            | Progressive bank list reveal |
| `Onboarding`        | CheckCircle `scale: 0 → 1` spring   | Connect confirmation pop     |
| `Onboarding`        | Aurora pulse (`scale: 1 → 1.3 → 1`) | Sync loading pulse           |
| `Onboarding`        | Sync step `opacity: 0.25 → 1`       | Step-by-step progress reveal |

---

## Stripe Approval — Interaction Sequence

```
1. User sees ApprovalCard (state: 'idle')
   → Shows: merchant logo, name, expected amount, due date
   → Shows: [Approve & Auto-Pay] [Skip] buttons

2. User clicks "Approve & Auto-Pay"
   → state → 'loading'
   → Button replaced by Loader2 spinner + "Creating Stripe payment..."
   → Badge swaps: "Pending" → "Processing" (animated swap)

3. After ~1.4s (simulated Stripe API call)
   → state → 'approved'
   → stripeRef generated (e.g. "STR-K3M7X9PQ")
   → Badge swaps: "Processing" → "Approved" (green, spring animation)
   → Stripe ref confirmation slides down (height: 0 → auto)
   → Buttons replaced by "Executes on [date]" text

4. Card persists in 'approved' state (green border tint)
   → User can see the Stripe reference for audit
```

---

## What to Fake for Hackathon (priority order)

| Feature                        | How to fake it                          | Real later?  |
|--------------------------------|-----------------------------------------|--------------|
| Stripe payment execution       | `setTimeout` 1.4s + `generateStripeRef` | Yes (Stripe API) |
| Plaid transaction sync         | `mockTransactions` pre-loaded           | Yes (Plaid SDK)  |
| AI responses                   | `CANNED_RESPONSES` in AIChat.tsx        | Yes (Claude API) |
| Real-time balance updates      | Static mock balances                    | Yes (Supabase Realtime + Plaid webhook) |
| Recurring detection algorithm  | Pre-flagged in mockRecurring            | Yes (Postgres function) |
| Plaid Link modal               | Simulate with button + setTimeout       | Yes (Plaid Link SDK) |
| Financial Health Score         | Hardcoded `68` in mockKPIs              | Yes (computed formula) |
| Insight card generation        | Static mockInsights array               | Yes (Claude API scheduled job) |

**Never fake:** Visual design, animations, Framer Motion interactions, color system. These must be real and perfect.

---

## What Makes This Feel Venture-Backed

1. **Aurora gradient** — the iridescent lime-cream gradient appears on: hero card glow, AI chat button, onboarding CTA, AI avatar. It's the visual signature of the product. Consistent use makes it feel like a real brand.

2. **Mono font for all numbers** — JetBrains Mono for every currency figure, balance, percentage. Financial products feel credible when numbers look precise.

3. **Live indicator** — the pulsing green dot + "Live" label on the cash position. Small detail, massive perceived quality signal.

4. **Status badge system** — every state has a badge (Pending · Processing · Approved · Under Review · Unused). Consistent visual language across the whole product.

5. **Skeleton states** — use the `.skeleton` CSS class anytime real data is loading. Never show an empty div. Products with skeleton loaders feel production-ready.

6. **Stripe reference number** — after approval, showing `STR-K3M7X9PQ` tells judges this is wired to a real system, not a mock button.

7. **Onboarding balance reveal** — when a bank connects and the balance animates in, that single moment communicates the whole product promise in under 2 seconds.
