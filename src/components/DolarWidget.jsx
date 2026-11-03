import React, { useState, useEffect, useCallback } from 'react'
import { DollarSign, RefreshCw } from 'lucide-react'
import { fmtARS } from '../store'

// Cotización dólar oficial BCRA vía API pública argentina
const APIS = [
  { url: 'https://api.bluelytics.com.ar/v2/latest', parse: d => d?.oficial?.value_sell },
  { url: 'https://dolarapi.com/v1/dolares/oficial', parse: d => d?.venta },
  { url: 'https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial', parse: d => d?.[d.length-1]?.venta },
]

export function useDolar() {
  const [dolar, setDolar] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    for (const api of APIS) {
      try {
        const r = await window.fetch(api.url, { signal: AbortSignal.timeout(5000) })
        if (!r.ok) continue
        const data = await r.json()
        const val = api.parse(data)
        if (val && val > 0) {
          setDolar(val)
          setLastUpdate(new Date())
          setLoading(false)
          return
        }
      } catch {}
    }
    setError('No se pudo obtener la cotización')
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 15 * 60 * 1000) // cada 15 min
    return () => clearInterval(interval)
  }, [fetch])

  return { dolar, loading, lastUpdate, error, refresh: fetch }
}

export default function DolarWidget({ dolar, loading, lastUpdate, error, onRefresh, compact = false }) {
  if (compact) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)',
        borderRadius: 20, padding: '3px 10px', fontSize: 13,
      }}>
        <DollarSign size={13} style={{ color: 'var(--green)' }} />
        {loading ? <span style={{ color: 'var(--text3)' }}>…</span>
          : error ? <span style={{ color: 'var(--red)', fontSize: 11 }}>sin datos</span>
          : <span style={{ fontWeight: 700, color: 'var(--green)' }}>{fmtARS(dolar)}</span>}
        <span style={{ color: 'var(--text3)', fontSize: 11 }}>oficial</span>
        <button
          onClick={onRefresh}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0, display: 'flex' }}
        >
          <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(34,197,94,.07)', border: '1px solid rgba(34,197,94,.25)',
      borderRadius: 10, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          <DollarSign size={13} /> Dólar oficial BCRA
        </div>
        <button onClick={onRefresh} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
      </div>
      {loading && <div style={{ color: 'var(--text3)', fontSize: 13 }}>Obteniendo cotización…</div>}
      {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}
      {!loading && !error && dolar && (
        <>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--green)' }}>{fmtARS(dolar)}</div>
          {lastUpdate && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Actualizado: {lastUpdate.toLocaleTimeString('es-AR')}</div>}
        </>
      )}
    </div>
  )
}

// CSS para el spin
const style = document.createElement('style')
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }'
document.head.appendChild(style)
