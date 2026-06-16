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
import { entryCosting, byId } from '../logic/costing'
import { QUICK_QTYS } from '../config'

export default function NewProduction() {
  const { molders, products, masters, createEntry } = usePlastic()
  const { msg, show } = useToast()

  const [date, setDate] = useState(todayStr())
  const [molderId, setMolderId] = useState(molders[0]?.id || '')
  const [shifts, setShifts] = useState('1')
  const [items, setItems] = useState([{ productId: products[0]?.id || '', pieces: '', rejects: '' }])
  const [runnerKg, setRunnerKg] = useState('')
  const [rejectsKg, setRejectsKg] = useState('')
  const [burntKg, setBurntKg] = useState('')
  const [finishedKg, setFinishedKg] = useState('')
  const [note, setNote] = useState('')

  const molderOpts = molders.map(m => ({ value: m.id, label: m.name }))
  const productOpts = products.map(p => ({ value: p.id, label: p.name }))

  const draft = useMemo(() => ({
    date, molderId, shifts: Number(shifts) || 0,
    items: items.map(it => ({ productId: it.productId, pieces: Number(it.pieces) || 0, rejects: Number(it.rejects) || 0 })),
    runnerKg: Number(runnerKg) || 0, rejectsKg: Number(rejectsKg) || 0,
    burntKg: Number(burntKg) || 0, finishedKg: Number(finishedKg) || 0, note,
  }), [date, molderId, shifts, items, runnerKg, rejectsKg, burntKg, finishedKg, note])

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
  const addItem = () => setItems([...items, { productId: products[0]?.id || '', pieces: '', rejects: '' }])
  const removeItem = (i) => setItems(items.filter((_, j) => j !== i))

  const totalPieces = costing.totalGoodPieces
  const canSave = molderId && totalPieces > 0

  const save = () => {
    if (!canSave) { show('Pick a molder and enter pieces', 2500); return }
    createEntry(draft)
    show('✅ Production saved', 2000)
    setItems([{ productId: products[0]?.id || '', pieces: '', rejects: '' }])
    setRunnerKg(''); setRejectsKg(''); setBurntKg(''); setFinishedKg(''); setNote('')
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
          <FieldLabel>Shifts worked (₹/shift fixed)</FieldLabel>
          <NumberStepper value={shifts} onChange={setShifts} />
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
            <FieldLabel className="text-xs">Rejects (returned as scrap)</FieldLabel>
            <NumberInput value={it.rejects} onChange={e => setItem(i, { rejects: e.target.value })} placeholder="0" className="mt-1" />
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

      {/* Live cost preview */}
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

      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)"
        className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-base" rows={2} />

      <Button variant="success" size="lg" className="w-full" disabled={!canSave} onClick={save}>
        Save Production
      </Button>
    </div>
  )
}
