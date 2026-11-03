import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, RefreshCcw, TrendingUp, CreditCard, Home } from 'lucide-react'
import {
  loadMonth, saveMonth, calcMonth, fmtARS, fmtUSD, uid,
  loadPendingPurchases, monthName, getTarjetaColor,
} from '../store'
import LibreCard from '../components/LibreCard'
import TarjetaSection from '../components/TarjetaSection'
import GastosFijosSection from '../components/GastosFijosSection'
import ProyeccionTable from '../components/ProyeccionTable'
import AhorrosPanel from '../components/AhorrosPanel'
import DolarWidget, { useDolar } from '../components/DolarWidget'
import NumInput from '../components/NumInput'

// ── Selector moneda inline ────────────────────────────────────────────────────
function MonedaToggle({ usd, onChange }) {
  return (
    <button
      onClick={() => onChange(!usd)}
      title={usd ? 'Cambiar a ARS' : 'Cambiar a USD'}
      style={{
        padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
        fontSize: 11, fontWeight: 700, lineHeight: 1,
        background: usd ? 'rgba(245,158,11,.2)' : 'var(--bg4)',
        color: usd ? 'var(--yellow)' : 'var(--text3)',
        transition: 'all .15s', whiteSpace: 'nowrap', flexShrink: 0,
      }}
    >
      {usd ? 'USD' : 'ARS'}
    </button>
  )
}

