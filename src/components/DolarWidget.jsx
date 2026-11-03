import React, { useState, useEffect, useCallback } from 'react'
import { DollarSign, RefreshCw } from 'lucide-react'
import { fmtARS } from '../store'

// Devuelve { compra, venta } — compra = lo que te pagan por tus dólares,
// venta = lo que pagás cuando comprás dólares
const APIS = [
  {
    url: 'https://api.bluelytics.com.ar/v2/latest',
    parse: d => ({ compra: d?.oficial?.value_buy, venta: d?.oficial?.value_sell }),
  },
  {
    url: 'https://dolarapi.com/v1/dolares/oficial',
    parse: d => ({ compra: d?.compra, venta: d?.venta }),
  },
  {
    url: 'https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial',
    parse: d => {
      const last = Array.isArray(d) ? d[d.length - 1] : d
      return { compra: last?.compra, venta: last?.venta }
    },
  },
]

export function useDolar() {
  const [compra, setCompra] = useState(null)
  const [venta, setVenta]   = useState(null)
  const [loading, setLoading]     = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError]         = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    for (const api of APIS) {
      try {
        const r = await window.fetch(api.url, { signal: AbortSignal.timeout(5000) })
        if (!r.ok) continue
        const data = await r.json()
        const { compra: c, venta: v } = api.parse(data)
        if (c > 0 && v > 0) {
          setCompra(c)
          setVenta(v)
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
    const interval = setInterval(fetch, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetch])

  return { compra, venta, loading, lastUpdate, error, refresh: fetch }
}

// Componente visual
export default function DolarWidget({ compra, venta, loading, lastUpdate, error, onRefresh, compact = false }) {
  if (compact) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)',
        borderRadius: 20, padding: '4px 12px', fontSize: 13,
      }}>
        <DollarSign size={13} style={{ color: 'var(--green)' }} />
        {loading
          ? <span style={{ color: 'var(--text3)' }}>…</span>
          : error
          ? <span style={{ color: 'var(--red)', fontSize: 11 }}>sin datos</span>
          : (
            <>
              <span style={{ color: 'var(--text3)', fontSize: 11 }}>compra</span>
              <span style={{ fontWeight: 700, color: 'var(--green)' }}>{fmtARS(compra)}</span>
              <span style={{ color: 'var(--border)', fontSize: 10 }}>|</span>
              <span style={{ color: 'var(--text3)', fontSize: 11 }}>venta</span>
              <span style={{ fontWeight: 700, color: 'var(--yellow)' }}>{fmtARS(venta)}</span>
            </>
          )}
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
      borderRadius: 10, padding: '14px 18px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          <DollarSign size={13} /> Dólar oficial BCRA
        </div>
        <button onClick={onRefresh} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
      </div>

      {loading && <div style={{ color: 'var(--text3)', fontSize: 13 }}>Obteniendo cotización…</div>}
      {error   && <div style={{ color: 'var(--red)',   fontSize: 13 }}>{error}</div>}

      {!loading && !error && compra && venta && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Compra */}
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                Compra
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{fmtARS(compra)}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, lineHeight: 1.4 }}>
                Precio al que el banco te compra tus dólares → lo usamos para calcular cuánto valen tus ahorros en pesos
              </div>
            </div>
            {/* Venta */}
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                Venta
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--yellow)' }}>{fmtARS(venta)}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, lineHeight: 1.4 }}>
                Precio al que el banco te vende dólares → lo usamos para streaming en USD y para dolarizar ahorros
              </div>
            </div>
          </div>
          {lastUpdate && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, textAlign: 'right' }}>
              Actualizado: {lastUpdate.toLocaleTimeString('es-AR')}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const style = document.createElement('style')
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }'
document.head.appendChild(style)
