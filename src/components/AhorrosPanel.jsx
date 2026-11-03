import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Check, X } from 'lucide-react'
import { loadSavings, saveSavings, fmtARS, fmtUSD, uid } from '../store'
import NumInput from './NumInput'

async function fetchYPF() {
  const urls = [
    'https://query1.finance.yahoo.com/v8/finance/chart/YPFD.BA?range=1d&interval=1d',
    'https://query2.finance.yahoo.com/v8/finance/chart/YPFD.BA?range=1d&interval=1d',
  ]
  for (const url of urls) {
    try {
      const r = await window.fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!r.ok) continue
      const d = await r.json()
      const v = d?.chart?.result?.[0]?.meta?.regularMarketPrice
      if (v > 0) return parseFloat(v)
    } catch {}
  }
  return null
}

export default function AhorrosPanel({ dolarCompra=0, dolarVenta=0, ahorroMes=0, factorUSD=0.5, factorYPF=0.5, monthId='' }) {
  const [sav, setSav]           = useState(loadSavings())
  const [ypfPrecio, setYpfP]    = useState(null)
  const [loadingYPF, setLYPF]   = useState(false)

  const decisionKey = `mc_dec_${monthId}`
  const decision    = (() => { try { return JSON.parse(localStorage.getItem(decisionKey)) } catch { return null } })()

  const refreshYPF = useCallback(async () => {
    setLYPF(true)
    const p = await fetchYPF()
    if (p) { setYpfP(p); setSav(s => { const u={...s,ypfPrecioUltimo:p}; saveSavings(u); return u }) }
    setLYPF(false)
  }, [])
  useEffect(() => { refreshYPF() }, [])

  function persist(u) { saveSavings(u); setSav(u) }

  const precio    = ypfPrecio || sav.ypfPrecioUltimo || 0
  const valorUSD  = (sav.usdUnidades||0) * (dolarCompra||0)
  const valorYPF  = (sav.ypfAcciones||0) * precio
  const totalARS  = valorUSD + valorYPF

  const montoUSD    = ahorroMes * factorUSD
  const montoYPF    = ahorroMes * factorYPF
  const usdAComprar = dolarVenta>0 ? montoUSD/dolarVenta : 0
  const ypfAComprar = precio>0     ? montoYPF/precio     : 0

  function aceptar() {
    const mov = { id:uid(), fecha:new Date().toISOString(), usdSumado:usdAComprar, ypfSumado:ypfAComprar, montoUSD, montoYPF, nota:'Ahorro del mes aceptado' }
    persist({ ...sav, usdUnidades:(sav.usdUnidades||0)+usdAComprar, ypfAcciones:(sav.ypfAcciones||0)+ypfAComprar, ypfPrecioUltimo:precio||sav.ypfPrecioUltimo, movimientos:[...(sav.movimientos||[]),mov] })
    localStorage.setItem(decisionKey, JSON.stringify({ tipo:'aceptado', fecha:new Date().toISOString(), usdSumado:usdAComprar, ypfSumado:ypfAComprar }))
  }
  function rechazar() {
    const mov = { id:uid(), fecha:new Date().toISOString(), rechazado:true, nota:'Rechazado' }
    persist({ ...sav, movimientos:[...(sav.movimientos||[]),mov] })
    localStorage.setItem(decisionKey, JSON.stringify({ tipo:'rechazado', fecha:new Date().toISOString() }))
  }
  function deshacer() {
    if (!decision) return
    if (decision.tipo==='aceptado') {
      persist({ ...sav, usdUnidades:Math.max(0,(sav.usdUnidades||0)-(decision.usdSumado||0)), ypfAcciones:Math.max(0,(sav.ypfAcciones||0)-(decision.ypfSumado||0)), movimientos:(sav.movimientos||[]).slice(0,-1) })
    } else {
      persist({ ...sav, movimientos:(sav.movimientos||[]).slice(0,-1) })
    }
    localStorage.removeItem(decisionKey)
  }

  // Compact row helper
  const R = ({label, right, children}) => (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid var(--border)'}}>
      <span style={{fontSize:13,color:'var(--text2)',minWidth:120}}>{label}</span>
      {children || <span style={{fontSize:13,fontWeight:600}}>{right}</span>}
    </div>
  )

  return (
    <div style={{fontSize:13}}>
      {/* ── Totales ── */}
      <div style={sec}>
        <div style={secHdr}>Total ahorrado</div>
        <R label="En ARS (hoy)" right={<span style={{fontSize:16,fontWeight:800,color:'var(--green)'}}>{fmtARS(totalARS)}</span>}/>
        <R label={`USD × compra ${fmtARS(dolarCompra)}`} right={fmtARS(valorUSD)}/>
        <R label={`YPF × ${precio>0?fmtARS(precio)+'/acc.':'sin precio'}`} right={fmtARS(valorYPF)}/>
      </div>

      {/* ── USD ── */}
      <div style={sec}>
        <div style={secHdr}>USD</div>
        <R label="Cantidad (USD)">
          <NumInput value={sav.usdUnidades||0} onChange={v=>persist({...sav,usdUnidades:v})} style={{width:130,fontSize:13}} usd/>
        </R>
        <R label="Valor en ARS" right={fmtARS(valorUSD)}/>
        <div style={{fontSize:11,color:'var(--text3)',padding:'2px 0'}}>compra {fmtARS(dolarCompra)} · venta {fmtARS(dolarVenta)}</div>
      </div>

      {/* ── YPF ── */}
      <div style={sec}>
        <div style={{...secHdr,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>YPF (BYMA)</span>
          <button onClick={refreshYPF} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',padding:0,display:'flex',alignItems:'center',gap:4,fontSize:11}}>
            <RefreshCw size={11} style={{animation:loadingYPF?'spin 1s linear infinite':'none'}}/>
            {precio>0 ? fmtARS(precio)+'/acc.' : 'sin precio'}
          </button>
        </div>
        <R label="Acciones">
          <NumInput value={sav.ypfAcciones||0} onChange={v=>persist({...sav,ypfAcciones:v})} style={{width:130,fontSize:13}}/>
        </R>
        <R label="Valor en ARS" right={fmtARS(valorYPF)}/>
      </div>

      {/* ── Sugerencia del mes ── */}
      {ahorroMes > 0 && (
        <div style={sec}>
          <div style={secHdr}>Sugerencia del mes · {fmtARS(ahorroMes)}</div>
          <R label={`USD (${Math.round(factorUSD*100)}%)`} right={<span style={{color:'var(--yellow)'}}>{fmtARS(montoUSD)} ≈ {fmtUSD(usdAComprar)}</span>}/>
          <R label={`YPF (${Math.round(factorYPF*100)}%)`} right={<span style={{color:'var(--accent3)'}}>{fmtARS(montoYPF)}{ypfAComprar>0?` ≈ ${ypfAComprar.toFixed(2)} acc.`:''}</span>}/>
          <div style={{paddingTop:6}}>
            {decision ? (
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:12,color:decision.tipo==='aceptado'?'var(--green)':'var(--text3)'}}>
                  {decision.tipo==='aceptado'?'✓ Aceptado':'✗ Rechazado'} · {new Date(decision.fecha).toLocaleDateString('es-AR')}
                </span>
                <button onClick={deshacer} style={smBtn}>Deshacer</button>
              </div>
            ) : (
              <div style={{display:'flex',gap:6}}>
                <button onClick={aceptar} style={{...smBtn,borderColor:'rgba(52,201,122,.4)',color:'var(--green)'}}>
                  <Check size={11}/> Aceptar
                </button>
                <button onClick={rechazar} style={{...smBtn,borderColor:'rgba(232,85,85,.3)',color:'var(--red)'}}>
                  <X size={11}/> Rechazar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Historial ── */}
      {(sav.movimientos||[]).length > 0 && (
        <div style={sec}>
          <div style={secHdr}>Historial</div>
          {(sav.movimientos||[]).slice(-6).reverse().map(m => (
            <div key={m.id} style={{display:'flex',justifyContent:'space-between',padding:'2px 0',borderBottom:'1px solid var(--border)',fontSize:12,color:m.rechazado?'var(--text3)':'var(--text2)'}}>
              <span>{m.rechazado?'Rechazado':m.nota||'Ahorro'}</span>
              <span style={{color:'var(--text3)'}}>{new Date(m.fecha).toLocaleDateString('es-AR')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const sec    = { marginBottom:10, borderBottom:'1px solid var(--border)', paddingBottom:8 }
const secHdr = { fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }
const smBtn  = { padding:'2px 8px', borderRadius:3, border:'1px solid var(--border)', background:'none', cursor:'pointer', fontSize:11, fontWeight:600, display:'inline-flex', alignItems:'center', gap:3 }
