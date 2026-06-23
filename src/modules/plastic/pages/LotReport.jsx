/**
 * Lot Report — pick a raw-material lot and see the full "sent vs received"
 * reconciliation + the true cost per piece (two ways), exportable as a PDF
 * you can share on WhatsApp. Owner-only (shows rates/money).
 */
import { useMemo, useState } from 'react'
import { usePlastic } from '../PlasticContext'
import { Card, FieldLabel, Select, Button } from '../../../core/ui'
import { fmtDate, fmtNum } from '../../../core/utils/format'
import { lotList, lotReconciliation } from '../logic/lot'
import { buildLotPdf } from '../logic/lotPdf'

export default function LotReport() {
  const { masters, issues, production, returns } = usePlastic()
  const data = useMemo(() => ({ issues: issues.list, production: production.list, returns: returns.list }),
    [issues.list, production.list, returns.list])

  const lots = useMemo(() => lotList(data), [data])
  const [lotNo, setLotNo] = useState(lots[0]?.lotNo || '')
  const r = useMemo(() => (lotNo ? lotReconciliation(lotNo, masters, data) : null), [lotNo, masters, data])

  const exportPdf = () => buildLotPdf(lotNo, masters, data).save(`Lot-${lotNo}.pdf`)

  if (lots.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <Card className="p-6 text-center text-slate-500 space-y-2">
          <div className="text-3xl">📦</div>
          <div className="font-semibold text-slate-700">No lots yet</div>
          <div className="text-sm">Tag a <b>Lot</b> when you issue material (Record → Issue), then record the
            pieces and scrap against the same lot. The reconciliation builds itself here.</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-3">
      <Card className="p-3">
        <FieldLabel>Lot</FieldLabel>
        <Select className="mt-1" value={lotNo} onChange={e => setLotNo(e.target.value)}
          options={lots.map(l => ({ value: l.lotNo, label: `${l.lotNo} · ${l.molderId ? '' : ''}${fmtDate(l.firstDate)}` }))} />
        {r?.molder && <div className="text-xs text-slate-500 mt-1">Molder: {r.molder.name}</div>}
      </Card>

      {r && (
        <>
          <Card className="p-4 space-y-2">
            <FieldLabel>📤 Raw material sent</FieldLabel>
            <Row label="Compound (PP)" val={`${fmtNum(r.sent.compoundKg)} kg`} sub={`@ ₹${fmtNum(r.sent.cmpRate)}/kg`} />
            <Row label="Nuts" val={`${fmtNum(r.sent.nutsSent)} pcs`} sub={`@ ₹${fmtNum(r.sent.nutRate)}`} />
            {r.sent.mbKg > 0 && <Row label="Masterbatch" val={`${fmtNum(r.sent.mbKg)} kg`} />}
          </Card>

          <Card className="p-4 space-y-2">
            <FieldLabel>📥 Received back</FieldLabel>
            {r.received.machineShots > 0 && (
              <div className={`text-sm rounded-xl px-3 py-2 ${Math.abs(r.received.machinePieces - (r.received.goodPieces + r.received.rejectPieces)) > Math.max(5, r.received.machinePieces * 0.02) ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
                🏭 Machine: {fmtNum(r.received.machineShots)} shots → <b>{fmtNum(r.received.machinePieces)}</b> pcs vs {fmtNum(r.received.goodPieces + r.received.rejectPieces)} counted
              </div>
            )}
            <Row label="Good pieces" val={`${fmtNum(r.received.goodPieces)} pcs`} strong />
            <Row label="Reject pieces" val={`${fmtNum(r.received.rejectPieces)} pcs`} />
            <Row label="Runner returned" val={`${fmtNum(r.received.runnerKg)} kg`} />
            <Row label="Rejects returned" val={`${fmtNum(r.received.rejectsKg)} kg`} />
            <Row label="Burnt / purge loss" val={`${fmtNum(r.received.burntKg)} kg`} />
            <Row label="Loose nuts returned" val={`${fmtNum(r.returned.nuts)} pcs`} />
            <Row label="Finished weight (weighed)" val={`${fmtNum(r.received.finishedKg)} kg`} />
          </Card>

          <Card className={`p-4 space-y-2 ${r.flag ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}>
            <FieldLabel>⚖️ Material balance</FieldLabel>
            <Row label="Compound sent" val={`${fmtNum(r.sent.compoundKg)} kg`} />
            <Row label="Accounted" val={`${fmtNum(r.accountedKg)} kg`} />
            <Row label="Unaccounted / with molder" val={`${fmtNum(r.balanceKg)} kg`} strong />
            <Row label="Material loss" val={`${fmtNum(r.lossPct)} %`} />
            <Row label="Recoverable regrind" val={`${fmtNum(r.regrindKg)} kg`} />
            <Row label="Nut balance" val={`${fmtNum(r.nutBalance)} pcs`} />
            {r.flag && <div className="text-xs font-semibold text-red-600">🚩 More plastic came out than was sent — re-check weights/pieces.</div>}
          </Card>

          <Card className="p-4 bg-teal-50 border border-teal-200 space-y-3">
            <FieldLabel className="text-teal-700">🏷️ Cost per piece (both incl. nut + job-work)</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              <RateBox title="Scrap = full loss" val={r.rates.fullLoss} note="all compound charged" />
              <RateBox title="Regrind reused" val={r.rates.regrind} note="regrind credited back" />
            </div>
            <div className="text-xs text-slate-600 border-t border-teal-200 pt-2 space-y-0.5">
              <div className="flex justify-between"><span>Compound / piece</span><span className="font-mono">₹{fmtNum(r.rates.compoundFullLoss)} → ₹{fmtNum(r.rates.compoundNet)}</span></div>
              <div className="flex justify-between"><span>Nut / piece</span><span className="font-mono">₹{fmtNum(r.rates.nutPerPiece)}</span></div>
              <div className="flex justify-between"><span>Job-work / piece</span><span className="font-mono">₹{fmtNum(r.rates.jobWorkPerPiece)}</span></div>
            </div>
          </Card>

          <Button size="lg" className="w-full" onClick={exportPdf}>📄 Export PDF (share on WhatsApp)</Button>
        </>
      )}
    </div>
  )
}

function Row({ label, val, sub, strong }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}{sub && <span className="text-slate-400"> · {sub}</span>}</span>
      <span className={`font-mono ${strong ? 'font-bold text-slate-800' : 'text-slate-700'}`}>{val}</span>
    </div>
  )
}

function RateBox({ title, val, note }) {
  return (
    <div className="bg-white rounded-xl p-3 text-center border border-teal-100">
      <div className="text-2xl font-bold text-teal-800">₹{fmtNum(val)}</div>
      <div className="text-[11px] font-semibold text-slate-600 mt-0.5">{title}</div>
      <div className="text-[10px] text-slate-400">{note}</div>
    </div>
  )
}
