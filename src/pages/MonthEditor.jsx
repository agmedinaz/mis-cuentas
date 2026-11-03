import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronDown, Zap, TrendingUp, TrendingDown, CreditCard, Home, Wifi, ShoppingBag, RefreshCcw, DollarSign } from 'lucide-react'
import {
  loadMonth, saveMonth, calcMonth, fmtARS, uid,
  loadPendingPurchases, monthName
} from '../store'
import LibreCard from '../components/LibreCard'
import TarjetaSection from '../components/TarjetaSection'

export default function MonthEditor({ monthId, onRefresh, toast }) {
  const [data, setData] = useState(null)
  const [pending, setPending] = useState([])
  const [activeTab, setActiveTab] = useState('resumen')

  useEffect(() => {
    const d = loadMonth(monthId)
    if (d) setData(d)
    setPending(loadPendingPurchases())
  }, [monthId])

  const save = useCallback((updated) => {
    saveMonth(updated)
    setData(updated)
    onRefresh()
  }, [onRefresh])

  // Actualizar campo simple
  function setField(key, value) {
    const updated = { ...data, [key]: value }
    save(updated)
  }

  // Actualizar item en una lista (ingresos, gastosFijos, otrosGastos, reintegros)
  function updateListItem(listKey, id, field, value) {
    const updated = {
      ...data,
      [listKey]: data[listKey].map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }
    save(updated)
  }

  function addListItem(listKey, defaults = {}) {
    const item = { id: uid(), concepto: '', monto: 0, ...defaults }
    const updated = { ...data, [listKey]: [...data[listKey], item] }
    save(updated)
  }

  function removeListItem(listKey, id) {
    const updated = { ...data, [listKey]: data[listKey].filter(i => i.id !== id) }
    save(updated)
  }

  // Tarjetas
  function updateTarjeta(tarjetaId, changes) {
    const updated = {
      ...data,
      tarjetas: data.tarjetas.map(t => t.id === tarjetaId ? { ...t, ...changes } : t),
    }
    save(updated)
  }

  function addTarjeta() {
    const t = { id: uid(), nombre: 'Nueva tarjeta', mantenimiento: 0, items: [] }
    save({ ...data, tarjetas: [...data.tarjetas, t] })
  }

  function removeTarjeta(id) {
    save({ ...data, tarjetas: data.tarjetas.filter(t => t.id !== id) })
  }

  if (!data) return <div style={{ padding: 24, color: 'var(--text3)' }}>Cargando…</div>

  const calc = calcMonth(data, pending)
  const pct = calc.ingresosBrutos > 0
    ? Math.min(100, Math.round((calc.gastosTotales / calc.ingresosBrutos) * 100))
    : 0

  return (
    <>
      <div className="tabs">
        {[
          { key: 'resumen', label: 'Resumen' },
          { key: 'ingresos', label: 'Ingresos' },
          { key: 'fijos', label: 'Gastos fijos' },
          { key: 'tarjetas', label: 'Tarjetas' },
          { key: 'otros', label: 'Otros gastos' },
          { key: 'reintegros', label: 'Reintegros' },
        ].map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── RESUMEN ─────────────────────────────────────────── */}
      {activeTab === 'resumen' && (
        <>
          {/* Libre card */}
          <LibreCard calc={calc} data={data} pending={pending} onSetLibre={v => setField('libreBase', v)} />

          <div className="summary-grid">
            <div className="summary-card green">
              <div className="summary-label">Ingresos brutos</div>
              <div className="summary-value green">{fmtARS(calc.ingresosBrutos)}</div>
              <div className="summary-sub">Antes de apartado</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Ingresos netos</div>
              <div className="summary-value accent">{fmtARS(calc.ingresosNetos)}</div>
              <div className="summary-sub">
                Apartado: {fmtARS(calc.montoApartado)} ({Math.round((data.apartado || 0) * 100)}%)
              </div>
            </div>
            <div className="summary-card red">
              <div className="summary-label">Gastos totales</div>
              <div className="summary-value red">{fmtARS(calc.gastosTotales)}</div>
              <div className="summary-sub">{pct}% de ingresos brutos</div>
            </div>
            <div className={`summary-card ${calc.ahorro >= 0 ? 'green' : 'red'}`}>
              <div className="summary-label">Ahorro estimado</div>
              <div className={`summary-value ${calc.ahorro >= 0 ? 'green' : 'red'}`}>
                {fmtARS(calc.ahorro)}
              </div>
              <div className="summary-sub">
                {calc.ahorro >= 0 ? 'Superávit' : 'Déficit'}
              </div>
            </div>
          </div>

          {/* Barra de gasto */}
          <div className="card">
            <div className="card-title"><div className="card-title-left">Distribución del ingreso</div></div>
            <BarraGasto calc={calc} data={data} />
          </div>

          {/* Desglose tarjetas */}
          <div className="card">
            <div className="card-title"><div className="card-title-left"><CreditCard size={14}/> Tarjetas</div></div>
            {calc.tarjetasDetalle.map(t => (
              <div key={t.id} className="progress-row" style={{ marginBottom: 8 }}>
                <span className="progress-label">{t.nombre}</span>
                <span className="progress-value" style={{ color: 'var(--text2)' }}>{fmtARS(t.total)}</span>
              </div>
            ))}
            <hr className="divider" />
            <div className="progress-row">
              <span style={{ fontWeight: 700, fontSize: 14 }}>Total tarjetas</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent3)' }}>{fmtARS(calc.sumaTarjetas)}</span>
            </div>
          </div>

          {/* Config rápida */}
          <div className="card">
            <div className="card-title"><div className="card-title-left">Configuración del mes</div></div>
            <div className="input-row two" style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                Apartado (% sobre brutos)
              </label>
              <input
                className="inline"
                type="number"
                min="0" max="100" step="1"
                value={Math.round((data.apartado || 0) * 100)}
                onChange={e => setField('apartado', (parseFloat(e.target.value) || 0) / 100)}
              />
            </div>
            <div className="input-row two">
              <label style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                Dinero libre base ($)
              </label>
              <input
                className="inline"
                type="number"
                min="0"
                value={data.libreBase || 0}
                onChange={e => setField('libreBase', parseFloat(e.target.value) || 0)}
              />
            </div>
            {data.dolar > 0 && (
              <div className="input-row two" style={{ marginTop: 10 }}>
                <label style={{ fontSize: 13, color: 'var(--text2)' }}>Dólar (referencia)</label>
                <input className="inline" type="number" value={data.dolar || 0}
                  onChange={e => setField('dolar', parseFloat(e.target.value) || 0)} />
              </div>
            )}
          </div>
        </>
      )}

      {/* ── INGRESOS ─────────────────────────────────────────── */}
      {activeTab === 'ingresos' && (
        <div className="card">
          <div className="card-title">
            <div className="card-title-left"><TrendingUp size={14} /> Ingresos del mes</div>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--green)' }}>
              {fmtARS(calc.ingresosBrutos)}
            </span>
          </div>
          <div className="items-list">
            {data.ingresos.map(item => (
              <div key={item.id} className="item-row three-col">
                <input className="inline" value={item.concepto}
                  placeholder="Concepto"
                  onChange={e => updateListItem('ingresos', item.id, 'concepto', e.target.value)} />
                <input className="inline" type="number" value={item.monto}
                  placeholder="Monto"
                  onChange={e => updateListItem('ingresos', item.id, 'monto', parseFloat(e.target.value) || 0)} />
                <button className="btn-icon" onClick={() => removeListItem('ingresos', item.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <button className="btn-add" style={{ marginTop: 10 }}
            onClick={() => addListItem('ingresos')}>
            <Plus size={14} /> Agregar ingreso
          </button>

          <hr className="divider" />
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Ingresos brutos</span><span style={{ fontWeight: 600 }}>{fmtARS(calc.ingresosBrutos)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Apartado ({Math.round((data.apartado || 0) * 100)}%)</span>
              <span style={{ color: 'var(--red)' }}>– {fmtARS(calc.montoApartado)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Libre base</span>
              <span style={{ color: 'var(--yellow)' }}>– {fmtARS(data.libreBase || 0)}</span>
            </div>
            <hr className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
              <span>Ingresos netos</span>
              <span style={{ color: 'var(--accent3)' }}>{fmtARS(calc.ingresosNetos)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── GASTOS FIJOS ─────────────────────────────────────── */}
      {activeTab === 'fijos' && (
        <div className="card">
          <div className="card-title">
            <div className="card-title-left"><Home size={14} /> Gastos fijos</div>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--red)' }}>
              {fmtARS(calc.sumaGastosFijos)}
            </span>
          </div>
          <div className="items-list">
            {data.gastosFijos.map(item => (
              <div key={item.id} className="item-row three-col">
                <input className="inline" value={item.concepto}
                  placeholder="Concepto"
                  onChange={e => updateListItem('gastosFijos', item.id, 'concepto', e.target.value)} />
                <input className="inline" type="number" value={item.monto}
                  placeholder="Monto"
                  onChange={e => updateListItem('gastosFijos', item.id, 'monto', parseFloat(e.target.value) || 0)} />
                <button className="btn-icon" onClick={() => removeListItem('gastosFijos', item.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <button className="btn-add" style={{ marginTop: 10 }}
            onClick={() => addListItem('gastosFijos')}>
            <Plus size={14} /> Agregar gasto fijo
          </button>
        </div>
      )}

      {/* ── TARJETAS ─────────────────────────────────────────── */}
      {activeTab === 'tarjetas' && (
        <>
          {data.tarjetas.map(tarjeta => (
            <TarjetaSection
              key={tarjeta.id}
              tarjeta={tarjeta}
              onUpdate={(changes) => updateTarjeta(tarjeta.id, changes)}
              onRemove={() => removeTarjeta(tarjeta.id)}
            />
          ))}
          <button className="btn btn-ghost" style={{ marginBottom: 12 }}
            onClick={addTarjeta}>
            <Plus size={14} /> Agregar tarjeta
          </button>

          <div className="card">
            <div className="card-title"><div className="card-title-left">Resumen tarjetas</div></div>
            {calc.tarjetasDetalle.map(t => (
              <div key={t.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: 14,
              }}>
                <span style={{ color: 'var(--text2)' }}>{t.nombre}</span>
                <span style={{ fontWeight: 600 }}>{fmtARS(t.total)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontWeight: 700, fontSize: 15 }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent3)' }}>{fmtARS(calc.sumaTarjetas)}</span>
            </div>
          </div>
        </>
      )}

      {/* ── OTROS GASTOS ─────────────────────────────────────── */}
      {activeTab === 'otros' && (
        <div className="card">
          <div className="card-title">
            <div className="card-title-left"><ShoppingBag size={14} /> Otros gastos del mes</div>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--red)' }}>
              {fmtARS(calc.sumaOtros)}
            </span>
          </div>
          <div className="items-list">
            {data.otrosGastos.map(item => (
              <div key={item.id} className="item-row three-col">
                <input className="inline" value={item.concepto}
                  placeholder="Concepto (ej: Uber)"
                  onChange={e => updateListItem('otrosGastos', item.id, 'concepto', e.target.value)} />
                <input className="inline" type="number" value={item.monto}
                  placeholder="Monto"
                  onChange={e => updateListItem('otrosGastos', item.id, 'monto', parseFloat(e.target.value) || 0)} />
                <button className="btn-icon" onClick={() => removeListItem('otrosGastos', item.id)}><Trash2 size={14} /></button>
              </div>
            ))}
            {data.otrosGastos.length === 0 && (
              <div style={{ color: 'var(--text3)', fontSize: 13, padding: '8px 0' }}>
                Sin otros gastos cargados
              </div>
            )}
          </div>
          <button className="btn-add" style={{ marginTop: 10 }}
            onClick={() => addListItem('otrosGastos')}>
            <Plus size={14} /> Agregar gasto
          </button>
        </div>
      )}

      {/* ── REINTEGROS ───────────────────────────────────────── */}
      {activeTab === 'reintegros' && (
        <div className="card">
          <div className="card-title">
            <div className="card-title-left"><RefreshCcw size={14} /> Reintegros / me deben</div>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--green)' }}>
              {fmtARS(calc.totalReintegros)}
            </span>
          </div>
          <div className="items-list">
            {data.reintegros.map(item => (
              <div key={item.id} className="item-row three-col">
                <input className="inline" value={item.concepto}
                  placeholder="De quién / concepto"
                  onChange={e => updateListItem('reintegros', item.id, 'concepto', e.target.value)} />
                <input className="inline" type="number" value={item.monto}
                  placeholder="Monto"
                  onChange={e => updateListItem('reintegros', item.id, 'monto', parseFloat(e.target.value) || 0)} />
                <button className="btn-icon" onClick={() => removeListItem('reintegros', item.id)}><Trash2 size={14} /></button>
              </div>
            ))}
            {data.reintegros.length === 0 && (
              <div style={{ color: 'var(--text3)', fontSize: 13, padding: '8px 0' }}>
                Sin reintegros cargados
              </div>
            )}
          </div>
          <button className="btn-add" style={{ marginTop: 10 }}
            onClick={() => addListItem('reintegros')}>
            <Plus size={14} /> Agregar reintegro
          </button>
        </div>
      )}
    </>
  )
}

function BarraGasto({ calc, data }) {
  const total = calc.ingresosBrutos
  if (total === 0) return <div style={{ color: 'var(--text3)', fontSize: 13 }}>Sin datos</div>

  const segs = [
    { label: 'Fijos', val: calc.sumaGastosFijos, color: '#ef4444' },
    { label: 'Tarjetas', val: calc.sumaTarjetas, color: '#f59e0b' },
    { label: 'Otros', val: calc.sumaOtros, color: '#e879f9' },
    { label: 'Libre', val: data.libreBase || 0, color: '#6c63ff' },
    { label: 'Apartado', val: calc.montoApartado, color: '#22d3ee' },
  ]
  const rest = total - segs.reduce((a, s) => a + s.val, 0)
  if (rest > 0) segs.push({ label: 'Ahorro', val: rest, color: '#22c55e' })

  return (
    <>
      <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
        {segs.filter(s => s.val > 0).map(s => (
          <div key={s.label} style={{
            width: `${Math.min(100, (s.val / total) * 100)}%`,
            background: s.color,
            transition: 'width .4s',
          }} title={`${s.label}: ${fmtARS(s.val)}`} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
        {segs.filter(s => s.val > 0).map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
            <span style={{ color: 'var(--text2)' }}>{s.label}</span>
            <span style={{ fontWeight: 600 }}>{fmtARS(s.val)}</span>
          </div>
        ))}
      </div>
    </>
  )
}
