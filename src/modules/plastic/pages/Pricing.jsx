/**
 * Pricing — a live cost calculator for any product. Shows the four prices the
 * owner asked for in one place:
 *      | without waste | with waste |
 *  with nut    ✓             ✓
 *  without nut ✓             ✓
 *
 * "Without waste" = clean cost assuming good yield / waste returned at cost.
 * "With waste"     = the same cost ÷ (1 − wastage%), i.e. the rejected pieces'
 *                    material + nuts + machine time loaded onto the good pieces.
 * Owner-only (shows money).
 */
import { useState, useMemo } from 'react'
import { usePlastic } from '../PlasticContext'
import { Card, FieldLabel, Select, NumberInput } from '../../../core/ui'
import { fmtNum } from '../../../core/utils/format'
import { productMaterialCost, byId } from '../logic/costing'

const rupee = (n) => `₹${(Number(n) || 0).toFixed(2)}`

export default function Pricing() {
  const { masters, molders } = usePlastic()
  const products = masters.products.filter(p => (Number(p.gPerPiece) || 0) > 0)

  const [productId, setProductId] = useState(products[0]?.id || '')
  const [molderId, setMolderId] = useState(molders[0]?.id || '')
  const product = byId(masters.products, productId)
  const molder = byId(masters.molders, molderId)

  const [shotsPerHr, setShotsPerHr] = useState(String(product?.shotsPerHour || 70))
  const [shiftHrs, setShiftHrs] = useState('12')
  const [wastePct, setWastePct] = useState('0')
  const [regrindPct, setRegrindPct] = useState('0')

  const calc = useMemo(() => {
    if (!product || !molder) return null
    const cavities = Number(product.cavities) || 1
    const piecesPerShift = cavities * (Number(shotsPerHr) || 0) * (Number(shiftHrs) || 0)
    const mat = productMaterialCost(product, masters)        // {compound, masterbatch, nut, total}

    // Regrind reuse: the runner (sprue) regenerated every shot can be reground and
    // blended back, so that % of the runner's plastic is NOT bought as fresh virgin.
    const cmp = byId(masters.compounds, product.compoundId)
    const rate = Number(cmp?.rate) || 0
    const runnerPerPiece = (Number(product.runnerGPerShot) || 0) / cavities  // grams
    const R = Math.min(1, Math.max(0, (Number(regrindPct) || 0) / 100))
    const regrindSaving = (runnerPerPiece * R * rate) / 1000  // ₹/piece saved
    const compoundEff = Math.max(0, mat.compound - regrindSaving)

    const matNoNut = compoundEff + mat.masterbatch
    const shiftCost = molder.gst
      ? (Number(molder.shiftRate) || 0) * (1 + (Number(molder.gstPct) || 0) / 100)
      : (Number(molder.shiftRate) || 0)
    const jobWork = piecesPerShift > 0 ? shiftCost / piecesPerShift : 0
    const W = Math.min(0.95, (Number(wastePct) || 0) / 100)
    const f = 1 - W

    const withNut_clean = matNoNut + mat.nut + jobWork
    const noNut_clean = matNoNut + jobWork
    return {
      cavities, piecesPerShift, jobWork, shiftCost,
      compound: mat.compound, compoundEff, regrindSaving, runnerPerPiece,
      masterbatch: mat.masterbatch, nut: mat.nut,
      withNut_clean, noNut_clean,
      withNut_waste: f > 0 ? withNut_clean / f : 0,
      noNut_waste: f > 0 ? noNut_clean / f : 0,
    }
  }, [product, molder, masters, shotsPerHr, shiftHrs, wastePct, regrindPct])

  const molderOpts = molders.map(m => ({ value: m.id, label: m.name }))
  const productOpts = products.map(p => ({ value: p.id, label: p.name }))

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <Card className="p-4 space-y-3">
        <div>
          <FieldLabel>Product</FieldLabel>
          <Select options={productOpts} value={productId} onChange={e => setProductId(e.target.value)} className="mt-1" />
        </div>
        <div>
          <FieldLabel>Molder (shift rate)</FieldLabel>
          <Select options={molderOpts} value={molderId} onChange={e => setMolderId(e.target.value)} className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-xs text-slate-500">Shots / hour</span>
            <NumberInput value={shotsPerHr} onChange={e => setShotsPerHr(e.target.value)} className="mt-1" />
          </div>
          <div>
            <span className="text-xs text-slate-500">Shift hours</span>
            <NumberInput value={shiftHrs} onChange={e => setShiftHrs(e.target.value)} className="mt-1" />
          </div>
          <div>
            <span className="text-xs text-slate-500">Wastage %</span>
            <NumberInput value={wastePct} onChange={e => setWastePct(e.target.value)} className="mt-1" />
          </div>
          <div>
            <span className="text-xs text-slate-500">Regrind reused %</span>
            <NumberInput value={regrindPct} onChange={e => setRegrindPct(e.target.value)} className="mt-1" />
          </div>
        </div>
      </Card>

      {calc && (
        <>
          {/* The four prices */}
          <Card className="p-4">
            <FieldLabel>Price per piece</FieldLabel>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <PriceBox label="With nut · no waste" val={calc.withNut_clean} tone="text-teal-800" />
              <PriceBox label="With nut · incl. waste" val={calc.withNut_waste} tone="text-amber-700" />
              <PriceBox label="Without nut · no waste" val={calc.noNut_clean} tone="text-teal-800" />
              <PriceBox label="Without nut · incl. waste" val={calc.noNut_waste} tone="text-amber-700" />
            </div>
            {Number(wastePct) > 0 && (
              <p className="text-xs text-slate-400 mt-3">“Incl. waste” loads {fmtNum(wastePct)}% rejected pieces (their material, nuts &amp; machine time) onto the good pieces.</p>
            )}
          </Card>

          {/* Breakdown */}
          <Card className="p-4">
            <FieldLabel>How it's built (per good piece)</FieldLabel>
            <div className="mt-2 text-sm space-y-1">
              <Row label={`Compound (${fmtNum(product.gPerPiece)} g)`} val={rupee(calc.compound)} />
              {calc.regrindSaving > 0 && (
                <Row label={`Regrind reused (−${fmtNum(regrindPct)}% of runner)`} val={`− ${rupee(calc.regrindSaving)}`} />
              )}
              {calc.masterbatch > 0 && <Row label="Masterbatch" val={rupee(calc.masterbatch)} />}
              <Row label="Nut / inserts" val={rupee(calc.nut)} />
              <Row label={`Job-work (₹${fmtNum(calc.shiftCost)}/shift ÷ ${fmtNum(calc.piecesPerShift)} pcs)`} val={rupee(calc.jobWork)} />
              <div className="border-t pt-1 mt-1">
                <Row label="Total with nut (no waste)" val={rupee(calc.withNut_clean)} bold />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {fmtNum(calc.cavities)} cavities × {fmtNum(shotsPerHr)} shots/hr × {fmtNum(shiftHrs)} hr = {fmtNum(calc.piecesPerShift)} pieces per shift.
            </p>
          </Card>
        </>
      )}
    </div>
  )
}

function PriceBox({ label, val, tone }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <div className={`text-2xl font-bold ${tone}`}>{rupee(val)}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

function Row({ label, val, bold }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`font-mono ${bold ? 'font-bold' : ''}`}>{val}</span>
    </div>
  )
}
