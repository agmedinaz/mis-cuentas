import React, { useState } from 'react'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import { GRUPOS_GASTOS_FIJOS, getTarjetaColor, fmtARS, uid } from '../store'
import NumInput from './NumInput'

const TARJETAS_OPCIONES = ['Tarjeta NX', 'BNA VISA', 'BNA Master']

export default function GastosFijosSection({ gastosFijos, tarjetas, onChange, dolar }) {
  const [openGroups, setOpenGroups] = useState({ Departamento: true, Servicios: true, Personales: true, Streaming: true })

  function toggleGroup(g) {
    setOpenGroups(prev => ({ ...prev, [g]: !prev[g] }))
  }

  function updateItem(id, field, value) {
    onChange(gastosFijos.map(g => g.id === id ? { ...g, [field]: value } : g))
  }

  function addItem(grupo) {
    onChange([...gastosFijos, { id: uid(), concepto: '', monto: 0, grupo, debitoAuto: null, usd: false }])
  }

  function removeItem(id) {
    onChange(gastosFijos.filter(g => g.id !== id))
  }

  // Agrupar
  const grupos = {}
  GRUPOS_GASTOS_FIJOS.forEach(g => { grupos[g] = [] })
  gastosFijos.forEach(g => {
    const grupo = g.grupo || 'Personales'
    if (!grupos[grupo]) grupos[grupo] = []
    grupos[grupo].push(g)
  })

  const totalGlobal = gastosFijos.reduce((a, g) => {
    const montoARS = g.usd && dolar > 0 ? (g.monto || 0) * dolar : (g.monto || 0)
    return a + montoARS
  }, 0)

  return (
    <div>
      {GRUPOS_GASTOS_FIJOS.map(grupo => {
        const items = grupos[grupo] || []
        const totalGrupo = items.reduce((a, g) => {
          const m = g.usd && dolar > 0 ? (g.monto || 0) * dolar : (g.monto || 0)
          return a + m
        }, 0)
        const isOpen = openGroups[grupo]

        return (
          <div key={grupo} className="card" style={{ marginBottom: 12 }}>
            {/* Header del grupo */}
            <div
              className="collapse-header"
              onClick={() => toggleGroup(grupo)}
              style={{ marginBottom: isOpen ? 10 : 0 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text2)' }}>
                  {grupo}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>({items.length})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>{fmtARS(totalGrupo)}</span>
                <ChevronDown size={15} className={`collapse-arrow ${isOpen ? 'open' : ''}`} />
              </div>
            </div>

            {isOpen && (
              <>
                {/* Cabecera de columnas */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 110px 140px 24px',
                  gap: 6, marginBottom: 4,
                  fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase',
                }}>
                  <span>Concepto</span>
                  <span style={{ textAlign: 'right' }}>{grupo === 'Streaming' ? 'USD' : 'Monto'}</span>
                  <span style={{ textAlign: 'center' }}>Débito auto</span>
                  <span />
                </div>

                {items.map(item => {
                  const color = item.debitoAuto ? getTarjetaColor(item.debitoAuto) : null
                  const montoARS = item.usd && dolar > 0 ? (item.monto || 0) * dolar : null

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 110px 140px 24px',
                        gap: 6, alignItems: 'center',
                        padding: '5px 8px', borderRadius: 6, marginBottom: 3,
                        background: color ? `${color.bg}22` : 'transparent',
                        border: color ? `1px solid ${color.bg}66` : '1px solid transparent',
                        transition: 'all .15s',
                      }}
                    >
                      {/* Concepto */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        {color && (
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: color.bg, border: `1px solid ${color.border}`,
                            flexShrink: 0,
                          }} title={`Débito auto: ${item.debitoAuto}`} />
                        )}
                        <input
                          className="inline"
                          value={item.concepto}
                          placeholder="Concepto"
                          style={{ fontSize: 13, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0 }}
                          onChange={e => updateItem(item.id, 'concepto', e.target.value)}
                        />
                      </div>

                      {/* Monto */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        <NumInput
                          value={item.monto || 0}
                          onChange={v => updateItem(item.id, 'monto', v)}
                          style={{ fontSize: 13, width: '100%' }}
                          usd={item.usd}
                        />
                        {item.usd && dolar > 0 && item.monto > 0 && (
                          <span style={{ fontSize: 10, color: 'var(--green)', whiteSpace: 'nowrap' }}>
                            = {fmtARS(montoARS)}
                          </span>
                        )}
                      </div>

                      {/* Débito auto selector */}
                      <select
                        value={item.debitoAuto || ''}
                        onChange={e => updateItem(item.id, 'debitoAuto', e.target.value || null)}
                        style={{
                          fontSize: 11, padding: '4px 6px',
                          background: color ? `${color.bg}33` : 'var(--bg3)',
                          color: color ? color.text : 'var(--text2)',
                          border: `1px solid ${color ? color.border : 'var(--border)'}`,
                          borderRadius: 6, width: '100%', cursor: 'pointer',
                        }}
                      >
                        <option value="">— sin débito —</option>
                        {(tarjetas || []).map(t => (
                          <option key={t.id} value={t.nombre}>{t.nombre}</option>
                        ))}
                      </select>

                      {/* Eliminar */}
                      <button className="btn-icon" onClick={() => removeItem(item.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}

                {/* USD toggle para streaming */}
                {grupo === 'Streaming' && items.some(i => i.usd) && dolar > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <span>Total streaming:</span>
                    <span style={{ fontWeight: 600, color: 'var(--green)' }}>
                      USD {items.filter(i => i.usd).reduce((a, i) => a + (i.monto || 0), 0).toFixed(2)}
                    </span>
                    <span>→</span>
                    <span style={{ fontWeight: 600 }}>
                      {fmtARS(items.filter(i => i.usd).reduce((a, i) => a + (i.monto || 0) * dolar, 0))}
                    </span>
                  </div>
                )}

                <button className="btn-add" style={{ marginTop: 8 }} onClick={() => addItem(grupo)}>
                  <Plus size={13} /> Agregar a {grupo}
                </button>
              </>
            )}
          </div>
        )
      })}

      {/* Total global */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '8px 4px' }}>
        <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>Total gastos fijos:</span>
        <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--red)' }}>{fmtARS(totalGlobal)}</span>
      </div>
    </div>
  )
}
