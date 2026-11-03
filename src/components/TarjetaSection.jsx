import React, { useState } from 'react'
import { Plus, Trash2, ChevronDown, CreditCard } from 'lucide-react'
import { fmtARS, uid } from '../store'

export default function TarjetaSection({ tarjeta, onUpdate, onRemove }) {
  const [open, setOpen] = useState(true)

  const totalCuotas = tarjeta.items.reduce((a, i) => a + (parseFloat(i.monto) || 0), 0)
  const total = (tarjeta.mantenimiento || 0) + totalCuotas

  function updateItem(id, field, value) {
    onUpdate({
      items: tarjeta.items.map(i => i.id === id ? { ...i, [field]: value } : i)
    })
  }

  function addItem() {
    onUpdate({
      items: [...tarjeta.items, { id: uid(), concepto: '', monto: 0, cuota: '', cuotasTotal: '' }]
    })
  }

  function removeItem(id) {
    onUpdate({ items: tarjeta.items.filter(i => i.id !== id) })
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      {/* Header colapsable */}
      <div className="collapse-header" onClick={() => setOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CreditCard size={15} style={{ color: 'var(--accent3)' }} />
          <input
            className="inline"
            style={{ width: 'auto', background: 'transparent', border: 'none', fontWeight: 700, fontSize: 15, padding: 0 }}
            value={tarjeta.nombre}
            onClick={e => e.stopPropagation()}
            onChange={e => onUpdate({ nombre: e.target.value })}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent3)' }}>{fmtARS(total)}</span>
          <ChevronDown size={16} className={`collapse-arrow ${open ? 'open' : ''}`} />
        </div>
      </div>

      {open && (
        <>
          {/* Mantenimiento */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 8px', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text2)', flex: 1 }}>Mantenimiento / cargo fijo</span>
            <input
              className="inline"
              type="number"
              style={{ width: 120 }}
              value={tarjeta.mantenimiento || 0}
              onChange={e => onUpdate({ mantenimiento: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Items / cuotas */}
          <div className="items-list">
            {tarjeta.items.map(item => (
              <div key={item.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 80px auto',
                gap: 8,
                alignItems: 'center',
                padding: '5px 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <input
                  className="inline"
                  value={item.concepto}
                  placeholder="Concepto"
                  onChange={e => updateItem(item.id, 'concepto', e.target.value)}
                />
                <input
                  className="inline"
                  type="number"
                  value={item.monto}
                  placeholder="Monto"
                  onChange={e => updateItem(item.id, 'monto', parseFloat(e.target.value) || 0)}
                />
                {/* Etiqueta de cuota */}
                <input
                  className="inline"
                  value={item.cuota || ''}
                  placeholder="2/6"
                  style={{ fontSize: 12, textAlign: 'center' }}
                  title="Cuota actual / total (ej: 2/6)"
                  onChange={e => updateItem(item.id, 'cuota', e.target.value)}
                />
                <button className="btn-icon" onClick={() => removeItem(item.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {tarjeta.items.length === 0 && (
              <div style={{ color: 'var(--text3)', fontSize: 13, padding: '6px 0' }}>
                Sin cuotas cargadas
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <button className="btn-add" onClick={addItem}>
              <Plus size={14} /> Agregar cuota / compra
            </button>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Total tarjeta</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent3)' }}>{fmtARS(total)}</div>
            </div>
          </div>

          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={onRemove}>
              <Trash2 size={12} /> Eliminar tarjeta
            </button>
          </div>
        </>
      )}
    </div>
  )
}
