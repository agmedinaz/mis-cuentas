import React from 'react'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ChevronRight } from 'lucide-react'
import { loadMonth, calcMonth, fmtARS, monthName, loadPendingPurchases } from '../store'

export default function Dashboard({ months, onSelectMonth }) {
  if (months.length === 0) {
    return (
      <div className="empty-state">
        <Wallet size={48} />
        <p>No hay meses cargados todavía.</p>
        <p style={{ marginTop: 6, fontSize: 13, color: 'var(--text3)' }}>
          Creá tu primer mes con el botón "Nuevo mes".
        </p>
      </div>
    )
  }

  const pending = loadPendingPurchases()
  const monthsData = months.map(m => {
    const data = loadMonth(m.id)
    if (!data) return null
    const calc = calcMonth(data, pending)
    return { meta: m, data, calc }
  }).filter(Boolean)

  // Acumulados
  const totalAhorro = monthsData.reduce((a, m) => a + m.calc.ahorro, 0)
  const totalIngresos = monthsData.reduce((a, m) => a + m.calc.ingresosBrutos, 0)
  const totalGastos = monthsData.reduce((a, m) => a + m.calc.gastosTotales, 0)

  return (
    <>
      <div className="summary-grid">
        <div className="summary-card green">
          <div className="summary-label">Ingresos totales</div>
          <div className="summary-value green">{fmtARS(totalIngresos)}</div>
          <div className="summary-sub">{months.length} mes{months.length !== 1 ? 'es' : ''}</div>
        </div>
        <div className="summary-card red">
          <div className="summary-label">Gastos totales</div>
          <div className="summary-value red">{fmtARS(totalGastos)}</div>
          <div className="summary-sub">Fijos + tarjetas + otros</div>
        </div>
        <div className="summary-card highlight">
          <div className="summary-label">Ahorro acumulado</div>
          <div className={`summary-value ${totalAhorro >= 0 ? 'accent' : 'red'}`}>
            {fmtARS(totalAhorro)}
          </div>
          <div className="summary-sub">Todos los meses</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <div className="card-title-left">Detalle por mes</div>
        </div>
        <div className="items-list">
          {monthsData.map(({ meta, data, calc }) => (
            <div
              key={meta.id}
              className="item-row"
              style={{
                gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                cursor: 'pointer',
                padding: '10px 4px',
                borderRadius: 6,
                transition: 'background .15s',
              }}
              onClick={() => onSelectMonth(meta.id)}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {monthName(meta.month)} {meta.year}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Libre: {fmtARS(calc.libreDisponible)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Ingresos</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>
                  {fmtARS(calc.ingresosBrutos)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Gastos</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>
                  {fmtARS(calc.gastosTotales)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Ahorro</div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: calc.ahorro >= 0 ? 'var(--accent3)' : 'var(--red)',
                }}>
                  {fmtARS(calc.ahorro)}
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text3)' }} />
            </div>
          ))}
        </div>
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--yellow)' }}>
          <div className="card-title">
            <div className="card-title-left" style={{ color: 'var(--yellow)' }}>
              Compras pendientes activas
            </div>
            <span className="badge badge-yellow">{pending.length}</span>
          </div>
          <div className="pending-list">
            {pending.map(p => (
              <div key={p.id} className="pending-item">
                <div className="pending-item-info">
                  <div className="pending-item-name">{p.concepto}</div>
                  <div className="pending-item-meta">
                    → {p.targetMonthId ? p.targetMonthId : 'Sin mes asignado'}
                    {p.tarjeta ? ` · ${p.tarjeta}` : ''}
                  </div>
                </div>
                <div className="pending-item-monto">{fmtARS(p.monto)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
