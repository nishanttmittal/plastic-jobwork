/**
 * Plastic Job Work — module manifest. Implements the shell contract:
 *   id, title, icon, Provider, pages[]
 *
 * Navigation is organised around the four daily jobs (nav:true → bottom nav):
 *   🏠 Home · ➕ Record · 👥 Moulders · 🏷️ Costing · ☰ More
 * Secondary screens (Report, Entries, Masters, Admin) live under More.
 */
import { PlasticProvider } from './PlasticContext'
import Home from './pages/Home'
import Record from './pages/Record'
import Moulders from './pages/Moulders'
import Costing from './pages/Costing'
import More from './pages/More'
import Dashboard from './pages/Dashboard'   // detailed 15-day report (under More)
import Entries from './pages/Entries'
import LotReport from './pages/LotReport'
import MachineLoad from './pages/MachineLoad'
import Stock from './pages/Stock'
import Masters from './pages/Masters'
import Admin from './pages/Admin'

export const plasticModule = {
  id: 'plastic',
  title: 'Plastic Job Work',
  icon: '🧩',
  Provider: PlasticProvider,
  pages: [
    // Primary — bottom nav (the four daily jobs + More)
    { key: 'home',     title: 'Home',     icon: '🏠', nav: true, roles: ['manager', 'owner'], Component: Home },
    { key: 'record',   title: 'Record',   icon: '➕', nav: true, roles: ['manager', 'owner'], Component: Record },
    { key: 'moulders', title: 'Moulders', icon: '👥', nav: true, roles: ['manager', 'owner'], Component: Moulders },
    { key: 'costing',  title: 'Costing',  icon: '🏷️', nav: true, roles: ['owner'], Component: Costing },
    { key: 'more',     title: 'More',     icon: '☰', nav: true, roles: ['manager', 'owner'], Component: More },
    // Secondary — opened from More
    { key: 'stock',   title: 'Stock',          icon: '📦', desc: 'Raw material, purchases, prices', roles: ['owner'], Component: Stock },
    { key: 'lotreport', title: 'Lot Report',   icon: '🧾', desc: 'Per-lot sent vs received + cost/pc + PDF', roles: ['owner'], Component: LotReport },
    { key: 'machine',   title: 'Machine Load', icon: '🏭', desc: 'Buy-a-machine signal: capacity & break-even', roles: ['owner'], Component: MachineLoad },
    { key: 'report',  title: 'Report',         icon: '📊', desc: '15-day material & rejections', roles: ['manager', 'owner'], Component: Dashboard },
    { key: 'entries', title: 'Entries',        icon: '📜', desc: 'Every entry · void',           roles: ['manager', 'owner'], Component: Entries },
    { key: 'masters', title: 'Masters & Rates', icon: '🗂️', desc: 'Compounds, nuts, molders, products', roles: ['owner'], Component: Masters },
    { key: 'admin',   title: 'Admin',          icon: '⚙️', desc: 'Backup, logs, void & reset',   roles: ['owner'], Component: Admin },
  ],
}