export default function MonthEditor({ monthId, onRefresh, toast }) {
  const [data, setData]     = useState(null)
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

  const set = (key, val) => save({ ...data, [key]: val })

  function updateInItem(listKey, id, field, value) {
    save({ ...data, [listKey]: data[listKey].map(i => i.id === id ? { ...i, [field]: value } : i) })
  }
  function addIn(listKey, defaults = {}) {
    save({ ...data, [listKey]: [...(data[listKey] || []), { id: uid(), concepto: '', monto: 0, usd: false, ...defaults }] })
  }
  function removeFrom(listKey, id) {
    save({ ...data, [listKey]: data[listKey].filter(i => i.id !== id) })
  }
  function updateTarjeta(tid, changes) {
    save({ ...data, tarjetas: data.tarjetas.map(t => t.id === tid ? { ...t, ...changes } : t) })
  }

  if (!data) return <div style={{ padding: 24, color: 'var(--text3)' }}>Cargando…</div>

  // Asegurar campos nuevos si el mes fue creado con versión anterior
  const safeData = {
    ingresosFijos:  data.ingresosFijos  || data.ingresos || [],
    ingresosExtras: data.ingresosExtras || [],
    reintegros:     data.reintegros     || [],
    pctAhorroLibre: data.pctAhorroLibre ?? data.apartado ?? 0.23,
    factorUSD:      data.factorUSD      ?? 0.5,
    factorYPF:      data.factorYPF      ?? 0.5,
    ...data,
  }

  const venta  = dolarVenta  || safeData.dolarVenta  || 0
  const compra = dolarCompra || safeData.dolarCompra || 0
  const calc   = calcMonth(safeData, pending, venta, compra)

  const tabs = [
    { key: 'resumen',  label: 'Resumen' },
    { key: 'ingresos', label: 'Ingresos' },
    { key: 'fijos',    label: 'Gastos fijos' },
    { key: 'tarjetas', label: 'Tarjetas' },
    { key: 'ahorros',  label: 'Ahorros' },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <DolarWidget compra={compra} venta={venta}
          loading={dolarLoading} lastUpdate={lastUpdate}
          error={dolarError} onRefresh={refreshDolar} compact />
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
          <LibreCard calc={calc} data={safeData} pending={pending}
            onSetLibre={v => save({ ...data, libreBase: v })} />

          {/* Config de distribución */}
          <div className="card">
            <div className="card-title"><div className="card-title-left">Distribución del ingreso</div></div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: 'var(--text2)' }}>
                % destinado a ahorro + libre
              </label>
              <NumInput
                value={Math.round((safeData.pctAhorroLibre ?? 0.23) * 100)}
                onChange={v => save({ ...data, pctAhorroLibre: Math.min(1, Math.max(0, v / 100)) })}
                style={{ width: 70 }}
              />
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>%</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: 'var(--text2)' }}>Dinero libre (gustitos)</label>
              <NumInput value={safeData.libreBase ?? 0}
                onChange={v => save({ ...data, libreBase: v })}
                style={{ width: 160 }} />
            </div>

            {/* Visualización */}
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px', fontSize: 13 }}>
              <Row label="Ingresos brutos" val={fmtARS(calc.ingresosBrutos)} color="var(--green)" bold />
              <Row label={`→ Ahorro + libre (${Math.round(calc.pct * 100)}%)`} val={fmtARS(calc.montoAhorroLibre)} color="var(--accent3)" />
              <Row label="   · Libre (gustitos)" val={fmtARS(calc.libre)} color="var(--accent3)" indent />
              <Row label="   · Ahorro del mes" val={fmtARS(calc.montoAhorro)} color="var(--green)" indent />
              <Row label={`→ Para gastos del mes (${Math.round((1 - calc.pct) * 100)}%)`} val={fmtARS(calc.ingresosParaGastos)} color="var(--text)" />
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
                <Row label="Gastos totales" val={fmtARS(calc.gastosTotales)} color="var(--red)" />
                <Row label="Reintegros" val={fmtARS(calc.totalReintegros)} color="var(--green)" />
                <Row label="Lo que te queda" val={fmtARS(calc.presupuesto)}
                  color={calc.presupuesto >= 0 ? 'var(--green)' : 'var(--red)'} bold />
              </div>
            </div>

            {/* Barra de distribución */}
            <div style={{ marginTop: 14 }}>
              <BarraGasto calc={calc} />
            </div>
          </div>

          {/* Resumen tarjetas */}
          <div className="card">
            <div className="card-title"><div className="card-title-left"><CreditCard size={14} /> Tarjetas</div></div>
            {calc.tarjetasDetalle.map(t => {
              const color = getTarjetaColor(t.nombre)
              return (
                <div key={t.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 10px', borderRadius: 6, marginBottom: 4,
                  background: `${color.bg}18`, border: `1px solid ${color.bg}55`,
                }}>
                  <span style={{ fontSize: 14, color: color.text, fontWeight: 600 }}>{t.nombre}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtARS(t.total)}</span>
                    {t.debitos > 0 && <div style={{ fontSize: 11, color: 'var(--text3)' }}>incl. {fmtARS(t.debitos)} débito auto</div>}
                  </div>
                </div>
              )
            })}
          </div>

          <ProyeccionTable proyeccion={calc.proyeccion} currentYear={safeData.year} currentMonth={safeData.month} />
        </>
      )}

      {/* ── INGRESOS ─────────────────────────────────────────── */}
      {activeTab === 'ingresos' && (
        <>
          {/* Fijos */}
          <div className="card">
            <div className="card-title">
              <div className="card-title-left"><TrendingUp size={14} /> Ingresos fijos</div>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>
                {fmtARS(calc.ingresosFijosTotal)}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
              CONICET y UNLP. Se copian automáticamente al crear un nuevo mes.
            </div>
            {(safeData.ingresosFijos || []).map(item => (
              <ItemRow key={item.id} item={item} venta={venta}
                onChange={(f, v) => updateInItem('ingresosFijos', item.id, f, v)}
                onRemove={() => removeFrom('ingresosFijos', item.id)} />
            ))}
            <button className="btn-add" style={{ marginTop: 8 }}
              onClick={() => addIn('ingresosFijos')}>
              <Plus size={13} /> Agregar ingreso fijo
            </button>
          </div>

          {/* Extras */}
          <div className="card">
            <div className="card-title">
              <div className="card-title-left">Ingresos extras</div>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>
                {fmtARS(calc.ingresosExtrasTotal)}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
              Aguinaldo, bonos, freelance, etc. No se copian al mes siguiente.
            </div>
            {(safeData.ingresosExtras || []).map(item => (
              <ItemRow key={item.id} item={item} venta={venta}
                onChange={(f, v) => updateInItem('ingresosExtras', item.id, f, v)}
                onRemove={() => removeFrom('ingresosExtras', item.id)} />
            ))}
            {(!safeData.ingresosExtras || safeData.ingresosExtras.length === 0) && (
              <div style={{ color: 'var(--text3)', fontSize: 13, padding: '6px 0' }}>Sin extras este mes</div>
            )}
            <button className="btn-add" style={{ marginTop: 8 }}
              onClick={() => addIn('ingresosExtras')}>
              <Plus size={13} /> Agregar extra
            </button>
          </div>

          {/* Reintegros */}
          <div className="card">
            <div className="card-title">
              <div className="card-title-left"><RefreshCcw size={14} /> Reintegros / me deben</div>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>
                {fmtARS(calc.totalReintegros)}
              </span>
            </div>
            {(safeData.reintegros || []).map(item => (
              <ItemRow key={item.id} item={item} venta={venta}
                onChange={(f, v) => updateInItem('reintegros', item.id, f, v)}
                onRemove={() => removeFrom('reintegros', item.id)} />
            ))}
            {(!safeData.reintegros || safeData.reintegros.length === 0) && (
              <div style={{ color: 'var(--text3)', fontSize: 13, padding: '6px 0' }}>Sin reintegros</div>
            )}
            <button className="btn-add" style={{ marginTop: 8 }}
              onClick={() => addIn('reintegros')}>
              <Plus size={13} /> Agregar reintegro
            </button>
          </div>

          {/* Resumen */}
          <div className="card">
            <div className="card-title"><div className="card-title-left">Resumen ingresos</div></div>
            <Row label="Fijos" val={fmtARS(calc.ingresosFijosTotal)} color="var(--text2)" />
            <Row label="Extras" val={fmtARS(calc.ingresosExtrasTotal)} color="var(--text2)" />
            <Row label="Reintegros" val={fmtARS(calc.totalReintegros)} color="var(--green)" />
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
              <Row label="Total bruto" val={fmtARS(calc.ingresosBrutos)} color="var(--green)" bold />
            </div>
          </div>
        </>
      )}

      {/* ── GASTOS FIJOS ─────────────────────────────────────── */}
      {activeTab === 'fijos' && (
        <GastosFijosSection
          gastosFijos={safeData.gastosFijos || []}
          tarjetas={safeData.tarjetas || []}
          onChange={gf => save({ ...data, gastosFijos: gf })}
          dolar={venta}
        />
      )}

      {/* ── TARJETAS ─────────────────────────────────────────── */}
      {activeTab === 'tarjetas' && (
        <>
          {(safeData.tarjetas || []).map(tarjeta => (
            <TarjetaSection
              key={tarjeta.id}
              tarjeta={tarjeta}
              onUpdate={ch => updateTarjeta(tarjeta.id, ch)}
              onRemove={() => save({ ...data, tarjetas: data.tarjetas.filter(t => t.id !== tarjeta.id) })}
              debitosAuto={calc.debitosAutoXTarjeta[tarjeta.nombre] || 0}
            />
          ))}
          <button className="btn btn-ghost" style={{ marginBottom: 12 }}
            onClick={() => save({ ...data, tarjetas: [...data.tarjetas, { id: uid(), nombre: 'Nueva tarjeta', mantenimiento: 0, items: [] }] })}>
            <Plus size={14} /> Agregar tarjeta
          </button>
        </>
      )}

      {/* ── AHORROS ──────────────────────────────────────────── */}
      {activeTab === 'ahorros' && (
        <>
          <DolarWidget compra={compra} venta={venta}
            loading={dolarLoading} lastUpdate={lastUpdate}
            error={dolarError} onRefresh={refreshDolar} />

          {/* Distribución del ahorro */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-title"><div className="card-title-left">Distribución del ahorro del mes</div></div>
            <div style={{ background: 'rgba(34,197,94,.07)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
              <div style={{ color: 'var(--text3)', marginBottom: 4 }}>Ahorro del mes disponible para invertir</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{fmtARS(calc.montoAhorro)}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                {fmtARS(calc.ingresosBrutos)} × {Math.round(calc.pct * 100)}% − {fmtARS(calc.libre)} libre
              </div>
            </div>

            <FactorRow
              label="→ USD"
              factor={safeData.factorUSD ?? 0.5}
              monto={calc.montoAhorro * (safeData.factorUSD ?? 0.5)}
              color="var(--yellow)"
              onChange={v => {
                const f = Math.min(1, Math.max(0, v / 100))
                save({ ...data, factorUSD: f, factorYPF: parseFloat((1 - f).toFixed(4)) })
              }}
            />
            <FactorRow
              label="→ YPF"
              factor={safeData.factorYPF ?? 0.5}
              monto={calc.montoAhorro * (safeData.factorYPF ?? 0.5)}
              color="var(--accent3)"
              onChange={v => {
                const f = Math.min(1, Math.max(0, v / 100))
                save({ ...data, factorYPF: f, factorUSD: parseFloat((1 - f).toFixed(4)) })
              }}
            />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              Los porcentajes deben sumar 100%. Al cambiar uno, el otro se ajusta automáticamente.
            </div>
          </div>

          <AhorrosPanel
            dolarCompra={compra}
            dolarVenta={venta}
            ahorroMes={calc.montoAhorro}
            factorUSD={safeData.factorUSD ?? 0.5}
            factorYPF={safeData.factorYPF ?? 0.5}
          />
        </>
      )}
    </>
  )
}

// ── Row de distribución ──────────────────────────────────────────────────────
function Row({ label, val, color, bold, indent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0',
      paddingLeft: indent ? 16 : 0 }}>
      <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color }}>{val}</span>
    </div>
  )
}

