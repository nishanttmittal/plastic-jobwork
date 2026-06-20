/**
 * Home — the morning glance. Shows what needs attention first (alerts), what's
 * sitting with molders to collect, the money position, then today/month output.
 * No data dumps — the detailed 15-day tables live under More → Report.
 */
import { useMemo } from 'react'
import { usePlastic } from '../PlasticContext'
import { Card } from '../../../core/ui'
import { todayStr, fmtNum } from '../../../core/utils/format'
import { allMolderBalances } from '../logic/reconcile'
import { molderHisab } from '../logic/hisab'

export default function Home({ owner, onOpen }) {
  const { production, issues, returns, payments, masters } = usePlastic()

  const today = todayStr()
  const piecesToday = useMemo(() => production.list
    .filter(e => e.date === today && !e.voided)
    .reduce((s, e) => s + (e.items || []).reduce((a, it) => a + (Number(it.pieces) || 0), 0), 0),
  [production.list, today])

  const m = new Date().getMonth(), y = new Date().getFullYear()
  const monthPieces = useMemo(() => production.list
    .filter(e => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y && !e.voided })
    .reduce((s, e) => s + (e.items || []).reduce((a, it) => a + (Number(it.pieces) || 0), 0), 0),
  [production.list, m, y])

  const balances = useMemo(
    () => allMolderBalances(masters, { production: production.list, issues: issues.list, returns: returns.list }),
    [masters, production.list, issues.list, returns.list],
  )

  const collect = useMemo(() => balances.reduce((a, b) => ({
    pieces: a.pieces + Math.max(0, b.pendingPieces || 0),
    nuts: a.nuts + Math.max(0, b.nutBalance || 0),
    kg: a.kg + Math.max(0, b.balanceKg || 0),
  }), { pieces: 0, nuts: 0, kg: 0 }), [balances])

  const alerts = balances.filter(b => b.flag)

  const money = useMemo(() => {
    if (!owner) return null
    return balances.reduce((s, b) => s + molderHisab(b.molderId, masters, { production: production.list, payments: payments.list }).balance, 0)
  }, [owner, balances, masters, production.list, payments.list])

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Alerts */}
      {alerts.length > 0 && (
        <button onClick={() => onOpen && onOpen('moulders')} className="w-full text-left">
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="font-bold text-red-700">🚩 {alerts.length} material alert{alerts.length > 1 ? 's' : ''}</div>
            <div className="text-sm text-red-600 mt-1">
              {alerts.map(a => a.molder?.name || 'molder').join(', ')} — used more than issued. Tap to check.
            </div>
          </Card>
        </button>
      )}

      {/* To collect from molders */}
      <Card className="p-4">
        <div className="text-xs font-bold text-slate-400 uppercase">To collect from molders</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Tile n={fmtNum(collect.pieces)} l="pieces pending" />
          <Tile n={fmtNum(collect.nuts)} l="loose nuts" />
          <Tile n={`${fmtNum(collect.kg)} kg`} l="material" />
        </div>
      </Card>

      {/* Output */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-teal-700">{fmtNum(piecesToday)}</div>
          <div className="text-xs text-slate-500 mt-1">Pieces today</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-slate-700">{fmtNum(monthPieces)}</div>
          <div className="text-xs text-slate-500 mt-1">Pieces this month</div>
        </Card>
      </div>

      {/* Money (owner) */}
      {owner && money != null && (
        <button onClick={() => onOpen && onOpen('moulders')} className="w-full text-left">
          <Card className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase">{money >= 0 ? 'You owe molders' : 'Molders owe you'}</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">₹{fmtNum(Math.abs(money))}</div>
            </div>
            <span className="text-slate-300 text-xl">›</span>
          </Card>
        </button>
      )}

      <p className="text-center text-xs text-slate-400">Detailed 15-day material &amp; rejection report is under More → Report.</p>
    </div>
  )
}

function Tile({ n, l }) {
  return (
    <div className="bg-slate-50 rounded-xl py-3">
      <div className="text-lg font-bold text-slate-800">{n}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{l}</div>
    </div>
  )
}
