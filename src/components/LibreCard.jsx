import React from 'react'
import { Zap, ShoppingBag } from 'lucide-react'
import { fmtARS } from '../store'

export default function LibreCard({ calc, data, pending, onSetLibre }) {
  const { libreDisponible, libreBase, sumaPending, pendingForThisMonth } = calc

  const pct = libreBase > 0
    ? Math.max(0, Math.min(100, (libreDisponible / libreBase) * 100))
    : 0

  const state = libreDisponible < 0 ? 'danger'
    : libreDisponible < libreBase * 0.25 ? 'warning'
    : ''

  return (
    <div className="libre-card" style={{ marginBottom: 20 }}>
      <div className="libre-header">
        <div className="libre-title">
          <Zap size={16} />
          Dinero libre disponible
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Base del mes</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>
            {fmtARS(libreBase)}
          </div>
        </div>
      </div>

      <div className={`libre-disponible ${state}`}>
        {fmtARS(libreDisponible)}
      </div>

      {sumaPending > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'rgba(255,255,255,.6)',
          margin: '8px 0 4px',
        }}>
          <ShoppingBag size={13} />
          Compras pendientes: –{fmtARS(sumaPending)}
          <span style={{ fontSize: 11, opacity: .7 }}>({pendingForThisMonth.length} compra{pendingForThisMonth.length !== 1 ? 's' : ''})</span>
        </div>
      )}

      <div className="libre-bar-bg">
        <div className={`libre-bar-fill ${state}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="libre-amounts">
        <span>{Math.round(pct)}% disponible</span>
        {sumaPending > 0 && <span>–{fmtARS(sumaPending)} en pendientes</span>}
      </div>

      {pendingForThisMonth.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 6 }}>
            COMPRAS QUE IMPACTAN ESTE MES
          </div>
          {pendingForThisMonth.map(p => (
            <div key={p.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              color: 'rgba(255,255,255,.7)',
              marginBottom: 4,
            }}>
              <span>{p.concepto}{p.tarjeta ? ` · ${p.tarjeta}` : ''}</span>
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>–{fmtARS(p.monto)}</span>
            </div>
          ))}
        </div>
      )}

      {pendingForThisMonth.length === 0 && sumaPending === 0 && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 8 }}>
          Sin compras pendientes que afecten este mes. Usá "Compras pendientes" para registrar compras con tarjeta anticipadas.
        </div>
      )}
    </div>
  )
}
