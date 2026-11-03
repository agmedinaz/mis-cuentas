import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, RefreshCcw, ShoppingBag, TrendingUp, Home } from 'lucide-react'
import { loadMonth, saveMonth, calcMonth, fmtARS, uid, loadPendingPurchases, monthName } from '../store'
import LibreCard from '../components/LibreCard'
import TarjetaSection from '../components/TarjetaSection'
import GastosFijosSection from '../components/GastosFijosSection'
import ProyeccionTable from '../components/ProyeccionTable'
import AhorrosPanel from '../components/AhorrosPanel'
import DolarWidget, { useDolar } from '../components/DolarWidget'
import NumInput from '../components/NumInput'

export default function MonthEditor({ monthId, onRefresh, toast }) {
  const [data, setData] = useState(null)
  const [pending, setPending] = useState([])
  const [activeTab, setActiveTab] = useState('resumen')
  const { dolar, loading: dolarLoading, lastUpdate, error: dolarError, refresh: refreshDolar } = useDolar()

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

  function setField(key, value) { save({ ...data, [key]: value }) }

  function updateListItem(listKey, id, field, value) {
    save({ ...data, [listKey]: data[listKey].map(i => i.id === id ? { ...i, [field]: value } : i) })
  }
  function addListItem(listKey, defaults = {}) {
    save({ ...data, [listKey]: [...(data[listKey] || []), { id: uid(), concepto: '', monto: 0, ...defaults }] })
  }
  function removeListItem(listKey, id) {
    save({ ...data, [listKey]: data[listKey].filter(i => i.id !== id) })
  }

  function updateTarjeta(tarjetaId, changes) {
    save({ ...data, tarjetas: data.tarjetas.map(t => t.id === tarjetaId ? { ...t, ...changes } : t) })
  }
  function addTarjeta() {
    save({ ...data, tarjetas: [...data.tarjetas, { id: uid(), nombre: 'Nueva tarjeta', mantenimiento: 0, items: [] }] })
  }
  function removeTarjeta(id) {
    save({ ...data, tarjetas: data.tarjetas.filter(t => t.id !== id) })
  }

  if (!data) return <div style={{ padding: 24, color: 'var(--text3)' }}>Cargando…</div>

  const dolarActual = dolar || data.dolar || 0
  const calc = calcMonth(data, pending, dolarActual)

  const tabs = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'ingresos', label: 'Ingresos' },
    { key: 'fijos', label: 'Gastos fijos' },
    { key: 'tarjetas', label: 'Tarjetas' },
    { key: 'otros', label: 'Otros' },
    { key: 'reintegros', label: 'Reintegros' },
    { key: 'ahorros', label: 'Ahorros' },
  ]

  return (
    <>
      {/* Dólar widget compacto en cabecera */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <DolarWidget dolar={dolarActual} loading={dolarLoading} lastUpdate={lastUpdate} error={dolarError} onRefresh={refreshDolar} compact />
      </div>

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── RESUMEN ─────────────────────────────────────────── */}
      {activeTab === 'resumen' && (
        <>
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
              <div className="summary-sub">Disponible para gastar</div>
            </div>
            <div className="summary-card red">
              <div className="summary-label">Gastos totales</div>
              <div className="summary-value red">{fmtARS(calc.gastosTotales)}</div>
              <div className="summary-sub">Sin doble conteo</div>
            </div>
            <div className={`summary-card ${calc.presupuesto >= 0 ? 'green' : 'red'}`}>
              <div className="summary-label">Lo que te queda</div>
              <div className={`summary-value ${calc.presupuesto >= 0 ? 'green' : 'red'}`}>{fmtARS(calc.presupuesto)}</div>
              <div className="summary-sub">Netos − gastos totales</div>
            </div>
          </div>

          {/* Barra distribución */}
          <div className="card">
            <div className="card-title"><div className="card-title-left">Distribución del ingreso</div></div>
            <BarraGasto calc={calc} data={data} />
          </div>

          {/* Config rápida */}
          <div className="card">
            <div className="card-title"><div className="card-title-left">Configuración del mes</div></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: 'var(--text2)' }}>Apartado (% de brutos → ahorro)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <NumInput
                  value={Math.round((data.apartado || 0) * 100)}
                  onChange={v => setField('apartado', (v || 0) / 100)}
                  style={{ width: 80, textAlign: 'right' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>%</span>
              </div>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: 'var(--text3)' }}>
              Ahorro del mes = {fmtARS(calc.ingresosBrutos)} × {Math.round((data.apartado || 0) * 100)}% − {fmtARS(data.libreBase || 0)} libre = <strong style={{ color: 'var(--green)' }}>{fmtARS(calc.montoAhorro)}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 13, color: 'var(--text2)' }}>Dinero libre base (gustitos)</label>
              <NumInput value={data.libreBase || 0} onChange={v => setField('libreBase', v)} style={{ width: 120 }} />
            </div>
          </div>

          {/* Desglose tarjetas */}
          <div className="card">
            <div className="card-title"><div className="card-title-left">Resumen tarjetas</div></div>
            {calc.tarjetasDetalle.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <span style={{ color: 'var(--text2)' }}>{t.nombre}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 600 }}>{fmtARS(t.total)}</span>
                  {t.debitos > 0 && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>incl. {fmtARS(t.debitos)} auto</span>}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontWeight: 700, fontSize: 15 }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent3)' }}>{fmtARS(calc.sumaTarjetas)}</span>
            </div>
          </div>

          {/* Proyección */}
          <ProyeccionTable proyeccion={calc.proyeccion} currentYear={data.year} currentMonth={data.month} />
        </>
      )}

      {/* ── INGRESOS ─────────────────────────────────────────── */}
      {activeTab === 'ingresos' && (
        <div className="card">
          <div className="card-title">
            <div className="card-title-left"><TrendingUp size={14} /> Ingresos del mes</div>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--green)' }}>{fmtARS(calc.ingresosBrutos)}</span>
          </div>
          {data.ingresos.map(item => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 24px', gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
              <input className="inline" value={item.concepto} placeholder="Concepto"
                onChange={e => updateListItem('ingresos', item.id, 'concepto', e.target.value)} />
              <NumInput value={item.monto} onChange={v => updateListItem('ingresos', item.id, 'monto', v)} />
              <button className="btn-icon" onClick={() => removeListItem('ingresos', item.id)}><Trash2 size={14} /></button>
            </div>
          ))}
          <button className="btn-add" style={{ marginTop: 10 }} onClick={() => addListItem('ingresos')}><Plus size={14} /> Agregar ingreso</button>
          <hr className="divider" />
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            {[
              { label: 'Ingresos brutos', val: calc.ingresosBrutos, color: 'var(--green)' },
              { label: `Apartado (${Math.round((data.apartado||0)*100)}%) → ahorro`, val: -calc.montoAhorro, neg: true },
              { label: 'Libre base', val: -(data.libreBase||0), neg: true },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>{r.label}</span>
                <span style={{ fontWeight: 600, color: r.color || (r.neg ? 'var(--red)' : undefined) }}>{r.neg ? '–' : ''}{fmtARS(Math.abs(r.val))}</span>
              </div>
            ))}
            <hr className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
              <span>Ingresos netos (para gastar)</span>
              <span style={{ color: 'var(--accent3)' }}>{fmtARS(calc.ingresosNetos)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── GASTOS FIJOS ─────────────────────────────────────── */}
      {activeTab === 'fijos' && (
        <GastosFijosSection
          gastosFijos={data.gastosFijos || []}
          tarjetas={data.tarjetas || []}
          onChange={gf => save({ ...data, gastosFijos: gf })}
          dolar={dolarActual}
        />
      )}

      {/* ── TARJETAS ─────────────────────────────────────────── */}
      {activeTab === 'tarjetas' && (
        <>
          {data.tarjetas.map(tarjeta => (
            <TarjetaSection
              key={tarjeta.id}
              tarjeta={tarjeta}
              onUpdate={changes => updateTarjeta(tarjeta.id, changes)}
              onRemove={() => removeTarjeta(tarjeta.id)}
              debitosAuto={calc.debitosAutoXTarjeta[tarjeta.nombre] || 0}
            />
          ))}
          <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={addTarjeta}><Plus size={14} /> Agregar tarjeta</button>
          <div className="card">
            <div className="card-title"><div className="card-title-left">Resumen tarjetas</div></div>
            {calc.tarjetasDetalle.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <span style={{ color: 'var(--text2)' }}>{t.nombre}</span>
                <span style={{ fontWeight: 600 }}>{fmtARS(t.total)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontWeight: 700, fontSize: 15 }}>
              <span>Total</span><span style={{ color: 'var(--accent3)' }}>{fmtARS(calc.sumaTarjetas)}</span>
            </div>
          </div>
        </>
      )}

      {/* ── OTROS ────────────────────────────────────────────── */}
      {activeTab === 'otros' && (
        <div className="card">
          <div className="card-title">
            <div className="card-title-left"><ShoppingBag size={14} /> Otros gastos del mes</div>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--red)' }}>{fmtARS(calc.sumaOtros)}</span>
          </div>
          {(data.otrosGastos || []).map(item => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 24px', gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
              <input className="inline" value={item.concepto} placeholder="Concepto (ej: Uber)"
                onChange={e => updateListItem('otrosGastos', item.id, 'concepto', e.target.value)} />
              <NumInput value={item.monto} onChange={v => updateListItem('otrosGastos', item.id, 'monto', v)} />
              <button className="btn-icon" onClick={() => removeListItem('otrosGastos', item.id)}><Trash2 size={14} /></button>
            </div>
          ))}
          {(!data.otrosGastos || data.otrosGastos.length === 0) && <div style={{ color: 'var(--text3)', fontSize: 13, padding: '8px 0' }}>Sin otros gastos</div>}
          <button className="btn-add" style={{ marginTop: 10 }} onClick={() => addListItem('otrosGastos')}><Plus size={14} /> Agregar gasto</button>
        </div>
      )}

      {/* ── REINTEGROS ───────────────────────────────────────── */}
      {activeTab === 'reintegros' && (
        <div className="card">
          <div className="card-title">
            <div className="card-title-left"><RefreshCcw size={14} /> Reintegros / me deben</div>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--green)' }}>{fmtARS(calc.totalReintegros)}</span>
          </div>
          {(data.reintegros || []).map(item => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 24px', gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
              <input className="inline" value={item.concepto} placeholder="De quién / concepto"
                onChange={e => updateListItem('reintegros', item.id, 'concepto', e.target.value)} />
              <NumInput value={item.monto} onChange={v => updateListItem('reintegros', item.id, 'monto', v)} />
              <button className="btn-icon" onClick={() => removeListItem('reintegros', item.id)}><Trash2 size={14} /></button>
            </div>
          ))}
          {(!data.reintegros || data.reintegros.length === 0) && <div style={{ color: 'var(--text3)', fontSize: 13, padding: '8px 0' }}>Sin reintegros</div>}
          <button className="btn-add" style={{ marginTop: 10 }} onClick={() => addListItem('reintegros')}><Plus size={14} /> Agregar reintegro</button>
        </div>
      )}

      {/* ── AHORROS ──────────────────────────────────────────── */}
      {activeTab === 'ahorros' && (
        <>
          <DolarWidget dolar={dolarActual} loading={dolarLoading} lastUpdate={lastUpdate} error={dolarError} onRefresh={refreshDolar} />
          <div style={{ marginTop: 16 }}>
            <AhorrosPanel dolar={dolarActual} />
          </div>
        </>
      )}
    </>
  )
}

function BarraGasto({ calc, data }) {
  const total = calc.ingresosBrutos
  if (total === 0) return <div style={{ color: 'var(--text3)', fontSize: 13 }}>Sin datos de ingresos</div>
  const segs = [
    { label: 'Fijos propios', val: calc.sumaGastosFijosNetos, color: '#ef4444' },
    { label: 'Tarjetas', val: calc.sumaTarjetas, color: '#f59e0b' },
    { label: 'Otros', val: calc.sumaOtros, color: '#e879f9' },
    { label: 'Libre', val: data.libreBase || 0, color: '#6c63ff' },
    { label: 'Ahorro', val: calc.montoAhorro, color: '#22c55e' },
  ]
  const rest = total - segs.reduce((a, s) => a + s.val, 0)
  if (rest > 0) segs.push({ label: 'Disponible', val: rest, color: '#22d3ee' })
  return (
    <>
      <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
        {segs.filter(s => s.val > 0).map(s => (
          <div key={s.label} style={{ width: `${Math.min(100, (s.val/total)*100)}%`, background: s.color, transition: 'width .4s' }} title={`${s.label}: ${fmtARS(s.val)}`} />
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
