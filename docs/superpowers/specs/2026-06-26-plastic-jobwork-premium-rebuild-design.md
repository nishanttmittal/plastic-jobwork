# Plastic Job Work — Premium Rebuild (Design Spec)

**Date:** 2026-06-26
**Owner:** Nishant Mittal (UNICO Metal Products)
**Status:** Approved design — ready for implementation plan
**Supersedes UI of:** the live app at `~/plastic-jobwork` (https://nishanttmittal.github.io/plastic-jobwork/)

---

## 1. Goal

Rebuild the injection-moulding job-work tracker as a **premium, fast, focused app** on top of the **existing cloud data**. The owner's stated #1 goal: *"looks like a real, premium app."* Secondary, non-negotiable: the numbers stay trustworthy.

### Non-goals
- No new business capability in Phase 1 (this is a rebuild, not a feature expansion).
- No change to the data model, Firestore namespace, or security rules.
- No data migration or loss — every existing lot, purchase, return, payment, master, and lock is preserved as-is.

---

## 2. Users & roles (unchanged)
- **Owner** (`nspenterprises24@gmail.com` bootstrap): everything, including money/costing.
- **Manager:** material in/out + material log only. Never sees money, costing, hisab, masters, admin.
- Google sign-in + email allowlist; one shared `unico-operations` Firestore ruleset.

---

## 3. Visual system — "Machined Instrument"

A dark, precise instrument-panel aesthetic (CNC HMI / digital caliper), not a generic dark theme. The numbers are the hero.

### Color tokens
| Token | Hex | Use |
|---|---|---|
| `graphite` | `#0E1217` | App background |
| `steel` | `#161D26` | Cards / surfaces |
| `hairline` | `#2A323D` | Borders, dividers |
| `chrome` | `#E8EDF2` | Primary text + figures |
| `muted` | `#8A95A3` | Labels, captions, units |
| `amber` (accent) | `#FF9F45` | Primary actions, highlights (molten/moulding nod) |
| `signal-green` | `#3FB984` | Status: settled / healthy |
| `signal-red` | `#FF5C5C` | Status: flag / negative / over-consumed |

### Typography
- **Display:** Space Grotesk (technical grotesk; used with restraint for headings/eyebrows).
- **Body/UI:** Inter.
- **Figures/data:** JetBrains Mono with **tabular numerals**, so every column of numbers aligns like a readout.

### Components & signature
- **Instrument card:** steel surface, hairline border, a thin brushed-chrome highlight on the top edge.
- **Readout (the signature):** large tabular-mono number with a small uppercase unit label beneath (e.g., `18,349` / `PIECES`).
- **Status pip:** colored dot (green/amber/red) so status reads before the number.
- **Primary button:** molten-amber; large touch target (worker/phone use).
- Real **UNICO logo** in the header (`~/unico-website/logo_hi.png`), never a text wordmark.

### Quality floor
Mobile-first (iPhone), responsive to small screens, visible keyboard focus, `prefers-reduced-motion` respected, large tap targets, decimal keypad on every numeric field (`inputMode="decimal"`).

---

## 4. Information architecture

**Owner bottom nav (essentials):** `Home` · `Record` · `Jobs` · `Costing` · `Settings`
**Manager bottom nav:** `Record` · `Material` · `Settings`

### Essential screens
- **Home** — instrument dashboard: alerts (flag), "still out with moulders" per open lot (pcs / nuts / kg, tappable), pieces today / this month, "you owe moulders ₹". Owner-only money lines.
- **Record** — one hub, segmented: **Material out** (issue compound/nuts, by weight) · **Pieces in** (production: pieces + finished weight + machine shots + rejects-by-reason) · **Material back** (returns: compound/regrind/nuts). Reuses existing validation rules (weight mandatory, nut-weight required, >10-piece mismatch flag, machine-shots cross-check).
- **Jobs** — merge of today's **Moulders** + **Lot Report**: per moulder → per lot → material reconciliation (sent vs received vs balance), pending pieces, nut balance, two cost/piece rates, efficiency, money/hisab, finalize/lock + PDF.
- **Costing** — single headline ₹/piece; Include-nut and **Reject-markup** toggles (renamed from "scrap" with a plain explanation); assumptions + reverse-calc in expanders.

### "Settings" tab (one tap to the rest)
Stock (purchases + derived stock + reorder) · Machine Load (buy-a-machine signal) · QC/Reports (15-day rejections + trends) · Entries (audit / edit / void) · Masters & Rates · Admin (backup/restore/reset).

---

## 5. Reused vs rebuilt

### Reused **verbatim** (proven, to protect the numbers)
The pure calculation/business-logic modules, carried over unchanged and locked with unit tests:
`logic/costing.js`, `logic/reconcile.js`, `logic/lot.js`, `logic/stock.js`, `logic/hisab.js`, `logic/machineLoad.js`, plus the verified master constants (piece weights, rates, machine economics).

### Reused (framework)
`src/core` — repository/CRUD, schema normalizer (additive fields), `useCollection`, Firestore wiring, role-based shell contract.

### Rebuilt (new)
Theme system + tokens, all page layouts, navigation/shell, the Record hub, the merged Jobs screen, Home dashboard — to the Machined Instrument design.

### Added
- **Unit tests** around the reused logic (costing, reconciliation, lot balance, stock) — the regression guard the survey flagged as missing.

---

## 6. Data layer & safety

- **Same Firestore:** namespace `apps/plasticjobwork/*`, same documents, same shared ruleset. **No migration.**
- **Build alongside:** the new app is developed as a separate build/repo pointed at the *same* live data. The current app stays live and untouched until switchover.
- **Parity check before switchover:** verify the new app's key figures (each lot's sent/received/balance, moulder dues, stock, cost/piece) **match the current app exactly** before the WhatsApp link is repointed.
- Fully reversible: if anything is off, the old app is still there.

