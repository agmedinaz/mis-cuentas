import React, { useState } from 'react'
import { X } from 'lucide-react'
import { monthName } from '../store'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function NewMonthModal({ existingMonths, onConfirm, onClose }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const alreadyExists = existingMonths.some(
    m => m.year === parseInt(year) && m.month === parseInt(month)
  )

  function handleCreate() {
    if (alreadyExists) return
    onConfirm(parseInt(year), parseInt(month), null)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div className="modal-title" style={{ margin: 0 }}>Nuevo mes</div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Año</label>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Mes</label>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))}>
              {MONTHS.map(m => <option key={m} value={m}>{monthName(m)}</option>)}
            </select>
          </div>
        </div>

        {alreadyExists && (
          <div style={{
            background: 'rgba(239,68,68,.1)',
            border: '1px solid var(--red)',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 13,
            color: 'var(--red)',
            marginBottom: 14,
          }}>
            Ya existe un mes para {monthName(month)} {year}
          </div>
        )}

        <div style={{
          background: 'var(--bg3)',
          borderRadius: 8,
          padding: '12px 14px',
          fontSize: 13,
          color: 'var(--text2)',
          marginBottom: 18,
          lineHeight: 1.6,
        }}>
          Se va a crear un mes vacío para <strong style={{ color: 'var(--text)' }}>
            {monthName(month)} {year}
          </strong>. Podés cargar todos los datos directamente en la app.
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={alreadyExists}
            style={{ opacity: alreadyExists ? .5 : 1 }}
          >
            Crear mes
          </button>
        </div>
      </div>
    </div>
  )
}
