/**
 * Moulder Material — a dedicated, clear view of how much raw material is still
 * lying with each molder: issued → accounted (in pieces / regrind / burnt) →
 * physically returned → balance still with him. Pieces & kg only (no money),
 * so it is manager-safe. Reads the same reconciliation as the Dashboard card.
 */
import { useMemo } from 'react'
import { usePlastic } from '../PlasticContext'
import { Card } from '../../../core/ui'
import { fmtNum } from '../../../core/utils/format'
import { allMolderBalances } from '../logic/reconcile'

function Row({ label, val, bold, tone }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`font-mono ${bold ? 'font-bold' : ''} ${tone || ''}`}>{val}</span>
    </div>
  )
}

export default function MoulderMaterial() {
  const { production, issues, returns, masters } = usePlastic()

  const data = { production: production.list, issues: issues.list, returns: returns.list }
  const balances = useMemo(
    () => allMolderBalances(masters, data),
    [masters, production.list, issues.list, returns.list],
  )

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-4 py-3 text-sm text-cyan-800">
        How much raw material is still <b>lying with each molder</b>. Balance = issued −
        used in pieces − regrind/burnt − material returned.
      </div>

      {balances.length === 0 && (
        <Card className="p-6 text-center text-slate-400">
          No activity yet. Issue material and record production to begin.
        </Card>
      )}

      {balances.map(b => (
        <Card key={b.molderId} className="p-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">{b.molder?.name || '(molder)'}</span>
            {b.flag && <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">🚩 check material</span>}
          </div>

          {/* Headline: compound still with him */}
          <div className="mt-3 bg-slate-50 rounded-xl p-3 text-center">
            <div className={`text-3xl font-bold ${b.balanceKg < 0 ? 'text-red-600' : 'text-teal-800'}`}>{fmtNum(b.balanceKg)} kg</div>
            <div className="text-xs text-slate-500 mt-0.5">compound still with molder</div>
          </div>

          {/* Full breakdown */}
          <div className="mt-3 space-y-1">
            <div className="text-xs font-bold text-slate-500 uppercase">Compound (kg)</div>
            <Row label="Issued to him" val={fmtNum(b.issuedKg)} />
            <Row label="Used in good pieces" val={fmtNum(b.plasticInProductsKg)} />
            <Row label="Regrind back (in production)" val={fmtNum(b.regrindKg)} />
            <Row label="Burnt / purge loss" val={fmtNum(b.burntKg)} tone="text-amber-600" />
            <Row label="Returned unused (compound)" val={fmtNum(b.returnedCompoundKg)} />
            <Row label="Returned loose regrind" val={fmtNum(b.returnedRegrindKg)} />
            <div className="border-t pt-1 mt-1">
              <Row label="Balance with molder" val={`${fmtNum(b.balanceKg)} kg`} bold tone={b.balanceKg < 0 ? 'text-red-600' : 'text-teal-700'} />
            </div>

            <div className="text-xs font-bold text-slate-500 uppercase mt-3">Nuts</div>
            <Row label="Issued" val={fmtNum(b.nutsIssued)} />
            <Row label="Used in pieces" val={fmtNum(b.nutsUsed)} />
            <Row label="Returned" val={fmtNum(b.returnedNuts)} />
            <div className="border-t pt-1 mt-1">
              <Row label="Nuts balance" val={fmtNum(b.nutBalance)} bold />
            </div>

            <div className="text-xs font-bold text-slate-500 uppercase mt-3">Pieces</div>
            <Row label="Produced" val={fmtNum(b.producedPieces)} />
            {b.expectedPieces > 0 && <Row label="Expected (from compound)" val={`≈ ${fmtNum(b.expectedPieces)}`} />}
            {b.expectedPieces > 0 && <Row label="Pending (approx)" val={`≈ ${fmtNum(b.pendingPieces)}`} bold tone="text-teal-700" />}
          </div>
        </Card>
      ))}
    </div>
  )
}
