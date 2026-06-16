/**
 * Molder Hisab — per-molder money: dues (job work), advances, payments, balance.
 * Add a payment/advance and share a PDF statement.
 */
import { useState } from 'react'
import { usePlastic } from '../PlasticContext'
import {
  Button, Card, FieldLabel, Select, NumberInput, DateInput, useToast, Toast,
} from '../../../core/ui'
import { todayStr, fmtNum, fmtDate } from '../../../core/utils/format'
import { molderHisab, buildHisabPdf } from '../logic/hisab'
import { jobWorkTotal, byId } from '../logic/costing'

export default function Hisab() {
  const { molders, masters, production, payments, log } = usePlastic()
  const { msg, show } = useToast()

  const [molderId, setMolderId] = useState(molders[0]?.id || '')
  const [date, setDate] = useState(todayStr())
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState('payment')
  const [note, setNote] = useState('')

  const data = { production: production.list, payments: payments.list }
  const h = molderId ? molderHisab(molderId, masters, data) : null
  const molder = byId(molders, molderId)

  const entries = production.list.filter(e => e.molderId === molderId && !e.voided)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  const pays = payments.list.filter(p => p.molderId === molderId && !p.voided)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const addPayment = () => {
    if (!molderId || !(Number(amount) > 0)) { show('Enter an amount', 2000); return }
    payments.insert({ date, molderId, amount: Number(amount), kind, note, voided: false, createdAt: new Date().toISOString() })
    log('PAYMENT', `${molder?.name || molderId} · ${kind} ₹${fmtNum(amount)}`)
    show('✅ Saved', 1500); setAmount(''); setNote('')
  }

  const sharePdf = () => {
    const doc = buildHisabPdf(molderId, masters, data)
    doc.save(`Hisab-${(molder?.name || 'molder').replace(/\s+/g, '_')}.pdf`)
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <Toast msg={msg} />

      <Card className="p-4">
        <FieldLabel>Molder</FieldLabel>
        <Select className="mt-1" options={molders.map(m => ({ value: m.id, label: m.name }))}
          value={molderId} onChange={e => setMolderId(e.target.value)} />
      </Card>

      {h && (
        <Card className="p-4 space-y-2">
          <Line label="Total dues (job work)" val={h.dues} />
          <Line label="Advances given" val={h.advances} />
          <Line label="Payments made" val={h.payments} />
          <div className="border-t pt-2 flex justify-between font-bold text-lg">
            <span>{h.balance >= 0 ? 'Balance payable' : 'Molder owes us'}</span>
            <span className={h.balance >= 0 ? 'text-emerald-700' : 'text-red-600'}>₹{fmtNum(Math.abs(h.balance))}</span>
          </div>
          <Button variant="primary" className="w-full mt-2" onClick={sharePdf}>📄 Download / Share PDF</Button>
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <FieldLabel>Add payment / advance</FieldLabel>
        <DateInput value={date} onChange={e => setDate(e.target.value)} />
        <Select options={[{ value: 'payment', label: 'Payment' }, { value: 'advance', label: 'Advance' }]}
          value={kind} onChange={e => setKind(e.target.value)} />
        <NumberInput value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount ₹" />
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)"
          className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-base" />
        <Button variant="success" className="w-full" onClick={addPayment}>Save</Button>
      </Card>

      <Card className="p-4">
        <FieldLabel>Production (job work)</FieldLabel>
        <div className="mt-2 divide-y">
          {entries.length === 0 && <p className="text-sm text-slate-400">No production yet.</p>}
          {entries.map(e => {
            const pcs = (e.items || []).reduce((s, it) => s + (Number(it.pieces) || 0), 0)
            return (
              <div key={e.id} className="flex justify-between py-2 text-sm">
                <span className="text-slate-600">{e.entryNo} · {fmtDate(e.date)} · {fmtNum(pcs)} pcs</span>
                <span className="font-mono">₹{fmtNum(jobWorkTotal(e, molder))}</span>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-4">
        <FieldLabel>Payments</FieldLabel>
        <div className="mt-2 divide-y">
          {pays.length === 0 && <p className="text-sm text-slate-400">None yet.</p>}
          {pays.map(p => (
            <div key={p.id} className="flex justify-between py-2 text-sm">
              <span className="text-slate-600">{fmtDate(p.date)} · {p.kind}{p.note ? ` · ${p.note}` : ''}</span>
              <span className="font-mono">₹{fmtNum(p.amount)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Line({ label, val }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-mono font-semibold">₹{fmtNum(val)}</span>
    </div>
  )
}