---

## 7. Performance & "always current"

Root causes (already diagnosed):
- **Slow open** = cold cloud handshake on every open with in-memory-only cache; full-screen block until first snapshot. (Quota ruled out — ~39 reads/open vs 50k/day limit.)
- **Stale screens** = iPhone PWA serving an old cached build.

Fixes baked into the rebuild:
1. **Instant open:** Firestore IndexedDB persistent cache (with a memory fallback if the device rejects it), and render the shell immediately while data streams in — no full-screen "Connecting…" wait.
2. **Auto-update PWA:** `registerType:'autoUpdate'` + ~60s update poll + visibility-change check + a visible build-version stamp. One final manual cache-clear lands the user on the self-updating build; thereafter every deploy reaches the phone within ~a minute.

---

## 8. Build phases

**Phase 1 (this spec):** design system & tokens → Home → Record → Jobs → Costing → Settings; reuse + test the logic modules; instant-open + auto-update; parity check; switch link.
**Phase 2:** QC/reports polish inside Settings; any remaining secondary-screen refinement.

---

## 9. Carried-forward fixes (already validated on the current app)
- Decimal keypad on all numeric inputs (`inputMode="decimal"`).
- "Include scrap" → **"Reject markup"** with explanation; runner/regrind kept separate.
- Stock "shortfall" alert only on **negative** stock (compound is buy-and-ship, so ~0 is normal, not "low").
- Pending-from-moulder shown per open lot with detail; finalized lots excluded.

## 10. Open decisions (to confirm during planning)
- New repo (`plastic-jobwork-v2`) vs. a fresh module/branch in the current repo. Recommendation: new repo for a clean history; same `src/core` + same Firebase config.
- Stock "low" semantics on the Stock screen itself (set compound reorder to 0, or redefine "low" as negative-only). Recommendation: negative-only, consistent with Home.
