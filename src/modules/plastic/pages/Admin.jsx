/**
 * Admin — password-gated tools: backup / restore (JSON), recent activity log,
 * void entries, and a guarded reset. Keeps history safe (void, not delete).
 */
import { useState } from 'react'
import { usePlastic } from '../PlasticContext'
import { Button, Card, FieldLabel } from '../../../core/ui'
import { fmtDate, fmtNum } from '../../../core/utils/format'
import { ADMIN_PASSWORD } from '../config'

export default function Admin() {
  const ctx = usePlastic()
  const { production, issues, payments, logs, masters, log } = ctx
  const [ok, setOk] = useState(false)
  const [pw, setPw] = useState('')

  if (!ok) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <Card className="p-6 space-y-3 text-center">
          <div className="text-3xl">🔒</div>
          <FieldLabel>Admin password</FieldLabel>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)}
            className="w-full border-2 border-slate-300 rounded-2xl px-4 py-3 text-center text-lg" />
          <Button className="w-full" onClick={() => setOk(pw === ADMIN_PASSWORD)}>Unlock</Button>
          {pw && pw !== ADMIN_PASSWORD && <p className="text-red-500 text-sm">Wrong password</p>}
        </Card>
      </div>
    )
  }

  const backup = () => {
    const blob = {
      app: 'plastic-jobwork', exportedAt: new Date().toISOString(),
      production: production.list, issues: issues.list, payments: payments.list,
      logs: logs.list, masters,
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(blob, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url; a.download = `plastic-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
    log('BACKUP', 'Downloaded JSON backup', 'admin')
  }

  const restore = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result)
        if (!confirm('Restore will REPLACE all current data with the backup. Continue?')) return
        if (Array.isArray(d.production)) production.replaceAll(d.production)
        if (Array.isArray(d.issues)) issues.replaceAll(d.issues)
        if (Array.isArray(d.payments)) payments.replaceAll(d.payments)
        if (d.masters) {
          ctx.setCompounds(d.masters.compounds || [])
          ctx.setMasterbatch(d.masters.masterbatch || [])
          ctx.setInserts(d.masters.inserts || [])
          ctx.setMolders(d.masters.molders || [])
          ctx.setProducts(d.masters.products || [])
        }
        log('RESTORE', `Restored from ${file.name}`, 'admin')
        alert('✅ Restored. Refresh if anything looks stale.')
      } catch { alert('Invalid backup file') }
    }
    reader.readAsText(file)
  }

  const voidEntry = (id) => {
    const reason = prompt('Reason for voiding this entry?'); if (reason == null) return
    production.update(id, { voided: true, voidReason: reason })
    log('VOID', `Voided ${id}: ${reason}`, 'admin')
  }

  const resetAll = () => {
    if (!confirm('⚠️ This clears ALL production, issues and payments (masters kept). Sure?')) return
    if (!confirm('This cannot be undone. Confirm again.')) return
    production.replaceAll([]); issues.replaceAll([]); payments.replaceAll([])
    log('RESET', 'Cleared all transactions', 'admin')
  }

  const recent = [...production.list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 10)
  const recentLogs = [...logs.list].sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 20)

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <Card className="p-4 space-y-3">
        <FieldLabel>Backup & Restore</FieldLabel>
        <Button className="w-full" onClick={backup}>⬇️ Download backup (JSON)</Button>
        <label className="block">
          <span className="text-sm text-slate-500">Restore from backup</span>
          <input type="file" accept="application/json" onChange={restore} className="mt-1 w-full text-sm" />
        </label>
      </Card>

      <Card className="p-4">
        <FieldLabel>Recent production (void if wrong)</FieldLabel>
        <div className="mt-2 divide-y">
          {recent.length === 0 && <p className="text-sm text-slate-400">None yet.</p>}
          {recent.map(e => {
            const pcs = (e.items || []).reduce((s, it) => s + (Number(it.pieces) || 0), 0)
            return (
              <div key={e.id} className="flex justify-between items-center py-2 text-sm">
                <span className={e.voided ? 'line-through text-slate-400' : 'text-slate-600'}>
                  {e.entryNo} · {fmtDate(e.date)} · {fmtNum(pcs)} pcs · ₹{fmtNum(e.costSnapshot?.grandTotal || 0)}
                </span>
                {!e.voided && <button onClick={() => voidEntry(e.id)} className="text-red-500 text-xs font-bold">Void</button>}
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-4">
        <FieldLabel>Activity log</FieldLabel>
        <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
          {recentLogs.map((l, i) => (
            <div key={i} className="text-xs text-slate-500">
              <span className="font-mono">{(l.ts || '').slice(0, 16).replace('T', ' ')}</span> · <b>{l.action}</b> · {l.detail}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 border border-red-200">
        <FieldLabel className="text-red-600">Danger zone</FieldLabel>
        <Button variant="danger" className="w-full mt-2" onClick={resetAll}>Clear all transactions</Button>
      </Card>
    </div>
  )
}
