/**
 * Material reconciliation (pure functions).
 *
 * Ties every kg of compound issued to a molder against what came back:
 *   issued = plastic in finished product (taken back)
 *          + runner returned  (regrind)
 *          + rejects returned (scrap, regrind)
 *          + burnt / purge loss (destroyed — owner's loss)
 *          + balance still lying with the molder
 *
 * A 🚩 flag is raised when a molder appears to have consumed MORE than issued
 * (beyond tolerance) — the signal that weights/counts don't add up.
 */
import { byId, round2 } from './costing'
import { RECON_TOLERANCE_KG } from '../config'

/** Total nuts a product uses per piece (sum across its inserts). */
export function nutsPerPiece(product) {
  if (!product) return 0
  return (product.inserts || []).reduce((s, i) => s + (Number(i.qty) || 0), 0)
}

const active = (rows) => (rows || []).filter(r => !r.voided)

/**
 * Reconcile one molder.
 * data = { issues, production, products }
 */
export function molderBalance(molderId, data) {
  const issues = active(data.issues).filter(i => i.molderId === molderId)
  const entries = active(data.production).filter(p => p.molderId === molderId)
  const products = data.products || []

  const issuedKg = round2(issues.reduce((s, i) => s + (Number(i.compoundKg) || 0), 0))
  const nutsIssued = issues.reduce((s, i) => s + (Number(i.nutQty) || 0), 0)
  const mbIssuedKg = round2(issues.reduce((s, i) => s + (Number(i.mbKg) || 0), 0))

  let plasticInProductsKg = 0
  let nutsUsed = 0
  let runnerKg = 0, rejectsKg = 0, burntKg = 0, goodPieces = 0
  for (const e of entries) {
    runnerKg += Number(e.runnerKg) || 0
    rejectsKg += Number(e.rejectsKg) || 0
    burntKg += Number(e.burntKg) || 0
    for (const it of e.items || []) {
      const product = byId(products, it.productId)
      const pcs = Number(it.pieces) || 0
      const rej = Number(it.rejects) || 0
      goodPieces += pcs
      plasticInProductsKg += (pcs * (Number(product?.gPerPiece) || 0)) / 1000
      nutsUsed += (pcs + rej) * nutsPerPiece(product)
    }
  }
  plasticInProductsKg = round2(plasticInProductsKg)
  runnerKg = round2(runnerKg)
  rejectsKg = round2(rejectsKg)
  burntKg = round2(burntKg)

  const accountedKg = round2(plasticInProductsKg + runnerKg + rejectsKg + burntKg)
  const balanceKg = round2(issuedKg - accountedKg)
  const regrindKg = round2(runnerKg + rejectsKg) // reusable returned stock

  return {
    molderId,
    issuedKg, mbIssuedKg,
    plasticInProductsKg, runnerKg, rejectsKg, burntKg,
    accountedKg, balanceKg, regrindKg,
    goodPieces,
    nutsIssued, nutsUsed, nutBalance: nutsIssued - nutsUsed,
    flag: balanceKg < -RECON_TOLERANCE_KG,
  }
}

/** Reconcile every molder that has any activity. */
export function allMolderBalances(masters, data) {
  const ids = new Set([
    ...active(data.issues).map(i => i.molderId),
    ...active(data.production).map(p => p.molderId),
  ])
  return [...ids].map(id => ({
    molder: byId(masters.molders, id),
    ...molderBalance(id, { ...data, products: masters.products }),
  }))
}
