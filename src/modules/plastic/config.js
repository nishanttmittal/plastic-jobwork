/**
 * Plastic Job Work module — configuration, constants & seed masters.
 *
 * Owner: Nishant Mittal / UNICO Metal Products. Tracks plastic injection-
 * moulding job work — compound issued to molders, production returned,
 * cost per piece, material reconciliation, and per-molder money (hisab).
 *
 * All rates live in editable MASTERS (compounds, masterbatch, inserts, molders,
 * products). Changing a rate never rewrites history — each production entry
 * stores the cost it was computed at (rates are "locked on entry").
 */

export const APP_TITLE = 'Plastic Job Work'

/** Admin (owner) bootstrap email — MUST match the shared firestore.rules
 * bootstrapOwner and the standing rule (owner signs in with THIS account, not
 * the info@ billing login). Can never be locked out. */
export const OWNER_EMAILS = ['nspenterprises24@gmail.com']
export const ROLES = { owner: 'owner', manager: 'manager' }

/** Admin password gate (local mode) — matches the other UNICO factory apps. */
export const ADMIN_PASSWORD = '6133923_N'

/** Entry numbering. Format: `${ENTRY_PREFIX}-0001`. */
export const ENTRY_PREFIX = 'PLW'

/** Quick-add chips on piece-count steppers. */
export const QUICK_QTYS = [50, 100, 250, 500, 1000, 2000]

/**
 * Rejection reasons (QC) — picked per product when rejects > 0, so we build a
 * defect history per molder and per product for root-cause + accountability.
 * Editable here; `value` is stored on the entry, `label` is shown. Common
 * injection-moulding defects for caps/ferrules with a moulded-in nut.
 */
export const REJECT_REASONS = [
  { value: 'short_shot',   label: 'Short shot (incomplete fill)' },
  { value: 'flash',        label: 'Flash (excess at parting line)' },
  { value: 'burn',         label: 'Burn marks / black streaks' },
  { value: 'sink',         label: 'Sink marks' },
  { value: 'warpage',      label: 'Warpage / dimension off' },
  { value: 'nut',          label: 'Nut missing / misaligned' },
  { value: 'contamination',label: 'Contamination / mixed material' },
  { value: 'color',        label: 'Colour / masterbatch issue' },
  { value: 'crack',        label: 'Crack / weld line' },
  { value: 'other',        label: 'Other' },
]

/** value → label lookup for displaying a stored reason. */
export const rejectReasonLabel = (v) =>
  (REJECT_REASONS.find(r => r.value === v) || {}).label || 'Unspecified'

/**
 * Reconciliation tolerance — if a molder appears to have CONSUMED more compound
 * than was issued by more than this many kg, the dashboard raises a 🚩 flag.
 */
export const RECON_TOLERANCE_KG = 2

/**
 * Make-vs-buy reference (for the dashboard "buy the machine?" indicator).
 * Owner figures, 2026-06-16. Editable here. All ₹.
 */
export const MACHINE_ECONOMICS = {
  machineCost: 2500000,   // ₹25,00,000 capital for a 180-ton machine
  lifeYears: 10,          // straight-line depreciation
  monthlyOperator: 30000,
  monthlyRent: 15000,
  monthlyElectricity: 40000,
  monthlyMaintenance: 4000,
  // Outsource conversion cost (job-work) per piece, for comparison.
  outsourcePerPiece: 1.55,
}

/** Storage keys owned by this module (local mode). */
export const KEYS = {
  production:  'plw_production',
  issues:      'plw_issues',
  returns:     'plw_returns',
  purchases:   'plw_purchases',
  payments:    'plw_payments',
  counter:     'plw_entry_counter',
  compounds:   'plw_compounds',
  masterbatch: 'plw_masterbatch',
  inserts:     'plw_inserts',
  molders:     'plw_molders',
  products:    'plw_products',
  users:       'plw_users',
  logs:        'plw_logs',
  lotLocks:    'plw_lotlocks',
}

