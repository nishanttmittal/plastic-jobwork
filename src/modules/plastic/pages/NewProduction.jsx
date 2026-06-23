/**
 * New Production — record one molding run (date + molder + shift(s) + the
 * products returned), with live cost-per-piece preview and loss capture.
 */
import { useState, useMemo } from 'react'
import { usePlastic } from '../PlasticContext'
import {
  Button, Card, FieldLabel, Select, NumberInput, DateInput, NumberStepper, useToast, Toast,
} from '../../../core/ui'
import { todayStr, fmtNum } from '../../../core/utils/format'
import { entryCosting, byId, jobWorkTotal } from '../logic/costing'
import { lotsForMolder, runEfficiency } from '../logic/lot'
import { QUICK_QTYS, REJECT_REASONS } from '../config'

export default function NewProduction({ owner }) {
  const { molders, products, masters, createEntry, issues } = usePlastic()
  const { msg, show } = useToast()

  const [date, setDate] = useState(todayStr())
  const [molderId, setMolderId] = useState(molders[0]?.id || '')
  const [lotNo, setLotNo] = useState('')
  const [shifts, setShifts] = useState('1')
  const [hours, setHours] = useState('')
  const [machineShots, setMachineShots] = useState('')
  const [items, setItems] = useState([{ productId: products[0]?.id || '', pieces: '', rejectRows: [] }])
  const [runnerKg, setRunnerKg] = useState('')
  const [rejectsKg, setRejectsKg] = useState('')
  const [burntKg, setBurntKg] = useState('')
  const [finishedKg, setFinishedKg] = useState('')
  const [note, setNote] = useState('')

  const molderOpts = molders.map(m => ({ value: m.id, label: m.name }))
  const productOpts = products.map(p => ({ value: p.id, label: p.name }))

  // rejectRows = [{reason, qty}]; the total reject count (it.rejects) is the
  // sum, kept for costing/reconciliation which read items[].rejects unchanged.
  const rowsTotal = (rows) => (rows || []).reduce((s, r) => s + (Number(r.qty) || 0), 0)

  const draft = useMemo(() => ({
    date, molderId, lotNo, shifts: Number(shifts) || 0, hours: Number(hours) || 0, machineShots: Number(machineShots) || 0,
    items: items.map(it => {
      const rejectRows = (it.rejectRows || [])
        .map(r => ({ reason: r.reason || '', qty: Number(r.qty) || 0 }))
        .filter(r => r.qty > 0)
      return { productId: it.productId, pieces: Number(it.pieces) || 0, rejects: rowsTotal(rejectRows), rejectRows }
    }),
    runnerKg: Number(runnerKg) || 0, rejectsKg: Number(rejectsKg) || 0,
    burntKg: Number(burntKg) || 0, finishedKg: Number(finishedKg) || 0, note,
  }), [date, molderId, lotNo, shifts, hours, machineShots, items, runnerKg, rejectsKg, burntKg, finishedKg, note])

  // Machine shot counter cross-check: pieces = shots × cavities is the output
  // the machine itself logged. Flag if the entered pieces (good + rejects)
  // don't match what the machine ran.
  const shotCheck = useMemo(() => {
    const shots = Number(machineShots) || 0
    const primary = byId(products, draft.items[0]?.productId)
    const cavities = Number(primary?.cavities) || 0
    if (shots <= 0 || cavities <= 0) return null
    const expected = shots * cavities
    const made = draft.items.reduce((s, it) => s + (Number(it.pieces) || 0) + (Number(it.rejects) || 0), 0)
    const off = Math.abs(expected - made) > Math.max(5, expected * 0.02)
    return { shots, cavities, expected, made, off }
  }, [machineShots, draft.items, products])

  const costing = useMemo(() => entryCosting(draft, masters), [draft, masters])

  // Accuracy cross-check: expected finished weight vs entered.
  const expectedKg = useMemo(() => {
    let g = 0
    for (const it of draft.items) {
      const p = byId(products, it.productId)
      g += (Number(it.pieces) || 0) * (Number(p?.finishedPieceG) || 0)
    }
    return g / 1000
  }, [draft.items, products])
  const weightGap = finishedKg && expectedKg ? (Number(finishedKg) - expectedKg) : 0
  const weightOff = expectedKg > 0 && finishedKg && Math.abs(weightGap) > expectedKg * 0.05

  const setItem = (i, patch) => setItems(items.map((it, j) => j === i ? { ...it, ...patch } : it))
  const addItem = () => setItems([...items, { productId: products[0]?.id || '', pieces: '', rejectRows: [] }])
  const removeItem = (i) => setItems(items.filter((_, j) => j !== i))

  // Reject reason rows (per product): each = { reason, qty }.
  const addRejectRow = (i) => setItem(i, { rejectRows: [...(items[i].rejectRows || []), { reason: '', qty: '' }] })
  const setRejectRow = (i, k, patch) => setItem(i, {
    rejectRows: (items[i].rejectRows || []).map((r, j) => j === k ? { ...r, ...patch } : r),
  })
  const removeRejectRow = (i, k) => setItem(i, { rejectRows: (items[i].rejectRows || []).filter((_, j) => j !== k) })

  const totalPieces = costing.totalGoodPieces
  const canSave = molderId && totalPieces > 0

  const save = () => {
    if (!canSave) { show('Pick a molder and enter pieces', 2500); return }
    createEntry(draft)
    show('✅ Production saved', 2000)
    setItems([{ productId: products[0]?.id || '', pieces: '', rejectRows: [] }])
    setRunnerKg(''); setRejectsKg(''); setBurntKg(''); setFinishedKg(''); setNote(''); setMachineShots(''); setHours('')
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <Toast msg={msg} />

      <Card className="p-4 space-y-3">
        <div>
          <FieldLabel>Date</FieldLabel>
          <DateInput value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
        </div>
        <div>
          <FieldLabel>Molder</FieldLabel>
          <Select options={molderOpts} value={molderId} onChange={e => setMolderId(e.target.value)} className="mt-1" />
        </div>
        <div>
          <FieldLabel>Lot (which material this is from)</FieldLabel>
          <Select className="mt-1" value={lotNo} onChange={e => setLotNo(e.target.value)}
            options={[{ value: '', label: '— none —' }, ...lotsForMolder(molderId, { issues: issues.list }).map(l => ({ value: l, label: l }))]} />
        </div>
        <div>
          <FieldLabel>Shifts worked (whole 12-hr shifts)</FieldLabel>
          <NumberStepper value={shifts} onChange={setShifts} />
        </div>
        <div>
          <FieldLabel>OR exact hours run (pro-rata pay)</FieldLabel>
          <NumberInput value={hours} onChange={e => setHours(e.target.value)} placeholder="e.g. 42.5" className="mt-1" />
          {(() => {
            const molder = byId(molders, molderId)
            const rate = Number(molder?.shiftRate) || 0
            const hrs = Number(hours) || 0
            if (!(hrs > 0 && rate > 0)) return null
            const amt = jobWorkTotal({ hours: hrs }, molder)
            return (
              <div className="mt-1 bg-teal-50 text-teal-800 rounded-xl px-3 py-2 text-sm font-semibold">
                💰 Payable: {fmtNum(hrs)} hrs ÷ 12 × ₹{fmtNum(rate)} = <b>₹{fmtNum(amt)}</b>
                <span className="font-normal text-teal-600"> ({(hrs / 12).toFixed(2)} shifts)</span>
              </div>
            )
          })()}
        </div>
        <div>
          <FieldLabel>Machine shots (from machine screen)</FieldLabel>
          <NumberInput value={machineShots} onChange={e => setMachineShots(e.target.value)} placeholder="0" className="mt-1" />
          {shotCheck && (
            <div className={`mt-1 text-sm rounded-xl px-3 py-2 ${shotCheck.off ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
              {shotCheck.off ? '⚠️' : '✓'} {fmtNum(shotCheck.shots)} shots × {shotCheck.cavities} = <b>{fmtNum(shotCheck.expected)}</b> pcs from machine
              {' '}vs {fmtNum(shotCheck.made)} entered{shotCheck.off ? ` — ${shotCheck.expected > shotCheck.made ? 'short by ' + fmtNum(shotCheck.expected - shotCheck.made) : 'over by ' + fmtNum(shotCheck.made - shotCheck.expected)}` : ' ✓ match'}
            </div>
          )}
          {(() => {
            const eff = runEfficiency(machineShots, hours, byId(products, draft.items[0]?.productId)?.cycleSec)
            if (!eff) return null
            const slow = eff.pct != null && eff.pct < 85
            return (
              <div className={`mt-1 text-sm rounded-xl px-3 py-2 ${slow ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-600'}`}>
                ⚙️ {fmtNum(eff.actualPerHr)} shots/hr{eff.targetPerHr > 0 && <> (target {fmtNum(eff.targetPerHr)})</>}
                {eff.pct != null && <> — <b>{fmtNum(eff.pct)}%</b> efficiency</>}
                {slow && <> · {fmtNum(eff.idleHours)} hr idle ≈ ₹{fmtNum(eff.idleHours * ((Number(byId(molders, molderId)?.shiftRate) || 0) / 12))} 🐢</>}
              </div>
            )
          })()}
        </div>
      </Card>

      {items.map((it, i) => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <FieldLabel>Product {i + 1}</FieldLabel>
            {items.length > 1 && (
              <button onClick={() => removeItem(i)} className="text-red-500 text-sm font-bold">Remove</button>
            )}
          </div>
          <Select options={productOpts} value={it.productId} onChange={e => setItem(i, { productId: e.target.value })} />
          <div>
            <FieldLabel className="text-xs">Good pieces</FieldLabel>
            <NumberStepper value={it.pieces} onChange={v => setItem(i, { pieces: v })} quickAdds={QUICK_QTYS} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <FieldLabel className="text-xs">Rejects by reason (QC, scrap)</FieldLabel>
              {rowsTotal(it.rejectRows) > 0 && (
                <span className="text-xs font-semibold text-slate-500">total {fmtNum(rowsTotal(it.rejectRows))}</span>
              )}
            </div>
            {(it.rejectRows || []).map((r, k) => (
              <div key={k} className="flex gap-2 mt-2 items-center">
                <Select
                  className="flex-1"
                  options={[{ value: '', label: 'Reason…' }, ...REJECT_REASONS]}
                  value={r.reason}
                  onChange={e => setRejectRow(i, k, { reason: e.target.value })}
                />
                <NumberInput
                  className="w-24"
                  value={r.qty}
                  placeholder="qty"
                  onChange={e => setRejectRow(i, k, { qty: e.target.value })}
                />
                <button onClick={() => removeRejectRow(i, k)} className="text-red-500 font-bold px-2 text-lg">✕</button>
              </div>
            ))}
            <button onClick={() => addRejectRow(i)} className="text-teal-600 text-sm font-semibold mt-2">＋ Add reject reason</button>
          </div>
        </Card>
      ))}
      <Button variant="ghost" className="w-full" onClick={addItem}>＋ Add another product (same shift)</Button>

      <Card className="p-4 space-y-3">
        <FieldLabel>Material returned / lost (kg)</FieldLabel>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-slate-500">Runner returned</span>
            <NumberInput value={runnerKg} onChange={e => setRunnerKg(e.target.value)} placeholder="0" />
          </div>
          <div>
            <span className="text-xs text-slate-500">Rejects returned</span>
            <NumberInput value={rejectsKg} onChange={e => setRejectsKg(e.target.value)} placeholder="0" />
          </div>
          <div>
            <span className="text-xs text-slate-500">Burnt / purge (my loss)</span>
            <NumberInput value={burntKg} onChange={e => setBurntKg(e.target.value)} placeholder="0" />
          </div>
          <div>
            <span className="text-xs text-slate-500">Finished weight (check)</span>
            <NumberInput value={finishedKg} onChange={e => setFinishedKg(e.target.value)} placeholder="0" />
          </div>
        </div>
        {weightOff && (
          <div className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm font-semibold">
            ⚠️ Weight check: entered {fmtNum(finishedKg)} kg vs expected ~{expectedKg.toFixed(1)} kg
            ({weightGap > 0 ? '+' : ''}{weightGap.toFixed(1)} kg). Re-verify pieces/weighing.
          </div>
        )}
      </Card>

      {/* Live cost preview (owner only — managers don't see money) */}
      {owner && (
      <Card className="p-4 bg-teal-50 border border-teal-200">
        <FieldLabel className="text-teal-700">Cost preview (live)</FieldLabel>
        <div className="mt-2 space-y-2">
          {costing.perProduct.map((p, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="font-semibold text-slate-700">{p.name} × {fmtNum(p.pieces)}</span>
              <span className="font-mono font-bold text-teal-800">₹{p.costPerPiece.toFixed(2)}/pc</span>
            </div>
          ))}
          <div className="border-t border-teal-200 pt-2 flex justify-between text-sm">
            <span className="text-slate-600">Job work {fmtNum(costing.jobWork)} ÷ {fmtNum(totalPieces)} pcs</span>
            <span className="font-mono text-slate-700">₹{costing.jobWorkPerPiece.toFixed(2)}/pc</span>
          </div>
          <div className="flex justify-between font-bold text-base">
            <span>Total batch cost</span>
            <span className="text-teal-800">₹{fmtNum(costing.grandTotal)}</span>
          </div>
        </div>
      </Card>
      )}

      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)"
        className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-base" rows={2} />

      <Button variant="success" size="lg" className="w-full" disabled={!canSave} onClick={save}>
        Save Production
      </Button>
    </div>
  )
}