// ── Row de factor ahorro ─────────────────────────────────────────────────────
function FactorRow({ label, factor, monto, color, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 14, color, fontWeight: 700, width: 60 }}>{label}</span>
      <NumInput
        value={Math.round(factor * 100)}
        onChange={onChange}
        style={{ width: 70 }}
      />
      <span style={{ fontSize: 13, color: 'var(--text3)' }}>%</span>
      <span style={{ fontSize: 14, fontWeight: 600, color, marginLeft: 'auto' }}>{fmtARS(monto)}</span>
    </div>
  )
}

// ── Barra de distribución ────────────────────────────────────────────────────
function BarraGasto({ calc }) {
  const total = calc.ingresosBrutos || 1
  const segs = [
    { label: 'Libre', val: calc.libre, color: '#6c63ff' },
    { label: 'Ahorro', val: calc.montoAhorro, color: '#22c55e' },
    { label: 'Fijos', val: calc.sumaGastosFijosNetos, color: '#ef4444' },
    { label: 'Tarjetas', val: calc.sumaTarjetas, color: '#f59e0b' },
  ].filter(s => s.val > 0)
  const rest = total - segs.reduce((a, s) => a + s.val, 0)
  if (rest > 0) segs.push({ label: 'Disponible', val: rest, color: '#22d3ee' })
  return (
    <>
      <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
        {segs.map(s => (
          <div key={s.label} style={{ width: `${(s.val / total) * 100}%`, background: s.color }}
            title={`${s.label}: ${fmtARS(s.val)}`} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
        {segs.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <div style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} />
            <span style={{ color: 'var(--text2)' }}>{s.label}</span>
            <span style={{ fontWeight: 600 }}>{fmtARS(s.val)}</span>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Fila de item (ingreso / reintegro) ───────────────────────────────────────
function ItemRow({ item, venta, onChange, onRemove }) {
  const montoARS = item.usd && venta > 0 ? (item.monto || 0) * venta : null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 52px 24px',
      gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
      <input className="inline" value={item.concepto} placeholder="Concepto"
        onChange={e => onChange('concepto', e.target.value)} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <NumInput value={item.monto} onChange={v => onChange('monto', v)}
          usd={item.usd} style={{ width: '100%' }} />
        {item.usd && venta > 0 && item.monto > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>= {fmtARS(montoARS)}</span>
        )}
      </div>
      <button
        onClick={() => onChange('usd', !item.usd)}
        style={{
          padding: '4px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
          fontSize: 11, fontWeight: 700,
          background: item.usd ? 'rgba(245,158,11,.2)' : 'var(--bg4)',
          color: item.usd ? 'var(--yellow)' : 'var(--text3)',
        }}
      >{item.usd ? 'USD' : 'ARS'}</button>
      <button className="btn-icon" onClick={onRemove}><Trash2 size={14} /></button>
    </div>
  )
}
