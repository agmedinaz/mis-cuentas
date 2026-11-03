import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard, Wallet, CreditCard, PiggyBank,
  ShoppingBag, Plus, ChevronRight, Settings, Calendar
} from 'lucide-react'
import { listMonths, loadMonth, saveMonth, emptyMonth, monthName } from './store'
import { ToastContainer, useToast } from './useToast'
import Dashboard from './pages/Dashboard'
import MonthEditor from './pages/MonthEditor'
import PendingPurchases from './pages/PendingPurchases'
import NewMonthModal from './components/NewMonthModal'

export default function App() {
  const [months, setMonths] = useState([])
  const [activeMonthId, setActiveMonthId] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showNewMonth, setShowNewMonth] = useState(false)
  const { toasts, toast } = useToast()

  // Cargar lista de meses al inicio
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
          <div
            className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={16} />
            <span>Resumen</span>
          </div>
          <div
            className={`sidebar-item ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <ShoppingBag size={16} />
            <span>Compras pendientes</span>
          </div>
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
                <div className="topbar-sub">Compras en cuotas que impactan en el libre de cada mes</div>
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

      {/* ── Modales ──────────────────────────────────────────── */}
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
