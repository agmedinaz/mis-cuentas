import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Trash2, CreditCard, GripVertical, Undo2, Redo2, MoreHorizontal } from 'lucide-react'
import {
  loadMonth, saveMonth, calcMonth, fmtARS, fmtUSD, uid,
  loadPendingPurchases, monthName, getTarjetaColor,
} from '../store'
import TarjetaSection from '../components/TarjetaSection'
import GastosFijosSection from '../components/GastosFijosSection'
import ProyeccionTable from '../components/ProyeccionTable'
import AhorrosPanel from '../components/AhorrosPanel'
import DolarWidget, { useDolar } from '../components/DolarWidget'
import NumInput from '../components/NumInput'

const MAX_HISTORY = 40

export default function MonthEditor({ monthId, onRefresh, toast }) {
  const [data, setData]       = useState(null)
  const [pending, setPending] = useState([])
  const [activeTab, setActiveTab] = useState('resumen')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  // Undo/redo stacks — snapshots del estado del mes
  const past   = useRef([])   // stack de estados anteriores
  const future = useRef([])   // stack de estados "rehacibles"

  const { compra: dolarCompra, venta: dolarVenta, loading: dolarLoading,
          lastUpdate, error: dolarError, refresh: refreshDolar } = useDolar()

  useEffect(() => {
    const d = loadMonth(monthId)
    if (d) { setData(d); past.current = []; future.current = [] }
    setPending(loadPendingPurchases())
  }, [monthId])

  // save guarda en localStorage Y empuja el estado anterior al historial
  const save = useCallback((updated, skipHistory = false) => {
    if (!skipHistory && data) {
      past.current = [...past.current.slice(-MAX_HISTORY), JSON.stringify(data)]
      future.current = []   // al hacer un cambio nuevo se pierde el future
    }
    saveMonth(updated)
    setData({ ...updated })
    onRefresh()
  }, [data, onRefresh])

  function undo() {
    if (!past.current.length) return
    const prev = JSON.parse(past.current.pop())
    future.current = [JSON.stringify(data), ...future.current.slice(0, MAX_HISTORY)]
    saveMonth(prev)
    setData({ ...prev })
    onRefresh()
    toast && toast('Cambio deshecho', 'success', 1500)
  }

  function redo() {
    if (!future.current.length) return
    const next = JSON.parse(future.current.shift())
    past.current = [...past.current.slice(-MAX_HISTORY), JSON.stringify(data)]
    saveMonth(next)
    setData({ ...next })
    onRefresh()
    toast && toast('Cambio rehecho', 'success', 1500)
  }

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z)
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function updateListItem(listKey, id, field, value) {
    save({ ...data, [listKey]: (data[listKey] || []).map(i => i.id === id ? { ...i, [field]: value } : i) })
  }
  function addToList(listKey, defaults = {}) {
    save({ ...data, [listKey]: [...(data[listKey] || []), { id: uid(), concepto: '', monto: 0, usd: false, ...defaults }] })
  }
  function removeFromList(listKey, id) {
    // No confirmation dialog — undo handles it
    save({ ...data, [listKey]: (data[listKey] || []).filter(i => i.id !== id) })
  }
  function reorderList(listKey, newList) {
    save({ ...data, [listKey]: newList })
  }
  function updateTarjeta(tid, changes) {
    save({ ...data, tarjetas: data.tarjetas.map(t => t.id === tid ? { ...t, ...changes } : t) })
  }
  function confirmDeleteMonth() {
    localStorage.removeItem('mc_' + data.id)
    onRefresh()
    window.location.reload()
  }

  if (!data) return <div style={{ padding: 24, color: 'var(--text3)' }}>Cargando…</div>

  const canUndo = past.current.length > 0
  const canRedo = future.current.length > 0

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
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
        <DolarWidget compra={compra} venta={venta}
          loading={dolarLoading} lastUpdate={lastUpdate}
          error={dolarError} onRefresh={refreshDolar} compact />

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Undo */}
          <button
            onClick={undo} disabled={!canUndo}
            title="Deshacer (Ctrl+Z)"
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              color: canUndo ? 'var(--text2)' : 'var(--text3)', padding: '4px 8px',
              cursor: canUndo ? 'pointer' : 'default', opacity: canUndo ? 1 : 0.4,
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
            }}>
            <Undo2 size={13} /> Deshacer
          </button>
          {/* Redo */}
          <button
            onClick={redo} disabled={!canRedo}
            title="Rehacer (Ctrl+Y)"
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              color: canRedo ? 'var(--text2)' : 'var(--text3)', padding: '4px 8px',
              cursor: canRedo ? 'pointer' : 'default', opacity: canRedo ? 1 : 0.4,
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
            }}>
            <Redo2 size={13} /> Rehacer
          </button>
          {/* Menú con eliminar mes (escondido) */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(m => !m)}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                color: 'var(--text3)', padding: '4px 8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}>
              <MoreHorizontal size={14} />
            </button>
            {showMenu && (
              <>
                <div onClick={() => setShowMenu(false)}
                  style={{ position:'fixed', inset:0, zIndex:99 }} />
                <div style={{
                  position:'absolute', right:0, top:'calc(100% + 4px)',
                  background:'var(--bg2)', border:'1px solid var(--border)',
                  borderRadius:8, padding:'4px', minWidth:160, zIndex:100,
                  boxShadow:'0 4px 16px rgba(0,0,0,.3)',
                }}>
                  <button
                    onClick={() => { setShowMenu(false); setShowDeleteConfirm(true) }}
                    style={{
                      width:'100%', padding:'8px 12px', borderRadius:5, border:'none',
                      background:'none', color:'#ef4444', cursor:'pointer', fontSize:13,
                      textAlign:'left', display:'flex', alignItems:'center', gap:8,
                    }}>
                    <Trash2 size={13} /> Eliminar este mes
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal confirmar eliminar mes */}
      {showDeleteConfirm && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.6)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20,
        }} onClick={() => setShowDeleteConfirm(false)}>
          <div style={{
            background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12,
            padding:24, maxWidth:400, width:'100%',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>
              Eliminar {monthName(sd.month)} {sd.year}
            </div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:16 }}>
              Esta acción es permanente y no se puede deshacer. Todos los datos del mes se van a borrar.
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{
                padding:'7px 16px', borderRadius:6, border:'1px solid var(--border)',
                background:'none', color:'var(--text2)', cursor:'pointer', fontSize:13,
              }}>Cancelar</button>
              <button onClick={confirmDeleteMonth} style={{
                padding:'7px 16px', borderRadius:6, border:'none',
                background:'#ef4444', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700,
              }}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── RESUMEN ─────────────────────────────────────────── */}
      {activeTab === 'resumen' && (
        <>
          {/* 3 números grandes */}
          <div className="stat-grid">
            <div className="stat-box">
              <div className="stat-label">Ingresos</div>
              <div className="stat-val" style={{color:'var(--green)'}}>{fmtARS(calc.ingresosBrutos)}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Gastos</div>
              <div className="stat-val" style={{color:'var(--red)'}}>{fmtARS(calc.gastosTotales)}</div>
            </div>
            <div className="stat-box hl">
              <div className="stat-label">Te queda</div>
              <div className="stat-val" style={{color: calc.presupuesto>=0 ? 'var(--green)':'var(--red)'}}>
                {fmtARS(calc.presupuesto)}
              </div>
            </div>
          </div>

          {/* Barra */}
          <BarraGasto calc={calc} />

          {/* Desglose */}
          <div className="breakdown">
            <div className="breakdown-row"><span className="lbl">Ingresos brutos</span><span className="val" style={{color:'var(--green)',fontWeight:700}}>{fmtARS(calc.ingresosBrutos)}</span></div>
            <div className="breakdown-row indent"><span className="lbl">Ahorro + libre ({Math.round(calc.pct*100)}%)</span><span className="val" style={{color:'var(--text3)'}}>− {fmtARS(calc.montoAhorroLibre)}</span></div>
            <div className="breakdown-row indent"><span className="lbl">Para gastos</span><span className="val">{fmtARS(calc.ingresosParaGastos)}</span></div>
            <div className="breakdown-row sep"><span className="lbl">Gastos fijos</span><span className="val">− {fmtARS(calc.sumaGastosFijosNetos)}</span></div>
            <div className="breakdown-row"><span className="lbl">Tarjetas</span><span className="val">− {fmtARS(calc.sumaTarjetas)}</span></div>
            {calc.totalReintegros > 0 && <div className="breakdown-row"><span className="lbl">Reintegros</span><span className="val" style={{color:'var(--green)'}}>+ {fmtARS(calc.totalReintegros)}</span></div>}
            <div className="breakdown-row sep bold"><span className="lbl" style={{fontWeight:700}}>Te queda</span><span className="val" style={{color: calc.presupuesto>=0?'var(--green)':'var(--red)'}}>{fmtARS(calc.presupuesto)}</span></div>
          </div>

          {/* Config inline */}
          <div className="breakdown" style={{marginBottom:10}}>
            <div className="breakdown-row">
              <span className="lbl">% ahorro + libre</span>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <NumInput value={Math.round(sd.pctAhorroLibre*100)} onChange={v=>save({...data,pctAhorroLibre:Math.min(1,Math.max(0,v/100))})} style={{width:64}}/>
                <span style={{fontSize:11,color:'var(--text3)'}}>%</span>
              </div>
            </div>
            <div className="breakdown-row">
              <span className="lbl">Libre (gustitos)</span>
              <NumInput value={sd.libreBase} onChange={v=>save({...data,libreBase:v})} style={{width:130}}/>
            </div>
            <div className="breakdown-row" style={{fontSize:11,color:'var(--text3)'}}>
              <span>Libre disponible</span>
              <span style={{color: calc.libreDisponible>=0?'var(--accent3)':'var(--red)', fontWeight:600}}>{fmtARS(calc.libreDisponible)}</span>
            </div>
            <div className="breakdown-row" style={{fontSize:11,color:'var(--text3)'}}>
              <span>Ahorro del mes</span>
              <span style={{color:'var(--green)',fontWeight:600}}>{fmtARS(calc.montoAhorro)}</span>
            </div>
          </div>

          {/* Tarjetas mini */}
          <div className="s-section">
            <div className="s-section-header">
              <span className="s-section-title">Tarjetas</span>
              <span className="s-section-total">{fmtARS(calc.sumaTarjetas)}</span>
            </div>
            {calc.tarjetasDetalle.map(t => {
              const c = getTarjetaColor(t.nombre)
              return (
                <div key={t.id} className="s-row" style={{borderLeft:`3px solid ${c.bg}`, paddingLeft:8}}>
                  <span style={{flex:1,fontWeight:600}}>{t.nombre}</span>
                  <span style={{fontWeight:700}}>{fmtARS(t.total)}</span>
                  {t.debitos>0 && <span style={{fontSize:10,color:'var(--text3)'}}>({fmtARS(t.debitos)} auto)</span>}
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
function BarraGasto({ calc }) {
  const total = calc.ingresosBrutos || 1
  const segs = [
    { l:'Libre',    v:calc.libre,                c:'#7c6fff' },
    { l:'Ahorro',   v:calc.montoAhorro,          c:'#34c97a' },
    { l:'Fijos',    v:calc.sumaGastosFijosNetos, c:'#e85555' },
    { l:'Tarjetas', v:calc.sumaTarjetas,          c:'#e8a020' },
  ].filter(s => s.v > 0)
  const rest = total - segs.reduce((a,s) => a+s.v, 0)
  if (rest > 0) segs.push({ l:'Disponible', v:rest, c:'#2dcbcb' })
  return (
    <div style={{marginBottom:10}}>
      <div className="dist-bar">
        {segs.map(s => <div key={s.l} style={{width:`${(s.v/total)*100}%`,background:s.c}} title={`${s.l}: ${fmtARS(s.v)}`}/>)}
      </div>
      <div className="dist-legend">
        {segs.map(s => (
          <span key={s.l}><span className="dist-dot" style={{background:s.c}}/>{s.l}: <strong style={{color:'var(--text2)'}}>{fmtARS(s.v)}</strong></span>
        ))}
      </div>
    </div>
  )
}
function FactorRow({ label, factor, monto, color, onChange }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
      <span style={{fontSize:13,fontWeight:700,color,width:40}}>{label}</span>
      <NumInput value={Math.round((factor??0.5)*100)} onChange={onChange} style={{width:60}}/>
      <span style={{fontSize:11,color:'var(--text3)'}}>%</span>
      <span style={{fontSize:13,fontWeight:600,color,marginLeft:'auto'}}>{fmtARS(monto)}</span>
    </div>
  )
}

// ── SectionBlock: grupo compacto con drag & drop ─────────────────────────────
function SectionBlock({ title, subtitle, total, items, onReorder, onAdd, renderItem }) {
  const dragIdx = useRef(null)
  const [overIdx, setOverIdx] = useState(null)

  function onDragStart(e, i) { dragIdx.current = i; e.dataTransfer.effectAllowed = 'move' }
  function onDragOver(e, i) { e.preventDefault(); setOverIdx(i) }
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
    <div className="s-section">
      <div className="s-section-header">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span className="s-section-title">{title}</span>
          {subtitle && <span style={{fontSize:11,color:'var(--text3)'}}>{subtitle}</span>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span className="s-section-total" style={{color:'var(--green)'}}>{total}</span>
          <button className="s-add-btn" onClick={onAdd}>+</button>
        </div>
      </div>
      {items.map((item, i) => (
        <div key={item.id} draggable
          onDragStart={e => onDragStart(e,i)} onDragOver={e => onDragOver(e,i)}
          onDrop={e => onDrop(e,i)} onDragEnd={reset}
          style={{
            display:'flex', alignItems:'center', gap:4,
            borderBottom: overIdx===i ? '2px solid var(--accent)' : '1px solid var(--border)',
            opacity: dragIdx.current===i ? 0.35 : 1,
          }}
        >
          <GripVertical size={12} style={{color:'var(--text3)',flexShrink:0,cursor:'grab'}}/>
          <div style={{flex:1}}>{renderItem(item)}</div>
        </div>
      ))}
      {items.length===0 && <div style={{fontSize:11,color:'var(--text3)',padding:'3px 0'}}>—</div>}
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
