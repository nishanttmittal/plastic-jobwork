/**
 * Dashboard — cost per piece, molder balances + reconciliation flags, today's
 * output, and the "should I buy the machine?" break-even indicator.
 */
import { useMemo } from 'react'
import { usePlastic } from '../PlasticContext'
import { Card, FieldLabel } from '../../../core/ui'
import { todayStr, daysAgoStr, fmtNum } from '../../../core/utils/format'
import { productMaterialCost } from '../logic/costing'
import { allMolderBalances } from '../logic/reconcile'
import { molderHisab } from '../logic/hisab'
import { MACHINE_ECONOMICS } from '../config'

export default function Dashboard({ owner }) {
  const { production, issues, payments, masters, products } = usePlastic()

  const data = { production: production.list, issues: issues.list, payments: payments.list }

  const today = todayStr()
  const piecesToday = useMemo(() => production.list
    .filter(e => e.date === today && !e.voided)
    .reduce((s, e) => s + (e.items || []).reduce((a, it) => a + (Number(it.pieces) || 0), 0), 0),
  [production.list, today])

  const m = new Date().getMonth(), y = new Date().getFullYear()
  const monthEntries = production.list.filter(e => {
    const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y && !e.voided
  })
  const monthPieces = monthEntries.reduce((s, e) => s + (e.items || []).reduce((a, it) => a + (Number(it.pieces) || 0), 0), 0)

  // Latest actual cost/piece per product (from cost snapshots).
  const lastCost = useMemo(() => {
    const map = {}
    const sorted = [...production.list].filter(e => !e.voided).sort((a, b) => (a.date < b.date ? 1 : -1))
    for (const e of sorted) {
      for (const p of (e.costSnapshot?.perProduct || [])) {
        if (map[p.productId] == null) map[p.productId] = p.costPerPiece
      }
    }
    return map
  }, [production.list])

  // Last 15 days — raw material in/out and final product (no money; manager-safe).
  const since15 = daysAgoStr(15)
  const last15 = useMemo(() => {
    const iss = issues.list.filter(i => !i.voided && i.date >= since15)
    const prod = production.list.filter(e => !e.voided && e.date >= since15)
    const rawOut = {
      compoundKg: iss.reduce((s, i) => s + (Number(i.compoundKg) || 0), 0),
      mbKg: iss.reduce((s, i) => s + (Number(i.mbKg) || 0), 0),
      nuts: iss.reduce((s, i) => s + (Number(i.nutQty) || 0), 0),
    }
    const rawIn = {
      regrindKg: prod.reduce((s, e) => s + (Number(e.runnerKg) || 0) + (Number(e.rejectsKg) || 0), 0),
      burntKg: prod.reduce((s, e) => s + (Number(e.burntKg) || 0), 0),
    }
    const prodMap = {}
    for (const e of prod) for (const it of (e.items || [])) {
      prodMap[it.productId] = (prodMap[it.productId] || 0) + (Number(it.pieces) || 0)
    }
    return { rawOut, rawIn, prodMap }
  }, [issues.list, production.list, since15])

  const balances = useMemo(() => allMolderBalances(masters, data), [masters, production.list, issues.list])

  // Make-vs-buy (monthly basis, scaled from this month's output).
  const E = MACHINE_ECONOMICS
  const monthlyInhouse = E.monthlyOperator + E.monthlyRent + E.monthlyElectricity + E.monthlyMaintenance
    + E.machineCost / E.lifeYears / 12
  const inhousePerPiece = monthPieces > 0 ? monthlyInhouse / monthPieces : null
  const buyVerdict = inhousePerPiece == null ? null
    : inhousePerPiece <= E.outsourcePerPiece ? 'buy' : 'outsource'

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Today */}
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

      {/* Last 15 days — RAW MATERIAL (in/out) */}
      <Card className="p-4">
        <FieldLabel>Raw material — last 15 days</FieldLabel>
        <div className="mt-2 text-sm space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase mt-1">Sent to molders (OUT)</div>
          <Row label="Compound" val={`${fmtNum(last15.rawOut.compoundKg)} kg`} />
          <Row label="Masterbatch" val={`${fmtNum(last15.rawOut.mbKg)} kg`} />
          <Row label="Nuts" val={fmtNum(last15.rawOut.nuts)} />
          <div className="text-xs font-bold text-slate-500 uppercase mt-2">Returned (IN)</div>
          <Row label="Regrind (runner + rejects)" val={`${fmtNum(last15.rawIn.regrindKg)} kg`} />
          <Row label="Burnt loss" val={`${fmtNum(last15.rawIn.burntKg)} kg`} />
        </div>
      </Card>

      {/* Last 15 days — FINAL PRODUCT */}
      <Card className="p-4">
        <FieldLabel>Final product — last 15 days</FieldLabel>
        <div className="mt-2 text-sm space-y-1">
          {Object.keys(last15.prodMap).length === 0 && <p className="text-slate-400">No production in the last 15 days.</p>}
          {products.filter(p => last15.prodMap[p.id]).map(p => (
            <Row key={p.id} label={p.name} val={`${fmtNum(last15.prodMap[p.id])} pcs`} />
          ))}
        </div>
      </Card>

      {/* Cost per piece (owner only — managers don't see money) */}
      {owner && (
      <Card className="p-4">
        <FieldLabel>Cost per piece</FieldLabel>
        <div className="mt-2 space-y-2">
          {products.filter(p => (Number(p.gPerPiece) || 0) > 0).map(p => {
            const mat = productMaterialCost(p, masters)
            return (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">{p.name}</span>
                <span className="text-right">
                  <span className="text-slate-400 text-xs mr-2">material ₹{mat.total.toFixed(2)}</span>
                  <span className="font-mono font-bold text-teal-800">
                    {lastCost[p.id] != null ? `₹${lastCost[p.id].toFixed(2)}/pc` : '—'}
                  </span>
                </span>
              </div>
            )
          })}
          <p className="text-xs text-slate-400 pt-1">Full cost includes the job-work share, which depends on shift output. Shown value = last actual.</p>
        </div>
      </Card>
      )}

      {/* Molder balances */}
      <Card className="p-4">
        <FieldLabel>Molder balances</FieldLabel>
        <div className="mt-2 space-y-3">
          {balances.length === 0 && <p className="text-sm text-slate-400">No activity yet. Issue material and record production to begin.</p>}
          {balances.map(b => {
            const h = molderHisab(b.molderId, masters, data)
            return (
              <div key={b.molderId} className="border border-slate-100 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{b.molder?.name || '(molder)'}</span>
                  {b.flag && <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">🚩 check material</span>}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                  <Row label="Compound bal." val={`${fmtNum(b.balanceKg)} kg`} />
                  <Row label="Nuts bal." val={fmtNum(b.nutBalance)} />
                  <Row label="Regrind back" val={`${fmtNum(b.regrindKg)} kg`} />
                  <Row label="Burnt loss" val={`${fmtNum(b.burntKg)} kg`} />
                  <Row label="Pieces" val={fmtNum(b.goodPieces)} />
                  {owner && <Row label={h.balance >= 0 ? 'We owe' : 'Owes us'} val={`₹${fmtNum(Math.abs(h.balance))}`} bold />}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Make vs buy (owner only) */}
      {owner && (
      <Card className={`p-4 ${buyVerdict === 'buy' ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
        <FieldLabel>Buy the machine? (break-even)</FieldLabel>
        {inhousePerPiece == null ? (
          <p className="text-sm text-slate-500 mt-2">Record this month's production to see the in-house vs outsource comparison.</p>
        ) : (
          <div className="mt-2 text-sm space-y-1">
            <Row label="This month pieces" val={fmtNum(monthPieces)} />
            <Row label="In-house cost/piece" val={`₹${inhousePerPiece.toFixed(2)}`} />
            <Row label="Outsource cost/piece" val={`₹${E.outsourcePerPiece.toFixed(2)}`} />
            <div className={`mt-2 font-bold ${buyVerdict === 'buy' ? 'text-emerald-700' : 'text-slate-700'}`}>
              {buyVerdict === 'buy'
                ? '✅ At this volume, owning the machine is cheaper — worth evaluating a purchase.'
                : '⏳ Keep outsourcing — volume is too low to justify the ₹25L machine yet.'}
            </div>
          </div>
        )}
      </Card>
      )}
    </div>
  )
}

function Row({ label, val, bold }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`font-mono ${bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{val}</span>
    </div>
  )
}
