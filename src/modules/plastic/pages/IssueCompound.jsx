/**
 * Issue Material — record compound / masterbatch / nuts handed to a molder
 * (bulk or per-job). Feeds the molder's running material balance.
 */
import { useState } from 'react'
import { usePlastic } from '../PlasticContext'
import {
  Button, Card, FieldLabel, Select, NumberInput, DateInput, useToast, Toast,
} from '../../../core/ui'
import { todayStr, fmtNum } from '../../../core/utils/format'
import { molderBalance } from '../logic/reconcile'
import { byId } from '../logic/costing'

export default function IssueCompound() {
  const { molders, compounds, masterbatch, inserts, masters, issues, log } = usePlastic()
  const { msg, show } = useToast()

  const [date, setDate] = useState(todayStr())
  const [molderId, setMolderId] = useState(molders[0]?.id || '')
  const [compoundId, setCompoundId] = useState(compounds[0]?.id || '')
  const [compoundKg, setCompoundKg] = useState('')
  const [mbId, setMbId] = useState('')
  const [mbKg, setMbKg] = useState('')
  const [insertId, setInsertId] = useState('')
  const [nutQty, setNutQty] = useState('')
  const [note, setNote] = useState('')

  const molderOpts = molders.map(m => ({ value: m.id, label: m.name }))
  const compoundOpts = compounds.map(c => ({ value: c.id, label: `${c.name} · ₹${c.rate}/kg` }))
  const mbOpts = [{ value: '', label: '— none —' }, ...masterbatch.map(m => ({ value: m.id, label: m.name }))]
  const nutOpts = [{ value: '', label: '— none —' }, ...inserts.map(i => ({ value: i.id, label: `${i.name} · ₹${i.rate}` }))]

  const bal = molderId ? molderBalance(molderId, { issues: issues.list, production: [], products: masters.products }) : null

  const canSave = molderId && ((Number(compoundKg) || 0) > 0 || (Number(nutQty) || 0) > 0 || (Number(mbKg) || 0) > 0)

  const save = () => {
    if (!canSave) { show('Enter a quantity to issue', 2500); return }
    issues.insert({
      date, molderId,
      compoundId, compoundKg: Number(compoundKg) || 0,
      mbId, mbKg: Number(mbKg) || 0,
      insertId, nutQty: Number(nutQty) || 0,
      note, voided: false, createdAt: new Date().toISOString(),
    })
    const m = byId(molders, molderId)
    log('ISSUE', `${m?.name || molderId} · ${fmtNum(compoundKg) || 0}kg · ${fmtNum(nutQty) || 0} nuts`)
    show('✅ Material issued', 2000)
    setCompoundKg(''); setMbKg(''); setNutQty(''); setNote('')
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
      </Card>

      <Card className="p-4 space-y-3">
        <FieldLabel>Compound</FieldLabel>
        <Select options={compoundOpts} value={compoundId} onChange={e => setCompoundId(e.target.value)} />
        <div>
          <span className="text-xs text-slate-500">Compound weight (kg)</span>
          <NumberInput value={compoundKg} onChange={e => setCompoundKg(e.target.value)} placeholder="0" className="mt-1" />
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <FieldLabel>Masterbatch (optional)</FieldLabel>
        <Select options={mbOpts} value={mbId} onChange={e => setMbId(e.target.value)} />
        <div>
          <span className="text-xs text-slate-500">Masterbatch weight (kg)</span>
          <NumberInput value={mbKg} onChange={e => setMbKg(e.target.value)} placeholder="0" className="mt-1" />
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <FieldLabel>Nuts / Inserts (optional)</FieldLabel>
        <Select options={nutOpts} value={insertId} onChange={e => setInsertId(e.target.value)} />
        <div>
          <span className="text-xs text-slate-500">Nut quantity</span>
          <NumberInput value={nutQty} onChange={e => setNutQty(e.target.value)} placeholder="0" className="mt-1" />
        </div>
      </Card>

      {bal && (
        <Card className="p-4 bg-slate-50">
          <FieldLabel>Currently with this molder</FieldLabel>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-slate-600">Compound balance</span>
            <span className="font-mono font-bold">{fmtNum(bal.balanceKg)} kg</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Nuts balance</span>
            <span className="font-mono font-bold">{fmtNum(bal.nutBalance)}</span>
          </div>
        </Card>
      )}

      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)"
        className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-base" rows={2} />

      <Button variant="success" size="lg" className="w-full" disabled={!canSave} onClick={save}>
        Issue Material
      </Button>
    </div>
  )
}
