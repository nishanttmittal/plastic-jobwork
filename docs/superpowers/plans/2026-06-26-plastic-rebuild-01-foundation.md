# Plastic Rebuild — Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a new "Machined Instrument" Plastic Job Work app on the existing Firestore data — premium theme, ported-and-unit-tested calculation logic, instant open, auto-update, and an authenticated 5-tab shell with empty screens.

**Architecture:** Fresh Vite + React PWA in a new directory `~/plastic-jobwork-v2`, reusing the proven `src/core` framework and the existing `apps/plasticjobwork/*` Firestore namespace + shared ruleset (no data migration). The pure calculation modules are copied verbatim from `~/plastic-jobwork` and pinned with Vitest unit tests so a rewrite cannot silently change the numbers. The current live app stays untouched until a later switchover.

**Tech Stack:** React 18, Vite, Tailwind CSS, Firebase v10 (Firestore + Auth), vite-plugin-pwa (Workbox), Vitest. Deploy target: GitHub Pages base `/plastic-jobwork-v2/`.

## Global Constraints

- Firebase project + namespace unchanged: `apps/plasticjobwork/*`; do NOT edit the shared `unico-operations` ruleset.
- Reuse `src/core` (repository, schema normalizer, useCollection, UI kit contract) — do not reinvent.
- All numeric inputs use `inputMode="decimal"`.
- Money/costing UI is owner-only; manager never sees money, costing, hisab, masters, admin.
- Owner nav: `Home · Record · Jobs · Costing · Settings`. Manager nav: `Record · Material · Settings`.
- Design tokens are the single source of colors/fonts — no hardcoded hex in components.
- Bootstrap owner email: `nspenterprises24@gmail.com`. Sign in with Google.
- Deploy/push only works on the iPhone hotspot (factory network blocks GitHub).

---

### Task 1: Scaffold the v2 app on the same data

**Files:**
- Create: `~/plastic-jobwork-v2/` (copied from `~/plastic-jobwork`, history reset)
- Modify: `~/plastic-jobwork-v2/package.json` (name, homepage), `vite.config.js` (base `/plastic-jobwork-v2/`)
- Modify: `~/plastic-jobwork-v2/src/core/db/firebaseConfig.js` (confirm `PHASE1_LOCAL_ONLY=false`, same config)

**Interfaces:**
- Produces: a buildable app shell importing `src/core`; the `paths.*` helpers pointing at `apps/plasticjobwork/*`.

- [ ] **Step 1: Copy the framework, reset git**
```bash
cp -r ~/plastic-jobwork ~/plastic-jobwork-v2
cd ~/plastic-jobwork-v2
rm -rf .git dist node_modules docs/superpowers
git init -q && npm install
```

- [ ] **Step 2: Repoint base + name**
Edit `package.json`: `"name": "plastic-jobwork-v2"`, `"homepage": "https://nishanttmittal.github.io/plastic-jobwork-v2/"`.
Edit `vite.config.js`: `base: '/plastic-jobwork-v2/'`.

