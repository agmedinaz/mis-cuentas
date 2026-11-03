import React, { useState } from 'react'
import { Plus, Trash2, ChevronDown, CreditCard } from 'lucide-react'
import { fmtARS, uid, getTarjetaColor } from '../store'
import NumInput from './NumInput'

export default function TarjetaSection({ tarjeta, onUpdate, onRemove, debitosAuto = 0 }) {
  const [open, setOpen] = useState(true)
  const color = getTarjetaColor(tarjeta.nombre)

  const totalCuotas = (tarjeta.items || []).reduce((a, i) => a + (parseFloat(i.monto) || 0), 0)
  const totalPropio = (tarjeta.mantenimiento || 0) + totalCuotas
  const totalConDebitos = totalPropio + debitosAuto

  function updateItem(id, field, value) {
    onUpdate({ items: tarjeta.items.map(i => i.id === id ? { ...i, [field]: value } : i) })
  }
  function addItem() {
    onUpdate({ items: [...(tarjeta.items || []), { id: uid(), concepto: '', monto: 0, cuota: '', cuotasRestantes: 0 }] })
  }
  function removeItem(id) { onUpdate({ items: tarjeta.items.filter(i => i.id !== id) }) }

  function getCuotasRestantes(item) {
    if (item.cuotasRestantes !== undefined && item.cuotasRestantes !== null) return item.cuotasRestantes
    const p = (item.cuota || '').split('/')
    if (p.length === 2) return Math.max(0, parseInt(p[1]) - parseInt(p[0]))
    return 0
  }
  function updateCuota(id, cuotaStr) {
    const p = cuotaStr.split('/')
    const restantes = p.length === 2 ? Math.max(0, parseInt(p[1]) - parseInt(p[0])) : 0
    onUpdate({ items: tarjeta.items.map(i => i.id === id ? { ...i, cuota: cuotaStr, cuotasRestantes: restantes } : i) })
  }

  return (
    <div style={{ border: `2px solid ${color.bg}`, borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
      <div
        style={{ background: `linear-gradient(135deg, ${color.bg}ee 0%, ${color.bg}99 100%)`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CreditCard size={16} style={{ color: color.text }} />
          <input
            value={tarjeta.nombre} onClick={e => e.stopPropagation()}
            onChange={e => onUpdate({ nombre: e.target.value })}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontWeight: 800, fontSize: 15, color: color.text, cursor: 'text', width: 'auto', maxWidth: 160 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: color.text }}>{fmtARS(totalConDebitos)}</div>
            {debitosAuto > 0 && <div style={{ fontSize: 11, color: `${color.text}99` }}>propio {fmtARS(totalPropio)} + auto {fmtARS(debitosAuto)}</div>}
          </div>
          <ChevronDown size={16} style={{ color: color.text, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </div>
      </div>

      {open && (
        <div style={{ padding: '14px 16px', background: `${color.bg}08` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${color.bg}44` }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>Mantenimiento / cargo fijo</span>
            <NumInput value={tarjeta.mantenimiento || 0} onChange={v => onUpdate({ mantenimiento: v })} style={{ width: 120, fontSize: 13 }} />
          </div>

          {(tarjeta.items || []).length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 72px 80px 20px', gap: 6, fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4, padding: '0 4px' }}>
                <span>Concepto</span><span style={{ textAlign: 'right' }}>Monto</span><span style={{ textAlign: 'center' }}>Cuota</span><span style={{ textAlign: 'center' }}>Quedan</span><span />
              </div>
              {tarjeta.items.map(item => {
                const restantes = getCuotasRestantes(item)
                return (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 72px 80px 20px', gap: 6, alignItems: 'center', padding: '4px 4px', borderBottom: `1px solid ${color.bg}22` }}>
                    <input className="inline" value={item.concepto} placeholder="Concepto"
                      style={{ fontSize: 13, background: 'transparent', borderColor: `${color.bg}44` }}
                      onChange={e => updateItem(item.id, 'concepto', e.target.value)} />
                    <NumInput value={item.monto || 0} onChange={v => updateItem(item.id, 'monto', v)} style={{ fontSize: 13 }} />
                    <input className="inline" value={item.cuota || ''} placeholder="2/6"
                      style={{ fontSize: 12, textAlign: 'center', background: 'transparent', borderColor: `${color.bg}44` }}
                      onChange={e => updateCuota(item.id, e.target.value)} />
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                        background: restantes === 0 ? 'rgba(34,197,94,.15)' : restantes <= 2 ? 'rgba(245,158,11,.15)' : `${color.bg}33`,
                        color: restantes === 0 ? 'var(--green)' : restantes <= 2 ? 'var(--yellow)' : color.text }}>
                        {restantes === 0 ? '✓ última' : `${restantes} más`}
                      </span>
                    </div>
                    <button className="btn-icon" onClick={() => removeItem(item.id)}><Trash2 size={12} /></button>
                  </div>
                )
              })}
            </div>
          )}

          {debitosAuto > 0 && (
            <div style={{ background: `${color.bg}22`, borderRadius: 6, padding: '8px 10px', marginTop: 8, marginBottom: 4, fontSize: 12, color: color.text, border: `1px dashed ${color.bg}` }}>
              <span style={{ fontWeight: 600 }}>Débitos automáticos: {fmtARS(debitosAuto)}</span>
              <span style={{ color: 'var(--text3)', marginLeft: 6 }}>(definidos en Gastos fijos)</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <button className="btn-add" onClick={addItem}><Plus size={13} /> Agregar cuota / compra</button>
            <button className="btn btn-danger" style={{ fontSize: 11, padding: '3px 8px' }} onClick={onRemove}><Trash2 size={11} /> Quitar</button>
          </div>
        </div>
      )}
    </div>
  )
}
