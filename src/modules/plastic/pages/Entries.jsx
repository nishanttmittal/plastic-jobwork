/**
 * Entries — a single chronological list of EVERYTHING entered: material issued,
 * production recorded, and material returned. This is the "did my entry save?"
 * screen. Owner can Void an entry (soft-delete: kept in history, reason logged,
 * never hard-deleted) per the app's audit policy.
 */
import { useMemo, useState } from 'react'
import { usePlastic } from '../PlasticContext'
import { Card, FieldLabel, Select } from '../../../core/ui'
import { fmtDate, fmtNum } from '../../../core/utils/format'
import { byId } from '../logic/costing'

const TYPE_META = {
  issue:      { label: 'Issued',     icon: '📦', color: 'bg-cyan-100 text-cyan-700' },
  production: { label: 'Production', icon: '➕', color: 'bg-emerald-100 text-emerald-700' },
  return:     { label: 'Returned',   icon: '↩️', color: 'bg-amber-100 text-amber-700' },
}

export default function Entries({ owner }) {
  const { production, issues, returns, molders, masters, log } = usePlastic()
  const [filter, setFilter] = useState('all')

  const rows = useMemo(() => {
    const mName = (id) => byId(molders, id)?.name || '(molder)'
    const list = []

    for (const e of issues.list) {
      const bits = []
      if (Number(e.compoundKg) > 0) bits.push(`${fmtNum(e.compoundKg)} kg compound`)
      if (Number(e.mbKg) > 0) bits.push(`${fmtNum(e.mbKg)} kg MB`)
      if (Number(e.nutQty) > 0) bits.push(`${fmtNum(e.nutQty)} nuts`)
      list.push({ kind: 'issue', id: e.id, date: e.date, molder: mName(e.molderId),
        title: bits.join(' · ') || 'issue', voided: !!e.voided, ref: issues, raw: e })
    }
    for (const e of production.list) {
      const pcs = (e.items || []).reduce((s, it) => s + (Number(it.pieces) || 0), 0)
      const names = (e.items || []).map(it => `${byId(masters.products, it.productId)?.name || 'product'} ${fmtNum(it.pieces)}`).join(', ')
      list.push({ kind: 'production', id: e.id, date: e.date, molder: mName(e.molderId),
        title: `${e.entryNo ? e.entryNo + ' · ' : ''}${names || fmtNum(pcs) + ' pcs'}`, voided: !!e.voided, ref: production, raw: e })
    }
    for (const e of returns.list) {
      const bits = []
      if (Number(e.compoundKg) > 0) bits.push(`${fmtNum(e.compoundKg)} kg compound`)
      if (Number(e.regrindKg) > 0) bits.push(`${fmtNum(e.regrindKg)} kg regrind`)
      if (Number(e.nutQty) > 0) bits.push(`${fmtNum(e.nutQty)} nuts`)
      list.push({ kind: 'return', id: e.id, date: e.date, molder: mName(e.molderId),
        title: bits.join(' · ') || 'return', voided: !!e.voided, ref: returns, raw: e })
    }

    list.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1
      return (b.raw.createdAt || '').localeCompare(a.raw.createdAt || '')
    })
    return list
  }, [issues.list, production.list, returns.list, molders, masters.products])

  const shown = filter === 'all' ? rows : rows.filter(r => r.kind === filter)

  const voidEntry = (r) => {
    if (!owner) return
    const reason = window.prompt(`Void this ${TYPE_META[r.kind].label} entry for ${r.molder}?\nType a reason:`)
    if (reason === null) return
    if (!reason.trim()) { window.alert('Reason required to void.'); return }
    r.ref.update(r.id, { voided: true, voidReason: reason.trim() })
    log('VOID', `${TYPE_META[r.kind].label} · ${r.molder} · ${r.title} · ${reason.trim()}`, owner ? 'owner' : 'user')
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-3">
      <Card className="p-3">
        <FieldLabel>Show</FieldLabel>
        <Select value={filter} onChange={e => setFilter(e.target.value)} className="mt-1"
          options={[
            { value: 'all', label: 'All entries' },
            { value: 'issue', label: 'Issued material' },
            { value: 'production', label: 'Production' },
            { value: 'return', label: 'Returned material' },
          ]} />
      </Card>

      {shown.length === 0 && (
        <Card className="p-6 text-center text-slate-400">No entries yet.</Card>
      )}

      {shown.map(r => {
        const t = TYPE_META[r.kind]
        return (
          <Card key={r.kind + r.id} className={`p-3 ${r.voided ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.color}`}>{t.icon} {t.label}</span>
                  <span className="text-xs text-slate-400">{fmtDate(r.date)}</span>
                  {r.voided && <span className="text-[10px] font-bold text-red-500">VOIDED</span>}
                </div>
                <div className={`font-semibold text-slate-700 text-sm mt-1 ${r.voided ? 'line-through' : ''}`}>{r.molder}</div>
                <div className="text-xs text-slate-500">{r.title}</div>
              </div>
              {owner && !r.voided && (
                <button onClick={() => voidEntry(r)}
                  className="shrink-0 text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5">Void</button>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
