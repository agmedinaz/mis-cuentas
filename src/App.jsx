import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard, Wallet, ShoppingBag, Plus,
  Calendar, BarChart2, FileText
} from 'lucide-react'
import { listMonths, loadMonth, saveMonth, emptyMonth, monthName } from './store'
import { ToastContainer, useToast } from './useToast.jsx'
import Dashboard from './pages/Dashboard'
import MonthEditor from './pages/MonthEditor'
import PendingPurchases from './pages/PendingPurchases'
import Estadisticas from './pages/Estadisticas'
import Historial from './pages/Historial'
import NewMonthModal from './components/NewMonthModal'

export default function App() {
  const [months, setMonths] = useState([])
  const [activeMonthId, setActiveMonthId] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showNewMonth, setShowNewMonth] = useState(false)
  const { toasts, toast } = useToast()

  useEffect(() => {
    const list = listMonths()
    setMonths(list)
    if (list.length > 0 && !activeMonthId) {
      setActiveMonthId(list[0].id)
      setActiveTab('editor')
    }
  }, [])

  function handleSelectMonth(id) {
    setActiveMonthId(id)
    setActiveTab('editor')
  }

  function handleNewMonth(year, month, baseData) {
    const data = emptyMonth(year, month)
    if (baseData) Object.assign(data, baseData)
    saveMonth(data)
    const list = listMonths()
    setMonths(list)
    setActiveMonthId(data.id)
    setActiveTab('editor')
    setShowNewMonth(false)
    toast(`Mes ${monthName(month)} ${year} creado`)
  }

  function refreshMonths() {
    setMonths(listMonths())
  }

  const activeMonthMeta = months.find(m => m.id === activeMonthId)

  const navItems = [
    { key: 'dashboard', icon: LayoutDashboard, label: 'Resumen' },
    { key: 'stats', icon: BarChart2, label: 'Estadísticas' },
    { key: 'historial', icon: FileText, label: 'Historial PDF' },
    { key: 'pending', icon: ShoppingBag, label: 'Compras pendientes' },
  ]

  return (
    <div className="app-shell">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Wallet size={20} />
          <span>Mis Cuentas</span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">General</div>
          {navItems.map(({ key, icon: Icon, label }) => (
            <div
              key={key}
              className={`sidebar-item ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="sidebar-section" style={{ marginTop: 12 }}>
          <div className="sidebar-label">Meses</div>
          {months.map(m => (
            <div
              key={m.id}
              className={`sidebar-item ${activeMonthId === m.id && activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => handleSelectMonth(m.id)}
            >
              <Calendar size={16} />
              <span>{monthName(m.month)} {m.year}</span>
            </div>
          ))}
          {months.length === 0 && (
            <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text3)' }}>
              Sin meses aún
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <button className="btn-new-month" onClick={() => setShowNewMonth(true)}>
            <Plus size={15} />
            Nuevo mes
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="main">
        {activeTab === 'dashboard' && (
          <>
            <div className="topbar">
              <div>
                <div className="topbar-title">Resumen general</div>
                <div className="topbar-sub">Todos los meses</div>
              </div>
            </div>
            <div className="page">
              <Dashboard months={months} onSelectMonth={handleSelectMonth} />
            </div>
          </>
        )}

        {activeTab === 'stats' && (
          <>
            <div className="topbar">
              <div>
                <div className="topbar-title">Estadísticas</div>
                <div className="topbar-sub">Promedios y tendencias por período</div>
              </div>
            </div>
            <div className="page">
              <Estadisticas months={months} />
            </div>
          </>
        )}

        {activeTab === 'historial' && (
          <>
            <div className="topbar">
              <div>
                <div className="topbar-title">Historial y PDF</div>
                <div className="topbar-sub">Resumen detallado de tus meses</div>
              </div>
            </div>
            <div className="page">
              <Historial months={months} toast={toast} />
            </div>
          </>
        )}

        {activeTab === 'editor' && activeMonthId && (
          <>
            <div className="topbar">
              <div>
                <div className="topbar-title">
                  {activeMonthMeta ? `${monthName(activeMonthMeta.month)} ${activeMonthMeta.year}` : 'Mes'}
                </div>
                <div className="topbar-sub">Editar finanzas del mes</div>
              </div>
            </div>
            <div className="page">
              <MonthEditor
                monthId={activeMonthId}
                onRefresh={refreshMonths}
                toast={toast}
              />
            </div>
          </>
        )}

        {activeTab === 'pending' && (
          <>
            <div className="topbar">
              <div>
                <div className="topbar-title">Compras pendientes</div>
                <div className="topbar-sub">Compras que impactan en el libre de cada mes</div>
              </div>
            </div>
            <div className="page">
              <PendingPurchases months={months} toast={toast} />
            </div>
          </>
        )}

        {activeTab === 'editor' && !activeMonthId && (
          <div className="page">
            <div className="empty-state">
              <Wallet size={48} />
              <p>Creá tu primer mes para empezar</p>
              <button className="btn btn-primary" onClick={() => setShowNewMonth(true)}>
                <Plus size={15} /> Nuevo mes
              </button>
            </div>
          </div>
        )}
      </main>

      {showNewMonth && (
        <NewMonthModal
          existingMonths={months}
          onConfirm={handleNewMonth}
          onClose={() => setShowNewMonth(false)}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}