/* ───────────────────────── SEED MASTERS (editable in-app) ───────────────── */

/** Compounds — rate is ₹ per kg. */
export const SEED_COMPOUNDS = [
  { id: 'cmp_pp', name: 'PP (Polypropylene)', rate: 80 },
  { id: 'cmp_pp_knob', name: 'PP (knob)', rate: 85 },
]

/** Colour masterbatch / additives — rate is ₹ per kg, dosed as % of compound. */
export const SEED_MASTERBATCH = [
  { id: 'mb_black', name: 'Black Masterbatch', rate: 0 }, // rate PENDING from owner
]

/** Inserts / nuts the owner supplies — rate is ₹ each; weightG = grams each
 *  (for the weight reconciliation / nut-count cross-check; 0 = skip checks). */
export const SEED_INSERTS = [
  { id: 'nut_a', name: 'Nut A', rate: 1.5, weightG: 0 },
]

/**
 * Molders (job-workers). shiftRate = ₹ per 12-hr shift on their machine.
 * gst: whether they bill GST on top; gstPct used only when gst is true.
 */
export const SEED_MOLDERS = [
  { id: 'mld_1', name: 'Molder 1 (180-ton)', shiftRate: 5000, gst: false, gstPct: 12, payMode: 'time', pieceRate: 0 },
]

/**
 * Products (recipe / BOM). Adding a product later = one row here or via the
 * Masters screen — no code change.
 *   compoundId        which compound
 *   gPerPiece         compound CONSUMED per piece incl. runner+purge waste —
 *                     used for COSTING (what you pay for per piece)
 *   netPartG          NET plastic actually IN one finished piece — used for
 *                     material RECONCILIATION (0 = fall back to gPerPiece).
 *                     Keep these two separate: cost ≠ what's in the part.
 *   mbId, mbPct       masterbatch + dose as % of compound weight (0 = none)
 *   cavities          pieces per machine shot
 *   inserts[]         [{ insertId, qty }] per piece (empty = none)
 *   finishedPieceG    weighed finished-piece weight incl. nut (for the
 *                     weigh-on-receipt accuracy check; 0 = skip the check).
 *                     Should ≈ netPartG + (nut qty × nut weightG).
 */
export const SEED_PRODUCTS = [
  {
    id: 'prd_cap',
    name: 'Cap (black)',
    compoundId: 'cmp_pp',
    gPerPiece: 38.9,    // compound consumed/piece incl. waste — for COST
    netPartG: 0,        // net plastic in the part — for RECONCILIATION (set after weighing)
    mbId: 'mb_black',
    mbPct: 0,            // masterbatch dose PENDING from owner
    cavities: 4,
    cycleSec: 36,        // rated cycle time (sec) — target for shots/hr efficiency
    inserts: [{ insertId: 'nut_a', qty: 1 }],
    finishedPieceG: 46.4, // 185.5g / 4 (incl. nut)
    note: '185.5g = 4 caps w/ nuts · runner 5.1g/shot · 45 sec cycle',
  },
  {
    id: 'prd_knob',
    name: 'Knob',
    compoundId: 'cmp_pp_knob',  // PP @ ₹85/kg
    gPerPiece: 27.25,       // full shot 109g ÷ 4 (compound/pc incl runner) — for COST
    netPartG: 26.1,         // 4 pcs = 104.4g → 26.1g/pc net plastic — for RECON
    mbId: '',
    mbPct: 0,
    cavities: 4,
    cycleSec: 73,
    inserts: [],            // no nut
    finishedPieceG: 26.1,   // no nut → finished = net plastic
    note: 'Chair handle/knob. Measured 23-Jun: 4 pcs=104.4g (26.1g/pc), runner 4.6g/shot (~4%, normal).',
  },
  // Add more products via Masters → Products (no code change needed).
]