- [ ] **Step 3: Verify it builds and connects the same data**
Run: `npm run build`
Expected: `✓ built` with no errors. (Firestore namespace is unchanged, so the build already targets the live data.)

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "chore: scaffold plastic-jobwork-v2 from framework, base /plastic-jobwork-v2/"
```

---

### Task 2: Pin the calculation math with Vitest (number safety)

**Files:**
- Modify: `~/plastic-jobwork-v2/package.json` (add vitest, `"test": "vitest run"`)
- Keep verbatim: `src/modules/plastic/logic/{costing,reconcile,lot,stock,hisab,machineLoad}.js`
- Create: `src/modules/plastic/logic/__tests__/numbers.test.js`

**Interfaces:**
- Consumes (existing exports): `costing.productMaterialCost(product, masters)`, `costing.jobWorkTotal(entry, molder)`, `reconcile.netPlasticPerPieceG(product)`, `reconcile.nutsPerPiece(product)`, `lot.lotReconciliation(lotNo, masters, data)`, `stock.materialStock(masters, {purchases,issues,returns})`.
- Produces: a passing test suite guarding the real KUPPA-01 figures.

- [ ] **Step 1: Add Vitest**
```bash
cd ~/plastic-jobwork-v2 && npm i -D vitest
npm pkg set scripts.test="vitest run"
```

- [ ] **Step 2: Write the failing test** (`src/modules/plastic/logic/__tests__/numbers.test.js`)
Uses the verified live values (Kuppa: gPerPiece 38.9, netPartG 36, PP ₹80/kg, nut ₹1.50; KUPPA-01: 450 kg + 18,000 nuts issued, 11,928 good pcs, 5,548 nuts returned; PLW-0001 42.5 hr @ ₹4,500/12 hr shift).
```js
import { describe, it, expect } from 'vitest'
import { productMaterialCost, jobWorkTotal } from '../costing'
import { netPlasticPerPieceG, nutsPerPiece } from '../reconcile'
import { lotReconciliation } from '../lot'
import { materialStock } from '../stock'

const kuppa = { id: 'prd_cap', name: 'Kuppa', compoundId: 'cmp_pp', gPerPiece: 38.9, netPartG: 36, cavities: 4, inserts: [{ insertId: 'nut_a', qty: 1 }] }
const masters = {
  compounds: [{ id: 'cmp_pp', rate: 80, reorder: 500 }],
  inserts: [{ id: 'nut_a', rate: 1.5, weightG: 8.3, reorder: 25000 }],
  molders: [{ id: 'mld_1', shiftRate: 4500, gst: false }],
  products: [kuppa], masterbatch: [],
}
const data = {
  issues: [{ lotNo: 'KUPPA-01', molderId: 'mld_1', compoundId: 'cmp_pp', compoundKg: 450, productId: 'prd_cap', insertId: 'nut_a', nutQty: 18000 }],
  production: [{ lotNo: 'KUPPA-01', molderId: 'mld_1', hours: 42.5, items: [{ productId: 'prd_cap', pieces: 11928, rejects: 0 }] }],
  returns: [{ lotNo: 'KUPPA-01', insertId: 'nut_a', nutQty: 5548 }],
}

describe('costing', () => {
  it('Kuppa material cost = ₹4.61/pc (compound 3.11 + nut 1.50)', () => {
    expect(productMaterialCost(kuppa, masters).total).toBeCloseTo(4.61, 2)
  })
  it('PLW-0001 job-work = ₹15,937.50 (42.5 hr / 12 × 4500)', () => {
    expect(jobWorkTotal(data.production[0], masters.molders[0])).toBeCloseTo(15937.5, 1)
  })
})

describe('reconcile', () => {
  it('net plastic 36 g, 1 nut/piece', () => {
    expect(netPlasticPerPieceG(kuppa)).toBe(36)
    expect(nutsPerPiece(kuppa)).toBe(1)
  })
})

describe('lot KUPPA-01', () => {
  const r = lotReconciliation('KUPPA-01', masters, data)
  it('nut balance = 524 (18000 − 11928 used − 5548 returned)', () => expect(r.nutBalance).toBe(524))
  it('no over-consumption flag', () => expect(r.flag).toBe(false))
})

describe('stock', () => {
  it('nut stock = +5548 (18000 bought − 18000 issued + 5548 returned)', () => {
    const purchases = [{ kind: 'nut', materialId: 'nut_a', qty: 18000, rate: 1.5 }]
    const nut = materialStock(masters, { purchases, issues: data.issues, returns: data.returns }).inserts[0]
    expect(nut.stock).toBe(5548)
  })
})
```

- [ ] **Step 3: Run to verify it passes** (logic is copied verbatim, so it should be green immediately)
Run: `npm test`
Expected: all tests PASS. If any fail, the copied logic differs from the live app — stop and diff before continuing.

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "test: pin KUPPA-01 costing/reconcile/lot/stock figures (number-safety guard)"
```

