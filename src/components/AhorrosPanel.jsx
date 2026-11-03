import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Check, X } from 'lucide-react'
import { loadSavings, saveSavings, fmtARS, fmtUSD, uid } from '../store'
import NumInput from './NumInput'

async function fetchYPF() {
  const APIS = [
    { url:'https://query1.finance.yahoo.com/v8/finance/chart/YPFD.BA?range=1d&interval=1d', parse:d=>d?.chart?.result?.[0]?.meta?.regularMarketPrice },
    { url:'https://query2.finance.yahoo.com/v8/finance/chart/YPFD.BA?range=1d&interval=1d', parse:d=>d?.chart?.result?.[0]?.meta?.regularMarketPrice },
  ]
  for (const api of APIS) {
    try {
      const r = await window.fetch(api.url, { signal:AbortSignal.timeout(8000) })
      if (!r.ok) continue
      const data = await r.json()
      const val = api.parse(data)
      if (val && val > 0) return parseFloat(val)
    } catch {}
  }
  return null
}

export default function AhorrosPanel({ dolarCompra=0, dolarVenta=0, ahorroMes=0, factorUSD=0.5, factorYPF=0.5 }) {
  const [savings, setSavings] = useState(loadSavings())
  const [ypfPrecio, setYpfPrecio] = useState(null)
  const [loadingYPF, setLoadingYPF] = useState(false)

  const refreshYPF = useCallback(async () => {
    setLoadingYPF(true)
    const p = await fetchYPF()
    if (p) setYpfPrecio(p)
    setLoadingYPF(false)
  }, [])

  useEffect(() => { refreshYPF() }, [])

  function persist(updated) { saveSavings(updated); setSavings(updated) }

  // Valuación con cotización COMPRA (lo que obtendrías si vendieras)
  const valorUSD = (savings.usdUnidades||0) * (dolarCompra||0)
  const precioYPF = ypfPrecio || savings.ypfPrecioUltimo || 0
  const valorYPF  = (savings.ypfAcciones||0) * precioYPF
  const totalARS  = valorUSD + valorYPF

  // Sugerencia del mes
  const montoUSD = ahorroMes * factorUSD
  const montoYPF = ahorroMes * factorYPF
  const usdAComprar  = dolarVenta > 0 ? montoUSD / dolarVenta : 0
  const ypfAComprar  = precioYPF  > 0 ? montoYPF / precioYPF  : 0

  function aceptarSugerencia() {
    const mov = {
      id: uid(), fecha: new Date().toISOString(),
      usdSumado: usdAComprar, ypfSumado: ypfAComprar,
      montoUSD, montoYPF,
      nota: 'Ahorro del mes aceptado',
    }
    persist({
      ...savings,
      usdUnidades:    (savings.usdUnidades||0) + usdAComprar,
      ypfAcciones:    (savings.ypfAcciones||0) + ypfAComprar,
      ypfPrecioUltimo: ypfPrecio || savings.ypfPrecioUltimo,
      movimientos:    [...(savings.movimientos||[]), mov],
    })
  }

  function rechazarSugerencia() {
    const mov = {
      id: uid(), fecha: new Date().toISOString(),
      rechazado: true, nota: 'Sugerencia del mes rechazada',
    }
    persist({ ...savings, movimientos: [...(savings.movimientos||[]), mov] })
  }

  return (
    <div className="s-card" style={{ marginTop: 10 }}>
      {/* Total */}
      <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>
          Total ahorrado en ARS
        </div>
        <div style={{ fontSize:26, fontWeight:800, color:'#22c55e' }}>{fmtARS(totalARS)}</div>
        <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>valuado con cotización compra {fmtARS(dolarCompra)}</div>
      </div>

      {/* USD y YPF */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
        {/* USD */}
        <div style={{ background:'var(--bg3)', borderRadius:7, padding:'10px 12px' }}>
          <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', marginBottom:5 }}>USD</div>
          <div style={{ fontSize:17, fontWeight:700 }}>{fmtUSD(savings.usdUnidades||0)}</div>
          <div style={{ fontSize:12, color:'#22c55e' }}>{fmtARS(valorUSD)}</div>
          <div style={{ fontSize:10, color:'var(--text3)', margin:'4px 0 6px' }}>
            compra {fmtARS(dolarCompra)} · venta {fmtARS(dolarVenta)}
          </div>
          <NumInput value={savings.usdUnidades||0}
            onChange={v => persist({ ...savings, usdUnidades:v })}
            style={{ fontSize:12, width:'100%' }} usd />
        </div>
        {/* YPF */}
        <div style={{ background:'var(--bg3)', borderRadius:7, padding:'10px 12px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', marginBottom:5 }}>YPF (BYMA)</div>
            <button onClick={refreshYPF} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:0 }}>
              <RefreshCw size={11} style={{ animation: loadingYPF?'spin 1s linear infinite':'none' }} />
            </button>
          </div>
          <div style={{ fontSize:17, fontWeight:700 }}>{(savings.ypfAcciones||0).toLocaleString('es-AR',{maximumFractionDigits:4})} acc.</div>
          <div style={{ fontSize:12, color:'#22c55e' }}>{fmtARS(valorYPF)}</div>
          <div style={{ fontSize:10, color:'var(--text3)', margin:'4px 0 6px' }}>
            {precioYPF > 0 ? `${fmtARS(precioYPF)}/acc.` : loadingYPF ? 'cargando…' : 'sin precio'}
          </div>
          <NumInput value={savings.ypfAcciones||0}
            onChange={v => persist({ ...savings, ypfAcciones:v })}
            style={{ fontSize:12, width:'100%' }} />
        </div>
      </div>

      {/* Sugerencia del mes */}
      {ahorroMes > 0 && (
        <div style={{ background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.2)', borderRadius:7, padding:'10px 12px' }}>
          <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', marginBottom:8 }}>
            Sugerencia del mes
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:13, color:'var(--yellow)' }}>
              Comprar {fmtUSD(usdAComprar)} USD
            </span>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--yellow)' }}>{fmtARS(montoUSD)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <span style={{ fontSize:13, color:'var(--accent3)' }}>
              Comprar {ypfAComprar > 0 ? ypfAComprar.toFixed(2) : '—'} acc. YPF
            </span>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--accent3)' }}>{fmtARS(montoYPF)}</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={aceptarSugerencia} style={{
              flex:1, padding:'7px 0', borderRadius:6, border:'none', cursor:'pointer',
              background:'rgba(34,197,94,.2)', color:'#22c55e', fontWeight:700, fontSize:13,
              display:'flex', alignItems:'center', justifyContent:'center', gap:5,
            }}>
              <Check size={14}/> Aceptar
            </button>
            <button onClick={rechazarSugerencia} style={{
              flex:1, padding:'7px 0', borderRadius:6, border:'none', cursor:'pointer',
              background:'rgba(239,68,68,.1)', color:'#ef4444', fontWeight:700, fontSize:13,
              display:'flex', alignItems:'center', justifyContent:'center', gap:5,
            }}>
              <X size={14}/> Rechazar
            </button>
          </div>
        </div>
      )}

      {/* Últimos movimientos */}
      {savings.movimientos?.length > 0 && (
        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', marginBottom:5 }}>Historial</div>
          {savings.movimientos.slice(-5).reverse().map(m => (
            <div key={m.id} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'2px 0', borderBottom:'1px solid var(--border)', color: m.rechazado ? 'var(--text3)' : 'var(--text2)' }}>
              <span>{m.rechazado ? 'Rechazado' : m.nota || 'Ahorro'}</span>
              <span style={{ color:'var(--text3)' }}>{new Date(m.fecha).toLocaleDateString('es-AR')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
