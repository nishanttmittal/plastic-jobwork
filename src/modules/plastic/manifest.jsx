/**
 * Plastic Job Work — module manifest. Implements the shell contract:
 *   id, title, icon, Provider, HomeStats, pages[]
 */
import { PlasticProvider, usePlastic } from './PlasticContext'
import { todayStr } from '../../core/utils/format'
import Dashboard from './pages/Dashboard'
import NewProduction from './pages/NewProduction'
import IssueCompound from './pages/IssueCompound'
import Masters from './pages/Masters'
import Hisab from './pages/Hisab'
import Admin from './pages/Admin'

function HomeStats() {
  const { production, molders } = usePlastic()
  const today = todayStr()
  const piecesToday = production.list
    .filter(e => e.date === today && !e.voided)
    .reduce((s, e) => s + (e.items || []).reduce((a, it) => a + (Number(it.pieces) || 0), 0), 0)
  const m = new Date().getMonth(), y = new Date().getFullYear()
  const thisMonth = production.list.filter(e => {
    const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y && !e.voided
  }).length
  const stat = (n, l) => (
    <div className="bg-white/10 rounded-xl px-4 py-2.5 flex-1 text-center">
      <div className="text-2xl font-bold">{n}</div>
      <div className="text-xs text-slate-300 mt-0.5">{l}</div>
    </div>
  )
  return (
    <div className="mt-4 flex gap-3">
      {stat(piecesToday.toLocaleString('en-IN'), 'Pieces Today')}
      {stat(molders.length, 'Molders')}
      {stat(thisMonth, 'Entries (Month)')}
    </div>
  )
}

export const plasticModule = {
  id: 'plastic',
  title: 'Plastic Job Work',
  icon: '🧩',
  Provider: PlasticProvider,
  HomeStats,
  pages: [
    { key: 'dashboard',  title: 'Dashboard',     desc: 'Cost per piece, balances & alerts', icon: '📊', color: 'from-teal-600 to-teal-700',       roles: ['manager', 'owner'], Component: Dashboard },
    { key: 'production', title: 'New Production', desc: 'Record a shift’s output',        icon: '➕', color: 'from-emerald-600 to-emerald-700', roles: ['manager', 'owner'], Component: NewProduction },
    { key: 'issue',      title: 'Issue Material', desc: 'Give compound / nuts to a molder',   icon: '📦', color: 'from-cyan-600 to-cyan-700',       roles: ['manager', 'owner'], Component: IssueCompound },
    { key: 'hisab',      title: 'Molder Hisab',  desc: 'Dues, advances, balance, PDF',        icon: '📒', color: 'from-violet-600 to-violet-700',   roles: ['manager', 'owner'], Component: Hisab },
    { key: 'masters',    title: 'Masters & Rates', desc: 'Compounds, nuts, molders, products', icon: '🗂️', color: 'from-amber-500 to-amber-600',    roles: ['owner'], Component: Masters },
    { key: 'admin',      title: 'Admin',         desc: 'Backup, logs, void & reset',          icon: '⚙️', color: 'from-slate-600 to-slate-700',     roles: ['owner'], Component: Admin },
  ],
}
