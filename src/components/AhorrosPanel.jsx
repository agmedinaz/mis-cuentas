import React, { useState, useEffect, useCallback } from 'react'
import { PiggyBank, Plus, Minus, RefreshCw, TrendingUp } from 'lucide-react'
import { loadSavings, saveSavings, fmtARS, fmtUSD, uid } from '../store'
import NumInput from './NumInput'

// Cotización YPF en BYMA (pesos argentinos)
// Usamos Yahoo Finance que es el más confiable sin API key
async function fetchYPF() {
  const APIS = [
    // Yahoo Finance — YPFD.BA es YPF en BYMA (Buenos Aires)
    {
      url: 'https://query1.finance.yahoo.com/v8/finance/chart/YPFD.BA?range=1d&interval=1d&includePrePost=false',
      parse: d => d?.chart?.result?.[0]?.meta?.regularMarketPrice
             || d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.find(Boolean),
    },
    // Alternativa con query2
    {
      url: 'https://query2.finance.yahoo.com/v8/finance/chart/YPFD.BA?range=1d&interval=1d',
      parse: d => d?.chart?.result?.[0]?.meta?.regularMarketPrice,
    },
    // Stooq como tercer fallback
    {
      url: 'https://stooq.com/q/l/?s=ypfd.ba&f=sd2t2ohlcv&e=json',
      parse: d => d?.symbols?.[0]?.close,
    },
  ]
  for (const api of APIS) {
    try {
      const r = await window.fetch(api.url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/json' },
      })
      if (!r.ok) continue
      const data = await r.json()
      const val = api.parse(data)
      if (val && val > 0) return parseFloat(val)
    } catch {}
  }
  return null
}

