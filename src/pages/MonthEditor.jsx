import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, RefreshCcw, TrendingUp, CreditCard, GripVertical } from 'lucide-react'
import {
  loadMonth, saveMonth, calcMonth, fmtARS, fmtUSD, uid,
  loadPendingPurchases, monthName, getTarjetaColor, listMonths,
} from '../store'
import TarjetaSection from '../components/TarjetaSection'
import GastosFijosSection from '../components/GastosFijosSection'
import ProyeccionTable from '../components/ProyeccionTable'
import AhorrosPanel from '../components/AhorrosPanel'
import DolarWidget, { useDolar } from '../components/DolarWidget'
import NumInput from '../components/NumInput'

export default function MonthEditor({ monthId, onRefresh, toast }) {
  const [data, setData]       = useState(null)
  const [pending, setPending] = useState([])
  const [activeTab, setActiveTab] = useState('resumen')
  const { compra: dolarCompra, venta: dolarVenta, loading: dolarLoading,
          lastUpdate, error: dolarError, refresh: refreshDolar } = useDolar()

  useEffect(() => {
    const d = loadMonth(monthId)
    if (d) setData(d)
    setPending(loadPendingPurchases())
  }, [monthId])

  const save = useCallback((updated) => {
    saveMonth(updated)
    setData({ ...updated })
    onRefresh()
  }, [onRefresh])

  function updateListItem(listKey, id, field, value) {
    save({ ...data, [listKey]: (data[listKey] || []).map(i => i.id === id ? { ...i, [field]: value } : i) })
  }
  function addToList(listKey, defaults = {}) {
    save({ ...data, [listKey]: [...(data[listKey] || []), { id: uid(), concepto: '', monto: 0, usd: false, ...defaults }] })
  }
  function removeFromList(listKey, id) {
    save({ ...data, [listKey]: (data[listKey] || []).filter(i => i.id !== id) })
  }
  function reorderList(listKey, newList) {
    save({ ...data, [listKey]: newList })
  }
  function updateTarjeta(tid, changes) {
    save({ ...data, tarjetas: data.tarjetas.map(t => t.id === tid ? { ...t, ...changes } : t) })
  }
  function deleteMonth() {
    if (!window.confirm(`¿Eliminar ${monthName(data.month)} ${data.year}? Esta acción no se puede deshacer.`)) return
    localStorage.removeItem('mc_' + data.id)
    onRefresh()
    window.location.reload()
  }

  if (!data) return <div style={{ padding: 24, color: 'var(--text3)' }}>Cargando…</div>

  const sd = {  // safeData — compatibilidad con datos viejos
    ingresosFijos:  data.ingresosFijos  || data.ingresos || [],
    ingresosExtras: data.ingresosExtras || [],
    reintegros:     data.reintegros     || [],
    gastosFijos:    data.gastosFijos    || [],
    otrosGastos:    data.otrosGastos    || [],
    tarjetas:       data.tarjetas       || [],
    pctAhorroLibre: data.pctAhorroLibre ?? data.apartado ?? 0.23,
    factorUSD:      data.factorUSD      ?? 0.5,
    factorYPF:      data.factorYPF      ?? 0.5,
    libreBase:      data.libreBase      ?? 0,
    ...data,
  }

  const venta  = dolarVenta  || sd.dolarVenta  || 0
  const compra = dolarCompra || sd.dolarCompra || 0
  const calc   = calcMonth(sd, pending, venta, compra)

  const tabs = [
    { key: 'resumen',  label: 'Resumen'  },
    { key: 'ingresos', label: 'Ingresos' },
    { key: 'gastos',   label: 'Gastos'   },
    { key: 'tarjetas', label: 'Tarjetas' },
    { key: 'ahorros',  label: 'Ahorros'  },
  ]

  return (
    <>
      {/* Top bar dólar + eliminar mes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <DolarWidget compra={compra} venta={venta}
          loading={dolarLoading} lastUpdate={lastUpdate}
          error={dolarError} onRefresh={refreshDolar} compact />
        <button onClick={deleteMonth} style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: 6,
          color: 'var(--text3)', fontSize: 12, padding: '4px 10px', cursor: 'pointer',
        }}>
          <Trash2 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          Eliminar mes
        </button>
      </div>

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── RESUMEN ─────────────────────────────────────────── */}
      {activeTab === 'resumen' && (
        <>
          {/* Tres grandes números */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
            <StatBox label="Ingresos" val={fmtARS(calc.ingresosBrutos)} color="#22c55e" />
            <StatBox label="Gastos"   val={fmtARS(calc.gastosTotales)}  color="#ef4444" />
            <StatBox label="Te queda" val={fmtARS(calc.presupuesto)}
              color={calc.presupuesto >= 0 ? '#22c55e' : '#ef4444'} highlight />
          </div>

          {/* Barra */}
          <BarraGasto calc={calc} />

          {/* Desglose */}
          <div className="s-card" style={{ marginTop: 10 }}>
            <SRow label="Ingresos brutos"                          val={fmtARS(calc.ingresosBrutos)}       color="#22c55e" bold />
            <SRow label={`  Ahorro + libre (${Math.round(calc.pct*100)}%)`} val={`− ${fmtARS(calc.montoAhorroLibre)}`} color="var(--text3)" />
            <SRow label="  Para gastos"                            val={fmtARS(calc.ingresosParaGastos)}   color="var(--text2)" />
            <div style={{ borderTop:'1px solid var(--border)', margin:'6px 0' }} />
            <SRow label="Gastos fijos"    val={`− ${fmtARS(calc.sumaGastosFijosNetos)}`} color="var(--text2)" />
            <SRow label="Tarjetas"        val={`− ${fmtARS(calc.sumaTarjetas)}`}          color="var(--text2)" />
            {calc.totalReintegros > 0 && <SRow label="Reintegros" val={`+ ${fmtARS(calc.totalReintegros)}`} color="#22c55e" />}
            <div style={{ borderTop:'1px solid var(--border)', margin:'6px 0' }} />
            <SRow label="Te queda" val={fmtARS(calc.presupuesto)}
              color={calc.presupuesto >= 0 ? '#22c55e' : '#ef4444'} bold />
          </div>

          {/* Config */}
          <div className="s-card" style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Configuración</div>
            <CfgRow label="% ahorro + libre">
              <NumInput value={Math.round(sd.pctAhorroLibre * 100)}
                onChange={v => save({ ...data, pctAhorroLibre: Math.min(1, Math.max(0, v/100)) })}
                style={{ width: 70 }} />
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>%</span>
            </CfgRow>
            <CfgRow label="Libre (gustitos)">
              <NumInput value={sd.libreBase} onChange={v => save({ ...data, libreBase: v })} style={{ width: 140 }} />
            </CfgRow>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
              Libre disponible: <strong style={{ color: calc.libreDisponible >= 0 ? 'var(--accent3)' : '#ef4444' }}>{fmtARS(calc.libreDisponible)}</strong>
              {'  '}·{'  '}Ahorro del mes: <strong style={{ color: '#22c55e' }}>{fmtARS(calc.montoAhorro)}</strong>
            </div>
          </div>

          {/* Tarjetas resumen */}
          <div className="s-card" style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Tarjetas</div>
            {calc.tarjetasDetalle.map(t => {
              const c = getTarjetaColor(t.nombre)
              return (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', borderRadius: 5, marginBottom: 3, background: `${c.bg}18`, borderLeft: `3px solid ${c.bg}` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t.nombre}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtARS(t.total)}</span>
                    {t.debitos > 0 && <div style={{ fontSize: 10, color: 'var(--text3)' }}>+ {fmtARS(t.debitos)} auto</div>}
                  </div>
                </div>
              )
            })}
          </div>

          <ProyeccionTable proyeccion={calc.proyeccion} currentYear={sd.year} currentMonth={sd.month} />
        </>
      )}

      {/* ── INGRESOS ─────────────────────────────────────────── */}
      {activeTab === 'ingresos' && (
        <>
          <SectionBlock
            title="Fijos"
            subtitle="Se copian al mes siguiente"
            total={fmtARS(calc.ingresosFijosTotal)}
            items={sd.ingresosFijos}
            onReorder={list => reorderList('ingresosFijos', list)}
            onAdd={() => addToList('ingresosFijos')}
            renderItem={item => (
              <ItemRow key={item.id} item={item} venta={venta}
                onChange={(f,v) => updateListItem('ingresosFijos', item.id, f, v)}
                onRemove={() => removeFromList('ingresosFijos', item.id)} />
            )}
          />
          <SectionBlock
            title="Extras"
            subtitle="No se copian al mes siguiente"
            total={fmtARS(calc.ingresosExtrasTotal)}
            items={sd.ingresosExtras}
            onReorder={list => reorderList('ingresosExtras', list)}
            onAdd={() => addToList('ingresosExtras')}
            renderItem={item => (
              <ItemRow key={item.id} item={item} venta={venta}
                onChange={(f,v) => updateListItem('ingresosExtras', item.id, f, v)}
                onRemove={() => removeFromList('ingresosExtras', item.id)} />
            )}
          />
          <SectionBlock
            title="Reintegros"
            subtitle="Me deben"
            total={fmtARS(calc.totalReintegros)}
            items={sd.reintegros}
            onReorder={list => reorderList('reintegros', list)}
            onAdd={() => addToList('reintegros')}
            renderItem={item => (
              <ItemRow key={item.id} item={item} venta={venta}
                onChange={(f,v) => updateListItem('reintegros', item.id, f, v)}
                onRemove={() => removeFromList('reintegros', item.id)} />
            )}
          />
        </>
      )}

      {/* ── GASTOS ───────────────────────────────────────────── */}
      {activeTab === 'gastos' && (
        <GastosFijosSection
          gastosFijos={sd.gastosFijos}
          otrosGastos={sd.otrosGastos}
          tarjetas={sd.tarjetas}
          onChangeFijos={gf => save({ ...data, gastosFijos: gf })}
          onChangeOtros={og => save({ ...data, otrosGastos: og })}
          dolar={venta}
        />
      )}

      {/* ── TARJETAS ─────────────────────────────────────────── */}
      {activeTab === 'tarjetas' && (
        <>
          {sd.tarjetas.map(t => (
            <TarjetaSection key={t.id} tarjeta={t}
              onUpdate={ch => updateTarjeta(t.id, ch)}
              onRemove={() => save({ ...data, tarjetas: data.tarjetas.filter(x => x.id !== t.id) })}
              debitosAuto={calc.debitosAutoXTarjeta[t.nombre] || 0} />
          ))}
          <button className="s-add-btn"
            onClick={() => save({ ...data, tarjetas: [...data.tarjetas, { id: uid(), nombre: 'Nueva tarjeta', mantenimiento: 0, items: [] }] })}>
            +
          </button>
        </>
      )}

      {/* ── AHORROS ──────────────────────────────────────────── */}
      {activeTab === 'ahorros' && (
        <>
          <DolarWidget compra={compra} venta={venta} loading={dolarLoading}
            lastUpdate={lastUpdate} error={dolarError} onRefresh={refreshDolar} />

          <div className="s-card" style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
              Distribución del ahorro del mes
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#22c55e', marginBottom: 4 }}>{fmtARS(calc.montoAhorro)}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
              {fmtARS(calc.ingresosBrutos)} × {Math.round(calc.pct*100)}% − {fmtARS(calc.libre)} libre
            </div>
            <FactorRow label="USD" factor={sd.factorUSD} monto={calc.montoAhorro*(sd.factorUSD??0.5)} color="var(--yellow)"
              onChange={v => { const f=Math.min(1,Math.max(0,v/100)); save({...data,factorUSD:f,factorYPF:+(1-f).toFixed(4)}) }} />
            <FactorRow label="YPF" factor={sd.factorYPF} monto={calc.montoAhorro*(sd.factorYPF??0.5)} color="var(--accent3)"
              onChange={v => { const f=Math.min(1,Math.max(0,v/100)); save({...data,factorYPF:f,factorUSD:+(1-f).toFixed(4)}) }} />
          </div>

          <AhorrosPanel
            dolarCompra={compra} dolarVenta={venta}
            ahorroMes={calc.montoAhorro}
            factorUSD={sd.factorUSD??0.5}
            factorYPF={sd.factorYPF??0.5}
          />
        </>
      )}
    </>
  )
}

// ── Helpers visuales ─────────────────────────────────────────────────────────
function StatBox({ label, val, color, highlight }) {
  return (
    <div style={{
      background: highlight ? `${color}14` : 'var(--bg2)',
      border: `1px solid ${highlight ? color+'44' : 'var(--border)'}`,
      borderRadius: 8, padding: '10px 12px',
    }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color, lineHeight: 1.2 }}>{val}</div>
    </div>
  )
}
function SRow({ label, val, color, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 400, color }}>{val}</span>
    </div>
  )
}
function CfgRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 13, color: 'var(--text2)', flex: 1 }}>{label}</span>
      {children}
    </div>
  )
}
function BarraGasto({ calc }) {
  const total = calc.ingresosBrutos || 1
  const segs = [
    { l:'Libre',    v:calc.libre,                c:'#6c63ff' },
    { l:'Ahorro',   v:calc.montoAhorro,          c:'#22c55e' },
    { l:'Fijos',    v:calc.sumaGastosFijosNetos, c:'#ef4444' },
    { l:'Tarjetas', v:calc.sumaTarjetas,          c:'#f59e0b' },
  ].filter(s => s.v > 0)
  const rest = total - segs.reduce((a,s) => a+s.v, 0)
  if (rest > 0) segs.push({ l:'Disponible', v:rest, c:'#22d3ee' })
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display:'flex', height:12, borderRadius:4, overflow:'hidden', marginBottom:6 }}>
        {segs.map(s => <div key={s.l} style={{ width:`${(s.v/total)*100}%`, background:s.c }} title={`${s.l}: ${fmtARS(s.v)}`} />)}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'3px 12px' }}>
        {segs.map(s => (
          <span key={s.l} style={{ fontSize:11, color:'var(--text3)', display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:7, height:7, borderRadius:2, background:s.c, display:'inline-block' }} />
            {s.l}: <strong style={{ color:'var(--text2)' }}>{fmtARS(s.v)}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}
function FactorRow({ label, factor, monto, color, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
      <span style={{ fontSize:13, fontWeight:700, color, width:36 }}>{label}</span>
      <NumInput value={Math.round((factor??0.5)*100)} onChange={onChange} style={{ width:64 }} />
      <span style={{ fontSize:12, color:'var(--text3)' }}>%</span>
      <span style={{ fontSize:13, fontWeight:600, color, marginLeft:'auto' }}>{fmtARS(monto)}</span>
    </div>
  )
}

// ── SectionBlock: bloque con título, drag & drop y botón + ──────────────────
function SectionBlock({ title, subtitle, total, items, onReorder, onAdd, renderItem }) {
  const dragIdx = useRef(null)
  const [overIdx, setOverIdx] = useState(null)

  function onDragStart(e, i) {
    dragIdx.current = i
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e, i) {
    e.preventDefault()
    setOverIdx(i)
  }
  function onDrop(e, i) {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === i) { reset(); return }
    const list = [...items]
    const [moved] = list.splice(dragIdx.current, 1)
    list.splice(i, 0, moved)
    onReorder(list)
    reset()
  }
  function reset() { dragIdx.current = null; setOverIdx(null) }

  return (
    <div className="s-card" style={{ marginBottom: 10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{title}</span>
          {subtitle && <span style={{ fontSize:11, color:'var(--text3)', marginLeft:8 }}>{subtitle}</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#22c55e' }}>{total}</span>
          <button className="s-add-btn" onClick={onAdd}>+</button>
        </div>
      </div>
      {items.map((item, i) => (
        <div key={item.id}
          draggable
          onDragStart={e => onDragStart(e, i)}
          onDragOver={e => onDragOver(e, i)}
          onDrop={e => onDrop(e, i)}
          onDragEnd={reset}
          style={{
            display:'flex', alignItems:'center', gap:6,
            borderTop: i === 0 ? '1px solid var(--border)' : 'none',
            borderBottom: overIdx === i ? '2px solid var(--accent)' : '1px solid var(--border)',
            opacity: dragIdx.current === i ? 0.4 : 1,
          }}
        >
          <GripVertical size={13} style={{ color:'var(--text3)', flexShrink:0, cursor:'grab' }} />
          <div style={{ flex:1 }}>{renderItem(item)}</div>
        </div>
      ))}
      {items.length === 0 && <div style={{ fontSize:12, color:'var(--text3)', padding:'4px 0' }}>—</div>}
    </div>
  )
}

// ── ItemRow (ingreso / reintegro) ────────────────────────────────────────────
function ItemRow({ item, venta, onChange, onRemove }) {
  const montoARS = item.usd && venta > 0 ? (item.monto||0)*venta : null
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 44px 22px', gap:6, alignItems:'center', padding:'4px 0' }}>
      <input className="inline" value={item.concepto} placeholder="Concepto"
        onMouseDown={e=>e.stopPropagation()}
        onChange={e => onChange('concepto', e.target.value)} />
      <div>
        <NumInput value={item.monto} onChange={v => onChange('monto',v)} usd={item.usd} style={{ width:'100%' }} />
        {item.usd && venta>0 && item.monto>0 && (
          <div style={{ fontSize:10, color:'var(--text3)', textAlign:'right' }}>= {fmtARS(montoARS)}</div>
        )}
      </div>
      <button onMouseDown={e=>e.stopPropagation()} onClick={() => onChange('usd',!item.usd)}
        style={{ padding:'3px 6px', borderRadius:3, border:'none', cursor:'pointer', fontSize:10, fontWeight:700,
          background: item.usd ? 'rgba(245,158,11,.2)' : 'var(--bg4)',
          color: item.usd ? 'var(--yellow)' : 'var(--text3)' }}>
        {item.usd?'USD':'ARS'}
      </button>
      <button className="btn-icon" onMouseDown={e=>e.stopPropagation()} onClick={onRemove}><Trash2 size={12}/></button>
    </div>
  )
}