---

### Task 3: Machined Instrument design tokens + base primitives

**Files:**
- Modify: `~/plastic-jobwork-v2/tailwind.config.js` (extend theme with tokens + fonts)
- Modify: `src/index.css` (CSS variables, font imports, dark base)
- Create: `src/core/ui/instrument.jsx` (`InstrumentCard`, `Readout`, `StatusPip`)
- Modify: `src/core/ui/index.js` (export the new primitives)

**Interfaces:**
- Produces: `<InstrumentCard>`, `<Readout value label tone />` (tone: 'default'|'amber'|'green'|'red'), `<StatusPip tone />`, and Tailwind colors `graphite steel hairline chrome muted amber signal-green signal-red`.

- [ ] **Step 1: Add tokens to Tailwind** (`tailwind.config.js` → `theme.extend`)
```js
colors: {
  graphite: '#0E1217', steel: '#161D26', hairline: '#2A323D',
  chrome: '#E8EDF2', muted: '#8A95A3', amber: '#FF9F45',
  'signal-green': '#3FB984', 'signal-red': '#FF5C5C',
},
fontFamily: {
  display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
},
```

- [ ] **Step 2: Base styles + fonts** (`src/index.css`, top)
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
:root { color-scheme: dark; }
body { @apply bg-graphite text-chrome font-sans antialiased; }
.tnum { font-variant-numeric: tabular-nums; }
```

- [ ] **Step 3: Build the primitives** (`src/core/ui/instrument.jsx`)
```jsx
export function InstrumentCard({ className = '', children }) {
  return (
    <div className={`relative rounded-2xl bg-steel border border-hairline ${className}`}>
      <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {children}
    </div>
  )
}
const TONE = { default: 'text-chrome', amber: 'text-amber', green: 'text-signal-green', red: 'text-signal-red' }
export function Readout({ value, label, tone = 'default' }) {
  return (
    <div className="text-center">
      <div className={`font-mono tnum text-3xl font-bold ${TONE[tone]}`}>{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted mt-0.5">{label}</div>
    </div>
  )
}
export function StatusPip({ tone = 'green', className = '' }) {
  const c = { green: 'bg-signal-green', amber: 'bg-amber', red: 'bg-signal-red' }[tone]
  return <span className={`inline-block w-2 h-2 rounded-full ${c} ${className}`} />
}
```

- [ ] **Step 4: Export them** — add to `src/core/ui/index.js`:
```js
export { InstrumentCard, Readout, StatusPip } from './instrument'
```

- [ ] **Step 5: Verify build**
Run: `npm run build`
Expected: `✓ built`, no errors.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat: Machined Instrument design tokens + InstrumentCard/Readout/StatusPip"
```

---

### Task 4: Instant-open Firestore cache + non-blocking shell

**Files:**
- Modify: `src/core/db/firebase.js:44-46` (enable persistent cache with safe fallback)
- Modify: `src/modules/plastic/FirestoreProvider.jsx` (render children immediately; expose `ready` as a soft flag, not a full-screen gate)

**Interfaces:**
- Consumes: `initializeFirestore`, `persistentLocalCache`, `persistentMultipleTabManager` from `firebase/firestore`.
- Produces: a provider that renders the app shell on first paint while data streams in.

- [ ] **Step 1: Enable persistent cache with fallback** (`src/core/db/firebase.js`, replace the `initializeFirestore` block)
```js
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    experimentalAutoDetectLongPolling: true,
  })
} catch {
  // Some iOS/Safari environments reject IndexedDB persistence — fall back to
  // memory cache so the app still works (no worse than before).
  db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true })
}
```

- [ ] **Step 2: Stop full-screen blocking** (`FirestoreProvider.jsx`)
Render `<PlasticCtx.Provider>` immediately. Replace the `if (!ready) return <big spinner>` with: keep `ready`/`error` in context; the shell shows a thin top "syncing…" bar when `!ready`, not a blank screen. (With the cache, cached data paints instantly; the bar is for the rare cold first run.)

- [ ] **Step 3: Verify build**
Run: `npm run build` → `✓ built`.

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "perf: persistent Firestore cache + render shell immediately (instant open)"
```

---

### Task 5: Auth gate + 5-tab role shell + PWA auto-update

**Files:**
- Modify: `src/modules/plastic/manifest.jsx` (5 nav keys + role rules; placeholder Components)
- Create: `src/modules/plastic/pages/_Placeholder.jsx` (temporary empty screen per tab)
- Create: `src/modules/plastic/pages/Settings.jsx` (the menu list of secondary screens)
- Modify: `src/main.jsx` (confirm registerSW auto-update + build stamp present)

**Interfaces:**
- Consumes: existing `AppShell`, `AuthGate`, `resolveRole`.
- Produces: signed-in app with bottom nav `Home · Record · Jobs · Costing · Settings` (owner) / `Record · Material · Settings` (manager); each tab renders a titled placeholder; Settings lists the secondary screens.

- [ ] **Step 1: Placeholder screen** (`pages/_Placeholder.jsx`)
```jsx
export default function Placeholder({ title = 'Screen' }) {
  return <div className="max-w-lg mx-auto p-6 text-center text-muted">{title} — coming in the next build.</div>
}
```

- [ ] **Step 2: Settings menu** (`pages/Settings.jsx`)
```jsx
import { InstrumentCard } from '../../../core/ui'
const ITEMS = [
  ['stock', '📦', 'Stock', 'Raw material, purchases, prices'],
  ['machine', '🏭', 'Machine Load', 'Buy-a-machine signal'],
  ['qc', '🧪', 'QC / Reports', 'Rejections & trends'],
  ['entries', '📜', 'Entries', 'Edit / void / audit'],
  ['masters', '🗂️', 'Masters', 'Products, rates, moulders'],
  ['admin', '⚙️', 'Admin', 'Backup, restore'],
]
export default function Settings({ onOpen }) {
  return (
    <div className="max-w-lg mx-auto p-4 space-y-2">
      {ITEMS.map(([key, icon, name, desc]) => (
        <button key={key} onClick={() => onOpen && onOpen(key)} className="w-full text-left">
          <InstrumentCard className="p-4 flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <span className="flex-1"><span className="block font-semibold text-chrome">{name}</span>
              <span className="block text-xs text-muted">{desc}</span></span>
            <span className="text-muted">›</span>
          </InstrumentCard>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Wire the manifest** (`manifest.jsx`) — 5 nav tabs using `_Placeholder` for Home/Record/Jobs/Costing (titled) and `Settings` for the menu; keep Material as manager-only nav; secondary keys (stock/machine/qc/entries/masters/admin) as owner-only non-nav, opened from Settings.

- [ ] **Step 4: Verify build + auth**
Run: `npm run build` → `✓ built`. Then `npm run dev`, sign in with `nspenterprises24@gmail.com`, confirm the 5 tabs appear and Settings lists the six items.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: auth gate + 5-tab role shell (Home/Record/Jobs/Costing/Settings) + Settings menu"
```

---

## Checkpoint (end of Plan 1)

Deliverable: a premium dark, signed-in app on the real data, opening instantly, with the math green under tests and an empty but navigable 5-tab shell. **No screen content yet** — that's Plans 2–4. **Do not deploy/switch the live link yet**; the current app stays primary until the screens are built and a parity check passes.

## Self-review notes
- Spec coverage: design tokens (§3 ✓ T3), reuse+test math (§5 ✓ T2), same data (§6 ✓ T1), instant-open + auto-update (§7 ✓ T4/T5), nav/roles (§4 ✓ T5). Screen *content* (Home/Record/Jobs/Costing/Settings bodies) is intentionally deferred to Plans 2–4.
- Open decision resolved here: new repo `plastic-jobwork-v2` (clean history); Stock "low" semantics handled when the Stock screen is built (Plan 4), defaulting to negative-only.
