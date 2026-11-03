import React, { useState, useMemo } from 'react'
import { BarChart2, TrendingUp, TrendingDown, CreditCard, Home, ShoppingBag, Zap, PiggyBank } from 'lucide-react'
import { loadMonth, calcMonth, fmtARS, monthName, loadPendingPurchases } from '../store'

export default function Estadisticas({ months }) {
  const [cantMeses, setCantMeses] = useState(Math.min(3, months.length))

  // Tomamos los últimos N meses (months ya viene ordenado de más nuevo a más viejo)
  const mesesSeleccionados = months.slice(0, cantMeses)
  const pending = loadPendingPurchases()

  const datos = useMemo(() => {
    return mesesSeleccionados.map(m => {
      const data = loadMonth(m.id)
      if (!data) return null
      const calc = calcMonth(data, pending)
      return { meta: m, data, calc }
    }).filter(Boolean).reverse() // cronológico para los gráficos
  }, [mesesSeleccionados.map(m => m.id).join(','), cantMeses])

  if (months.length === 0) {
    return (
      <div className="empty-state">
        <BarChart2 size={40} />
        <p>Necesitás al menos un mes cargado para ver estadísticas.</p>
      </div>
    )
  }

  if (datos.length === 0) return null

  // ── Cálculos agregados ────────────────────────────────────────────
  const avg = key => datos.reduce((a, d) => a + d.calc[key], 0) / datos.length
  const sum = key => datos.reduce((a, d) => a + d.calc[key], 0)

  const avgIngresos = avg('ingresosBrutos')
  const avgGastosFijos = avg('sumaGastosFijos')
  const avgTarjetas = avg('sumaTarjetas')
  const avgOtros = avg('sumaOtros')
  const avgAhorro = avg('ahorro')
  const avgLibre = datos.reduce((a, d) => a + (d.data.libreBase || 0), 0) / datos.length

  // Tarjetas detalle promedio
  const tarjetasMap = {}
  datos.forEach(({ calc }) => {
    calc.tarjetasDetalle.forEach(t => {
      if (!tarjetasMap[t.nombre]) tarjetasMap[t.nombre] = []
      tarjetasMap[t.nombre].push(t.total)
    })
  })
  const tarjetasAvg = Object.entries(tarjetasMap).map(([nombre, vals]) => ({
    nombre,
    avg: vals.reduce((a, v) => a + v, 0) / vals.length,
    max: Math.max(...vals),
    min: Math.min(...vals),
  })).sort((a, b) => b.avg - a.avg)

  // Gastos fijos por concepto (promedio)
  const fijosMap = {}
  datos.forEach(({ data }) => {
    data.gastosFijos.forEach(g => {
      if (!g.concepto || !g.monto) return
      if (!fijosMap[g.concepto]) fijosMap[g.concepto] = []
      fijosMap[g.concepto].push(g.monto)
    })
  })
  const fijosAvg = Object.entries(fijosMap)
    .map(([concepto, vals]) => ({
      concepto,
      avg: vals.reduce((a, v) => a + v, 0) / vals.length,
    }))
    .filter(x => x.avg > 0)
    .sort((a, b) => b.avg - a.avg)

  // Valor máximo para la barra de barras
  const maxBar = Math.max(...datos.map(d => d.calc.ingresosBrutos), 1)

  const pctAhorro = avgIngresos > 0 ? (avgAhorro / avgIngresos) * 100 : 0

  return (
    <>
      {/* Selector de meses */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
            Analizar los últimos
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1,2,3,4,5,6].filter(n => n <= months.length).map(n => (
              <button
                key={n}
                onClick={() => setCantMeses(n)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 20,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: cantMeses === n ? 'var(--accent)' : 'var(--bg3)',
                  color: cantMeses === n ? '#fff' : 'var(--text2)',
                  transition: 'all .15s',
                }}
              >
                {n} {n === 1 ? 'mes' : 'meses'}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>
            {mesesSeleccionados.map(m => `${monthName(m.month).slice(0,3)} ${m.year}`).reverse().join(' · ')}
          </span>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="summary-grid" style={{ marginBottom: 20 }}>
        <div className="summary-card green">
          <div className="summary-label">Ingreso promedio</div>
          <div className="summary-value green">{fmtARS(avgIngresos)}</div>
          <div className="summary-sub">por mes</div>
        </div>
        <div className="summary-card red">
          <div className="summary-label">Gasto total promedio</div>
          <div className="summary-value red">{fmtARS(avgGastosFijos + avgTarjetas + avgOtros)}</div>
          <div className="summary-sub">fijos + tarjetas + otros</div>
        </div>
        <div className={`summary-card ${avgAhorro >= 0 ? '' : 'red'}`}>
          <div className="summary-label">Ahorro promedio</div>
          <div className={`summary-value ${avgAhorro >= 0 ? 'accent' : 'red'}`}>{fmtARS(avgAhorro)}</div>
          <div className="summary-sub">{pctAhorro >= 0 ? '+' : ''}{pctAhorro.toFixed(1)}% del ingreso</div>
        </div>
        <div className="summary-card yellow">
          <div className="summary-label">Libre promedio</div>
          <div className="summary-value yellow">{fmtARS(avgLibre)}</div>
          <div className="summary-sub">base por mes</div>
        </div>
      </div>

      {/* Gráfico de barras apiladas por mes */}
      {datos.length > 1 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title"><div className="card-title-left">Evolución mensual</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {datos.map(({ meta, calc, data }) => {
              const fijos = calc.sumaGastosFijos
              const tarj = calc.sumaTarjetas
              const otros = calc.sumaOtros
              const libre = data.libreBase || 0
              const ahorro = Math.max(0, calc.ahorro)
              const total = fijos + tarj + otros + libre + ahorro || 1
              return (
                <div key={meta.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{monthName(meta.month).slice(0,3)} {meta.year}</span>
                    <span>{fmtARS(calc.ingresosBrutos)}</span>
                  </div>
                  <div style={{ display: 'flex', height: 18, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
                    <div style={{ width: `${(fijos/total)*100}%`, background: '#ef4444' }} title={`Fijos: ${fmtARS(fijos)}`} />
                    <div style={{ width: `${(tarj/total)*100}%`, background: '#f59e0b' }} title={`Tarjetas: ${fmtARS(tarj)}`} />
                    <div style={{ width: `${(otros/total)*100}%`, background: '#e879f9' }} title={`Otros: ${fmtARS(otros)}`} />
                    <div style={{ width: `${(libre/total)*100}%`, background: '#6c63ff' }} title={`Libre: ${fmtARS(libre)}`} />
                    <div style={{ width: `${(ahorro/total)*100}%`, background: '#22c55e' }} title={`Ahorro: ${fmtARS(ahorro)}`} />
                  </div>
                </div>
              )
            })}
          </div>
          {/* Leyenda */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 12 }}>
            {[
              { color: '#ef4444', label: 'Fijos' },
              { color: '#f59e0b', label: 'Tarjetas' },
              { color: '#e879f9', label: 'Otros' },
              { color: '#6c63ff', label: 'Libre' },
              { color: '#22c55e', label: 'Ahorro' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                <span style={{ color: 'var(--text2)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tarjetas detalle */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">
          <div className="card-title-left"><CreditCard size={14} /> Gasto promedio por tarjeta</div>
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>últimos {cantMeses} {cantMeses === 1 ? 'mes' : 'meses'}</span>
        </div>
        {tarjetasAvg.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 13 }}>Sin tarjetas cargadas</div>}
        {tarjetasAvg.map(t => {
          const pct = avgTarjetas > 0 ? (t.avg / avgTarjetas) * 100 : 0
          return (
            <div key={t.nombre} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{t.nombre}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent3)' }}>{fmtARS(t.avg)}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>prom/mes</span>
                </div>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${pct}%`, background: '#f59e0b' }} />
              </div>
              {datos.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  <span>Mín: {fmtARS(t.min)}</span>
                  <span>Máx: {fmtARS(t.max)}</span>
                </div>
              )}
              {/* Detalle mes a mes */}
              {datos.length > 1 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {datos.map(({ meta, calc }) => {
                    const tarjeta = calc.tarjetasDetalle.find(x => x.nombre === t.nombre)
                    const val = tarjeta?.total || 0
                    return (
                      <div key={meta.id} style={{
                        background: 'var(--bg3)',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 12,
                        textAlign: 'center',
                      }}>
                        <div style={{ color: 'var(--text3)' }}>{monthName(meta.month).slice(0,3)}</div>
                        <div style={{ fontWeight: 600, color: val > t.avg ? 'var(--red)' : 'var(--text2)' }}>
                          {fmtARS(val)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Gastos fijos detalle */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">
          <div className="card-title-left"><Home size={14} /> Gastos fijos promedio</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {fijosAvg.slice(0, 12).map(g => (
            <div key={g.concepto} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, color: 'var(--text2)' }}>{g.concepto}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{fmtARS(g.avg)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontWeight: 700 }}>
            <span>Total fijos promedio</span>
            <span style={{ color: 'var(--red)' }}>{fmtARS(avgGastosFijos)}</span>
          </div>
        </div>
      </div>

      {/* Tendencias si hay 2+ meses */}
      {datos.length >= 2 && (
        <div className="card">
          <div className="card-title"><div className="card-title-left"><TrendingUp size={14} /> Tendencias</div></div>
          <TendenciaRow
            label="Ingresos"
            actual={datos[datos.length-1].calc.ingresosBrutos}
            anterior={datos[datos.length-2].calc.ingresosBrutos}
          />
          <TendenciaRow
            label="Gastos totales"
            actual={datos[datos.length-1].calc.gastosTotales}
            anterior={datos[datos.length-2].calc.gastosTotales}
            invertido
          />
          <TendenciaRow
            label="Ahorro"
            actual={datos[datos.length-1].calc.ahorro}
            anterior={datos[datos.length-2].calc.ahorro}
          />
          <TendenciaRow
            label="Tarjetas"
            actual={datos[datos.length-1].calc.sumaTarjetas}
            anterior={datos[datos.length-2].calc.sumaTarjetas}
            invertido
          />
        </div>
      )}
    </>
  )
}

function TendenciaRow({ label, actual, anterior, invertido }) {
  const diff = actual - anterior
  const pct = anterior !== 0 ? (diff / Math.abs(anterior)) * 100 : 0
  const sube = diff > 0
  const esBueno = invertido ? !sube : sube
  const color = diff === 0 ? 'var(--text3)' : esBueno ? 'var(--green)' : 'var(--red)'
  const Icon = sube ? TrendingUp : TrendingDown

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 14, color: 'var(--text2)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{fmtARS(actual)}</span>
        {diff !== 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color, fontWeight: 600 }}>
            <Icon size={13} />
            {Math.abs(pct).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}
