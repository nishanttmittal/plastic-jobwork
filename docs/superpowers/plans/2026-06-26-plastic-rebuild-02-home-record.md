# Plastic Rebuild — Plan 2: Home + Record Implementation Plan

> **For agentic workers:** implement task-by-task; verify build + headless smoke after each; commit each.

**Goal:** Build the premium Home dashboard and the Record hub (material out / pieces in / material back) in the Machined Instrument style, on the v2 app.

**Architecture:** Rebuild the presentation of Home and the Record hub using `InstrumentCard/Readout/StatusPip`; reuse the existing, tested logic (`reconcile`, `lot`, `hisab`, `stock`, `costing`) and the existing form components — restyled to the dark theme — for the three Record sub-flows. Wire real components into the manifest (replace placeholders).

**Tech Stack:** React 19, Vite, Tailwind v4, Firebase v12. Repo: `~/plastic-jobwork-v2`.

## Global Constraints
(Inherits Plan 1's constraints: tokens-only colors, decimal inputs, owner-only money, same Firestore data.)

---

### Task 1: Home dashboard (premium)
**Files:** Modify `src/modules/plastic/pages/Home.jsx` (rebuild JSX), `src/modules/plastic/manifest.jsx` (home → real Home).
**Reuse:** `materialStock`, `lotList/lotReconciliation/isLotFinalized`, `molderHisab`, `todayStr/fmtNum`.
**Content:** flag alerts (red); negative-stock alert (amber, owner); "Out with moulders" instrument card (3 Readouts pcs/nuts/kg + per-open-lot rows with StatusPip); Today/Month Readouts; "You owe moulders ₹" (owner). Tap targets → `onOpen('jobs')` / `onOpen('stock')`.
**Verify:** build + headless load → premium dark Home renders for a signed-in owner (or at least boots clean). Commit.

### Task 2: Record hub + three flows (restyled)
**Files:** Modify `pages/Record.jsx` (segmented hub, dark), restyle `pages/IssueCompound.jsx`, `pages/NewProduction.jsx`, `pages/ReturnMaterial.jsx` to instrument theme; manifest record → real Record.
**Reuse:** existing form logic/validation unchanged (weight mandatory, nut-weight required, machine-shots cross-check, reject rows). Only restyle to dark + decimal inputs (already global).
**Verify:** build + headless boot clean; commit.

## Self-review
Covers spec §4 Home + Record. Jobs/Costing/Settings screens remain Plans 3–4.
