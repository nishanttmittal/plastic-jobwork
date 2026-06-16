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

/** Admin (owner) emails — only relevant once cloud mode is enabled. */
export const OWNER_EMAILS = ['nspenterprises24@gmail.com', 'info@unicoproductsindia.com']
export const ROLES = { owner: 'owner', manager: 'manager' }

/** Admin password gate (local mode) — matches the other UNICO factory apps. */
export const ADMIN_PASSWORD = '6133923_N'

/** Entry numbering. Format: `${ENTRY_PREFIX}-0001`. */
export const ENTRY_PREFIX = 'PLW'

/** Quick-add chips on piece-count steppers. */
export const QUICK_QTYS = [50, 100, 250, 500, 1000, 2000]

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
  payments:    'plw_payments',
  counter:     'plw_entry_counter',
  compounds:   'plw_compounds',
  masterbatch: 'plw_masterbatch',
  inserts:     'plw_inserts',
  molders:     'plw_molders',
  products:    'plw_products',
  users:       'plw_users',
  logs:        'plw_logs',
}

/* ───────────────────────── SEED MASTERS (editable in-app) ───────────────── */

/** Compounds — rate is ₹ per kg. */
export const SEED_COMPOUNDS = [
  { id: 'cmp_pp', name: 'PP (Polypropylene)', rate: 80 },
]

/** Colour masterbatch / additives — rate is ₹ per kg, dosed as % of compound. */
export const SEED_MASTERBATCH = [
  { id: 'mb_black', name: 'Black Masterbatch', rate: 0 }, // rate PENDING from owner
]

/** Inserts / nuts the owner supplies — rate is ₹ each. */
export const SEED_INSERTS = [
  { id: 'nut_a', name: 'Nut A', rate: 1.5 },
]

/**
 * Molders (job-workers). shiftRate = ₹ per 12-hr shift on their machine.
 * gst: whether they bill GST on top; gstPct used only when gst is true.
 */
export const SEED_MOLDERS = [
  { id: 'mld_1', name: 'Molder 1 (180-ton)', shiftRate: 5000, gst: false, gstPct: 12 },
]

/**
 * Products (recipe / BOM). Adding a product later = one row here or via the
 * Masters screen — no code change.
 *   compoundId        which compound
 *   gPerPiece         grams of compound consumed per piece (incl. runner share)
 *   mbId, mbPct       masterbatch + dose as % of compound weight (0 = none)
 *   cavities          pieces per machine shot
 *   inserts[]         [{ insertId, qty }] per piece (empty = none)
 *   finishedPieceG    weighed finished-piece weight incl. nut (for accuracy
 *                     cross-check; 0 = skip the check)
 */
export const SEED_PRODUCTS = [
  {
    id: 'prd_cap',
    name: 'Cap (black)',
    compoundId: 'cmp_pp',
    gPerPiece: 38.9,
    mbId: 'mb_black',
    mbPct: 0,            // masterbatch dose PENDING from owner
    cavities: 4,
    inserts: [{ insertId: 'nut_a', qty: 1 }],
    finishedPieceG: 46.4, // 185.5g / 4 (incl. nut)
    note: '185.5g = 4 caps w/ nuts · runner 5.1g/shot · 45 sec cycle',
  },
  {
    id: 'prd_2',
    name: 'Product 2 (details pending)',
    compoundId: 'cmp_pp',
    gPerPiece: 0,
    mbId: '',
    mbPct: 0,
    cavities: 1,
    inserts: [],
    finishedPieceG: 0,
    note: 'Fill compound, grams/piece, cavities & nut when available.',
  },
]
