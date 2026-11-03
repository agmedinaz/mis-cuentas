import React, { useState, useEffect } from 'react'
import { Plus, Trash2, ShoppingBag, Info } from 'lucide-react'
import {
  loadPendingPurchases, savePendingPurchases, addPendingPurchase,
  removePendingPurchase, fmtARS, monthName, uid, loadMonth, calcMonth
} from '../store'

export default function PendingPurchases({ months, toast }) {
  const [purchases, setPurchases] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    concepto: '',
    monto: '',
    tarjeta: '',
    targetMonthId: months[0]?.id || '',
    nota: '',
  })

  useEffect(() => {
    setPurchases(loadPendingPurchases())
  }, [])

  function handleAdd() {
    if (!form.concepto.trim() || !form.monto || !form.targetMonthId) return
    const list = addPendingPurchase({
      concepto: form.concepto.trim(),
      monto: parseFloat(form.monto) || 0,
      tarjeta: form.tarjeta,
      targetMonthId: form.targetMonthId,
      nota: form.nota,
    })
    setPurchases(list)
    setForm({ concepto: '', monto: '', tarjeta: '', targetMonthId: months[0]?.id || '', nota: '' })
    setShowForm(false)
    toast('Compra pendiente registrada')
  }

  function handleRemove(id) {
    const list = removePendingPurchase(id)
    setPurchases(list)
    toast('Compra eliminada', 'error')
  }

  // Agrupar por mes destino
  const byMonth = {}
  purchases.forEach(p => {
    const key = p.targetMonthId || 'sin-mes'
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(p)
  })

  // Calcular impacto en libre de cada mes
  function getLibreImpact(monthId) {
    const data = loadMonth(monthId)
    if (!data) return null
    const calc = calcMonth(data, purchases)
    return { libreBase: data.libreBase || 0, libreDisponible: calc.libreDisponible, sumaPending: calc.sumaPending }
  }

  return (
    <>
      {/* Info card */}
      <div className="card" style={{ borderColor: 'rgba(108,99,255,.4)', background: 'rgba(108,99,255,.06)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Info size={18} style={{ color: 'var(--accent3)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>¿Cómo funciona esto?</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              Registrá acá las compras con tarjeta que ya hiciste pero todavía no aparecen en la planilla del mes siguiente. 
              Asignales el mes en que van a impactar y ese mes va a descontarlas automáticamente del dinero libre, 
              para que siempre sepas cuánto te queda disponible de verdad.
            </div>
          </div>
        </div>
      </div>

      {/* Botón agregar */}
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={15} /> Nueva compra pendiente
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card" style={{ borderColor: 'var(--accent)', marginBottom: 20 }}>
          <div className="card-title"><div className="card-title-left">Registrar compra pendiente</div></div>
          <div className="form-group">
            <label className="form-label">Concepto</label>
            <input value={form.concepto} placeholder="Ej: Zapatillas Adidas"
              onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Monto ($)</label>
              <input type="number" value={form.monto} placeholder="0"
                onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tarjeta (opcional)</label>
              <input value={form.tarjeta} placeholder="Ej: BNA VISA"
                onChange={e => setForm(f => ({ ...f, tarjeta: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">¿En qué mes va a impactar?</label>
            <select value={form.targetMonthId}
              onChange={e => setForm(f => ({ ...f, targetMonthId: e.target.value }))}>
              <option value="">Seleccioná un mes</option>
              {months.map(m => (
                <option key={m.id} value={m.id}>
                  {monthName(m.month)} {m.year}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Nota (opcional)</label>
            <input value={form.nota} placeholder="Ej: Cuotas 1/6"
              onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} />
          </div>
          <div className="modal-actions" style={{ marginTop: 4 }}>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleAdd}>Registrar</button>
          </div>
        </div>
      )}

      {/* Lista por mes */}
      {purchases.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={40} />
          <p>Sin compras pendientes registradas</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>
            Registrá compras con tarjeta que todavía no aparecen en tu planilla del mes siguiente
          </p>
        </div>
      ) : (
        Object.entries(byMonth).map(([monthId, items]) => {
          const meta = months.find(m => m.id === monthId)
          const impact = meta ? getLibreImpact(monthId) : null
          const label = meta
            ? `${monthName(meta.month)} ${meta.year}`
            : 'Sin mes asignado'

          return (
            <div key={monthId} className="card">
              <div className="card-title">
                <div className="card-title-left">
                  {label}
                  <span className="badge badge-yellow">{items.length}</span>
                </div>
                {impact && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>Libre disponible</div>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: impact.libreDisponible >= 0 ? 'var(--accent3)' : 'var(--red)',
                    }}>
                      {fmtARS(impact.libreDisponible)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      de {fmtARS(impact.libreBase)} base · −{fmtARS(impact.sumaPending)} pendiente
                    </div>
                  </div>
                )}
              </div>

              <div className="pending-list">
                {items.map(p => (
                  <div key={p.id} className="pending-item">
                    <div className="pending-item-info">
                      <div className="pending-item-name">{p.concepto}</div>
                      <div className="pending-item-meta">
                        {p.tarjeta && <span>{p.tarjeta} · </span>}
                        {p.nota && <span>{p.nota} · </span>}
                        <span style={{ opacity: .6 }}>
                          {new Date(p.createdAt).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="pending-item-monto">{fmtARS(p.monto)}</div>
                      <button className="btn-icon" onClick={() => handleRemove(p.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {impact && (
                <div style={{ marginTop: 12 }}>
                  <div className="libre-bar-bg">
                    <div
                      className={`libre-bar-fill ${
                        impact.libreDisponible < 0 ? 'danger' :
                        impact.libreDisponible < impact.libreBase * 0.3 ? 'warning' : ''
                      }`}
                      style={{
                        width: `${Math.max(0, Math.min(100, (impact.libreDisponible / impact.libreBase) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="libre-amounts">
                    <span>
                      {Math.max(0, Math.round((impact.libreDisponible / impact.libreBase) * 100))}% disponible
                    </span>
                    <span>−{fmtARS(impact.sumaPending)} en compras pendientes</span>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </>
  )
}
