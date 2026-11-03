import React, { useState } from 'react'
import { X, Copy, FilePlus } from 'lucide-react'
import { monthName, loadMonth, nextMonthFromPrev } from '../store'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function NewMonthModal({ existingMonths, onConfirm, onClose }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [mode, setMode] = useState('copy') // 'copy' | 'blank'

  const alreadyExists = existingMonths.some(m => m.year === parseInt(year) && m.month === parseInt(month))
  const latestMonth = existingMonths[0] // el más reciente

  function handleCreate() {
    if (alreadyExists) return
    if (mode === 'copy' && latestMonth) {
      const prevData = loadMonth(latestMonth.id)
      const nextData = nextMonthFromPrev(prevData)
      // Forzar el año/mes seleccionado por el usuario
      nextData.year = parseInt(year)
      nextData.month = parseInt(month)
      nextData.id = `${year}-${String(month).padStart(2, '0')}`
      onConfirm(parseInt(year), parseInt(month), nextData)
    } else {
      onConfirm(parseInt(year), parseInt(month), null)
    }
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
          <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid var(--red)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
            Ya existe {monthName(month)} {year}
          </div>
        )}

        {latestMonth && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontWeight: 600 }}>¿Cómo crear el mes?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setMode('copy')}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: mode === 'copy' ? 'rgba(108,99,255,.2)' : 'var(--bg3)',
                  outline: mode === 'copy' ? '2px solid var(--accent)' : 'none',
                  color: mode === 'copy' ? 'var(--accent3)' : 'var(--text2)',
                  transition: 'all .15s', textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, marginBottom: 3 }}>
                  <Copy size={14} /> Copiar del anterior
                </div>
                <div style={{ fontSize: 11, opacity: .8 }}>
                  Copia ingresos, fijos y cuotas de {monthName(latestMonth.month)} {latestMonth.year}, avanzando las cuotas y quitando las que terminaron
                </div>
              </button>
              <button
                onClick={() => setMode('blank')}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: mode === 'blank' ? 'rgba(108,99,255,.2)' : 'var(--bg3)',
                  outline: mode === 'blank' ? '2px solid var(--accent)' : 'none',
                  color: mode === 'blank' ? 'var(--accent3)' : 'var(--text2)',
                  transition: 'all .15s', textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, marginBottom: 3 }}>
                  <FilePlus size={14} /> Mes en blanco
                </div>
                <div style={{ fontSize: 11, opacity: .8 }}>Empezar desde cero</div>
              </button>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={alreadyExists} style={{ opacity: alreadyExists ? .5 : 1 }}>
            Crear mes
          </button>
        </div>
      </div>
    </div>
  )
}
