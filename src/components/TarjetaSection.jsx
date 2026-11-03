import React, { useState } from 'react'
import { Trash2, ChevronDown } from 'lucide-react'
import { fmtARS, uid, getTarjetaColor } from '../store'
import NumInput from './NumInput'

export default function TarjetaSection({ tarjeta, onUpdate, onRemove, debitosAuto = 0 }) {
  const [open, setOpen] = useState(true)
  const c = getTarjetaColor(tarjeta.nombre)
  const cuotasSum = (tarjeta.items || []).reduce((a, i) => a + (parseFloat(i.monto) || 0), 0)
  const total = (tarjeta.mantenimiento || 0) + cuotasSum + debitosAuto

  function updItem(id, field, val) {
    onUpdate({ items: tarjeta.items.map(i => i.id === id ? { ...i, [field]: val } : i) })
  }
  function addItem() {
    onUpdate({ items: [...(tarjeta.items || []), { id: uid(), concepto: '', monto: 0, cuota: '', cuotasRestantes: 0 }] })
  }
  function rmItem(id) { onUpdate({ items: tarjeta.items.filter(i => i.id !== id) }) }

  function updCuota(id, str) {
    const p = str.split('/')
    const r = p.length === 2 ? Math.max(0, parseInt(p[1]) - parseInt(p[0])) : 0
    onUpdate({ items: tarjeta.items.map(i => i.id === id ? { ...i, cuota: str, cuotasRestantes: r } : i) })
  }

  return (
    <div style={{ marginBottom: 10, border: `1px solid ${c.bg}55`, borderRadius: 6, overflow: 'hidden' }}>
      {/* Header — color de tarjeta, compacto */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          background: c.bg, padding: '6px 10px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            value={tarjeta.nombre}
            onClick={e => e.stopPropagation()}
            onChange={e => onUpdate({ nombre: e.target.value })}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontWeight: 700, fontSize: 13, color: '#fff', cursor: 'text',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{fmtARS(total)}</span>
          <ChevronDown size={14} style={{ color: '#fff', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 0 6px' }}>
          {/* Tabla de items — igual que la planilla */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg3)' }}>
                <th style={th}>Concepto</th>
                <th style={{ ...th, textAlign: 'right' }}>Monto</th>
                <th style={{ ...th, textAlign: 'center' }}>Cuota</th>
                <th style={{ ...th, textAlign: 'center' }}>Quedan</th>
                <th style={{ ...th, width: 20 }}></th>
              </tr>
            </thead>
            <tbody>
              {/* Mantenimiento */}
              <tr style={rowStyle}>
                <td style={td}>
                  <span style={{ color: 'var(--text3)', fontSize: 11 }}>Mantenimiento</span>
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <NumInput value={tarjeta.mantenimiento || 0} onChange={v => onUpdate({ mantenimiento: v })} style={{ width: 100, fontSize: 12, textAlign: 'right' }} />
                </td>
                <td style={td} /><td style={td} /><td style={td} />
              </tr>

              {/* Cuotas */}
              {(tarjeta.items || []).map(item => {
                const r = item.cuotasRestantes ?? (() => {
                  const p = (item.cuota || '').split('/')
                  return p.length === 2 ? Math.max(0, parseInt(p[1]) - parseInt(p[0])) : 0
                })()
                return (
                  <tr key={item.id} style={rowStyle}>
                    <td style={td}>
                      <input className="inline" value={item.concepto} placeholder="Concepto"
                        style={{ fontSize: 12 }}
                        onChange={e => updItem(item.id, 'concepto', e.target.value)} />
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <NumInput value={item.monto || 0} onChange={v => updItem(item.id, 'monto', v)} style={{ width: 100, fontSize: 12 }} />
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <input className="inline" value={item.cuota || ''} placeholder="2/6"
                        style={{ width: 44, fontSize: 12, textAlign: 'center' }}
                        onChange={e => updCuota(item.id, e.target.value)} />
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
                        background: r === 0 ? 'rgba(52,201,122,.15)' : r <= 2 ? 'rgba(232,160,32,.15)' : 'var(--bg4)',
                        color: r === 0 ? 'var(--green)' : r <= 2 ? 'var(--yellow)' : 'var(--text3)',
                      }}>
                        {r === 0 ? 'última' : r}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button className="btn-icon" onClick={() => rmItem(item.id)}><Trash2 size={11} /></button>
                    </td>
                  </tr>
                )
              })}

              {/* Débitos auto */}
              {debitosAuto > 0 && (
                <tr>
                  <td colSpan={5} style={{ ...td, fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', paddingTop: 4 }}>
                    + {fmtARS(debitosAuto)} en débitos automáticos (desde Gastos)
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 10px 2px' }}>
            <button className="s-add-btn" onClick={addItem}>+</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>
                Total: {fmtARS(total)}
              </span>
              <button className="btn-icon" onClick={onRemove} title="Eliminar tarjeta"><Trash2 size={12} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const th = { padding: '4px 8px', fontWeight: 600, fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'left', borderBottom: '1px solid var(--border)' }
const td = { padding: '3px 8px', borderBottom: '1px solid var(--border)' }
const rowStyle = { background: 'transparent' }