export default function AhorrosPanel({ dolarCompra = 0, dolarVenta = 0, ahorroMes = 0, factorUSD = 0.5, factorYPF = 0.5 }) {
  const [savings, setSavings] = useState(loadSavings())
  const [ypfPrecio, setYpfPrecio] = useState(null)
  const [loadingYPF, setLoadingYPF] = useState(false)
  const [showMovModal, setShowMovModal] = useState(false)
  const [movForm, setMovForm] = useState({ tipo: 'compra_ypf', monto: '', cantidad: '', nota: '' })

  const refreshYPF = useCallback(async () => {
    setLoadingYPF(true)
    const precio = await fetchYPF()
    setYpfPrecio(precio)
    setLoadingYPF(false)
  }, [])

  useEffect(() => { refreshYPF() }, [])

  function persistSavings(updated) {
    saveSavings(updated)
    setSavings(updated)
  }

  // Valores actuales
  // Para saber cuánto vale en pesos usamos cotización COMPRA
  // (lo que el banco te pagaría si quisieras vender tus dólares)
  const valorUSD = (savings.usdAcciones || 0) * (dolarCompra || 0)
  const valorYPF = (savings.ypfAcciones || 0) * (ypfPrecio || savings.ypfPrecioUltimo || 0)
  const totalARS = valorUSD + valorYPF

  function agregarMovimiento() {
    const mov = {
      id: uid(),
      fecha: new Date().toISOString(),
      tipo: movForm.tipo,
      monto: parseFloat(movForm.monto) || 0,
      cantidad: parseFloat(movForm.cantidad) || 0,
      nota: movForm.nota,
    }

    let updated = { ...savings }
    updated.movimientos = [...(savings.movimientos || []), mov]

    if (mov.tipo === 'compra_usd') updated.usdAcciones = (savings.usdAcciones || 0) + mov.cantidad
    if (mov.tipo === 'venta_usd') updated.usdAcciones = Math.max(0, (savings.usdAcciones || 0) - mov.cantidad)
    if (mov.tipo === 'compra_ypf') {
      updated.ypfAcciones = (savings.ypfAcciones || 0) + mov.cantidad
      if (ypfPrecio) updated.ypfPrecioUltimo = ypfPrecio
    }
    if (mov.tipo === 'venta_ypf') updated.ypfAcciones = Math.max(0, (savings.ypfAcciones || 0) - mov.cantidad)

    persistSavings(updated)
    setShowMovModal(false)
    setMovForm({ tipo: 'compra_ypf', monto: '', cantidad: '', nota: '' })
  }

  const tiposMovimiento = [
    { value: 'compra_usd', label: 'Compra USD' },
    { value: 'venta_usd', label: 'Venta USD' },
    { value: 'compra_ypf', label: 'Compra acciones YPF' },
    { value: 'venta_ypf', label: 'Venta acciones YPF' },
  ]

  const esTipoUSD = movForm.tipo.includes('usd')

  return (
    <div className="card" style={{ borderColor: 'rgba(34,197,94,.3)', background: 'rgba(34,197,94,.04)' }}>
      <div className="card-title">
        <div className="card-title-left" style={{ color: 'var(--green)' }}>
          <PiggyBank size={14} /> Ahorros e inversiones
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 12, padding: '3px 8px' }} onClick={() => setShowMovModal(true)}>
          <Plus size={13} /> Movimiento
        </button>
      </div>

      {/* Sugerencia del mes */}
      {ahorroMes > 0 && (
        <div style={{ background: 'rgba(34,197,94,.08)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Sugerencia para este mes</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--yellow)' }}>
            <span>Comprar USD ({Math.round(factorUSD * 100)}%)</span>
            <span style={{ fontWeight: 700 }}>
              {fmtARS(ahorroMes * factorUSD)}
              {dolarVenta > 0 && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>
                ≈ {fmtUSD(ahorroMes * factorUSD / dolarVenta)}
              </span>}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent3)', marginTop: 3 }}>
            <span>Comprar YPF ({Math.round(factorYPF * 100)}%)</span>
            <span style={{ fontWeight: 700 }}>
              {fmtARS(ahorroMes * factorYPF)}
              {ypfPrecio > 0 && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>
                ≈ {((ahorroMes * factorYPF) / ypfPrecio).toFixed(1)} acc.
              </span>}
            </span>
          </div>
        </div>
      )}

      {/* Total en pesos */}
      <div style={{ textAlign: 'center', marginBottom: 16, padding: '12px 0', borderBottom: '1px solid rgba(34,197,94,.2)' }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Total ahorrado en ARS</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--green)' }}>{fmtARS(totalARS)}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>USD + YPF convertidos al día de hoy</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* USD */}
        <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
            USD (dólares)
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtUSD(savings.usdAcciones || 0)}</div>
          <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>{fmtARS(valorUSD)}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, lineHeight: 1.5 }}>
            Valuado a compra {fmtARS(dolarCompra || 0)}
            {dolarVenta > 0 && <><br />Costo comprar: {fmtARS(dolarVenta || 0)}/USD</>}
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>Cantidad (editar directo)</div>
            <NumInput
              value={savings.usdAcciones || 0}
              onChange={v => persistSavings({ ...savings, usdAcciones: v })}
              style={{ fontSize: 13 }}
            />
          </div>
        </div>

        {/* YPF */}
        <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>YPF (acciones BYMA)</span>
            <button onClick={refreshYPF} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0, display: 'flex' }}>
              <RefreshCw size={11} style={{ animation: loadingYPF ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{(savings.ypfAcciones || 0).toLocaleString('es-AR')} acc.</div>
          {ypfPrecio ? (
            <div style={{ fontSize: 13, color: 'var(--green)' }}>
              {fmtARS(valorYPF)} <span style={{ color: 'var(--text3)', fontSize: 11 }}>@ {fmtARS(ypfPrecio)}/acc.</span>
            </div>
          ) : savings.ypfPrecioUltimo ? (
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>último: {fmtARS(savings.ypfPrecioUltimo)}/acc. (sin conexión)</div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{loadingYPF ? 'Obteniendo precio…' : 'Sin precio'}</div>
          )}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>Acciones (editar directo)</div>
            <NumInput
              value={savings.ypfAcciones || 0}
              onChange={v => persistSavings({ ...savings, ypfAcciones: v })}
              style={{ fontSize: 13 }}
            />
          </div>
        </div>
      </div>

      {/* Historial de movimientos recientes */}
      {savings.movimientos?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Últimos movimientos</div>
          {savings.movimientos.slice(-5).reverse().map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text2)' }}>
                {tiposMovimiento.find(t => t.value === m.tipo)?.label || m.tipo}
                {m.nota ? ` · ${m.nota}` : ''}
              </span>
              <span style={{ color: 'var(--text3)' }}>{new Date(m.fecha).toLocaleDateString('es-AR')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Modal movimiento */}
      {showMovModal && (
        <div className="modal-overlay" onClick={() => setShowMovModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Registrar movimiento</div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select value={movForm.tipo} onChange={e => setMovForm(f => ({ ...f, tipo: e.target.value }))}>
                {tiposMovimiento.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{esTipoUSD ? 'Cantidad de USD' : 'Cantidad de acciones'}</label>
              <NumInput value={parseFloat(movForm.cantidad) || 0} onChange={v => setMovForm(f => ({ ...f, cantidad: v }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Monto en pesos (referencia)</label>
              <NumInput value={parseFloat(movForm.monto) || 0} onChange={v => setMovForm(f => ({ ...f, monto: v }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Nota (opcional)</label>
              <input value={movForm.nota} onChange={e => setMovForm(f => ({ ...f, nota: e.target.value }))} placeholder="Ej: Compra en bróker" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowMovModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={agregarMovimiento}>Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
