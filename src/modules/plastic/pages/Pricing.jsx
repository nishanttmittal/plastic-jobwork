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
  const [limitRegrind, setLimitRegrind] = useState(true)   // ON = cap reuse at safe blend
  const [blendLimit, setBlendLimit] = useState('20')       // safe blend % (15–20 typical)
  const [targetPrice, setTargetPrice] = useState('')       // reverse: desired ₹/piece
  const [targetWithNut, setTargetWithNut] = useState('1')  // '1' incl nut, '0' without

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
    // Quality cap: regrind weakens the part, so blend is usually held to ~15–20%.
    // Owner can keep the cap ON (locked to the safe blend) or switch it OFF to override.
    const reuseInput = Math.max(0, Number(regrindPct) || 0)
    const limit = Math.max(0, Number(blendLimit) || 0)
    const effReusePct = limitRegrind ? Math.min(reuseInput, limit) : reuseInput
    const capped = limitRegrind && reuseInput > limit
    const R = Math.min(1, effReusePct / 100)
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
      effReusePct, capped,
      masterbatch: mat.masterbatch, nut: mat.nut,
      withNut_clean, noNut_clean,
      withNut_waste: f > 0 ? withNut_clean / f : 0,
      noNut_waste: f > 0 ? noNut_clean / f : 0,
    }
  }, [product, molder, masters, shotsPerHr, shiftHrs, wastePct, regrindPct, limitRegrind, blendLimit])

  // Reverse: target price/piece → the shift cost it implies (everything else held).
  const rev = useMemo(() => {
    const t = Number(targetPrice) || 0
    if (!calc || t <= 0) return null
    const material = (calc.compoundEff + calc.masterbatch) + (targetWithNut === '1' ? calc.nut : 0)
    const jwPiece = t - material
    const shiftIncl = jwPiece * calc.piecesPerShift
    const gstMult = molder?.gst ? (1 + (Number(molder.gstPct) || 0) / 100) : 1
    return { t, material, jwPiece, shiftIncl, shiftBeforeGst: shiftIncl / gstMult, ok: jwPiece >= 0, gst: !!molder?.gst }
  }, [calc, targetPrice, targetWithNut, molder])

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

        {/* Quality cap — owner's switch: keep regrind blend capped, or override */}
        <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-700">Cap regrind at safe blend</div>
            <div className="text-xs text-slate-400">Protects strength — limit reuse to a safe % (15–20 typical)</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {limitRegrind && (
              <div className="w-16">
                <NumberInput value={blendLimit} onChange={e => setBlendLimit(e.target.value)} className="!py-1 text-center" />
              </div>
            )}
            <button
              onClick={() => setLimitRegrind(v => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${limitRegrind ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'}`}
            >
              {limitRegrind ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
        {calc?.capped && (
          <p className="text-xs text-amber-600">
            Reuse capped at {fmtNum(blendLimit)}% (you entered {fmtNum(regrindPct)}%). Turn the cap OFF to override.
          </p>
        )}
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
                <Row label={`Regrind reused (${fmtNum(calc.effReusePct)}% of runner${calc.capped ? ', capped' : ''})`} val={`− ${rupee(calc.regrindSaving)}`} />
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

          {/* Reverse — target price → required shift cost */}
          <Card className="p-4">
            <FieldLabel>Reverse — target price → shift cost</FieldLabel>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-slate-500">Target ₹/piece</span>
                <NumberInput value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder="e.g. 5.70" className="mt-1" />
              </div>
              <div>
                <span className="text-xs text-slate-500">Target is</span>
                <Select className="mt-1" value={targetWithNut} onChange={e => setTargetWithNut(e.target.value)}
                  options={[{ value: '1', label: 'with nut' }, { value: '0', label: 'without nut' }]} />
              </div>
            </div>
            {rev && (
              rev.ok ? (
                <div className="mt-3 bg-rose-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-rose-700">≤ {rupee(rev.shiftBeforeGst)} / shift</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    to hit {rupee(rev.t)} {targetWithNut === '1' ? 'with' : 'without'} nut
                    {rev.gst ? ` (₹${rev.shiftIncl.toFixed(0)} incl GST)` : ''} · job-work ≤ {rupee(rev.jwPiece)}/pc
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-red-600 text-center">
                  {rupee(rev.t)} is below the material cost ({rupee(rev.material)}) — impossible at this rate even with a free shift.
                </p>
              )
            )}
            <p className="text-xs text-slate-400 mt-2">Holds material, nut &amp; output constant; tells you the most the moulding shift can cost.</p>
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
