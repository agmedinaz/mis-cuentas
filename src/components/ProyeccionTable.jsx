import React from 'react'
import { fmtARS, monthName } from '../store'

export default function ProyeccionTable({ proyeccion, currentYear, currentMonth }) {
  if (!proyeccion?.length) return null

  // Generar nombres de meses a partir del mes actual
  const meses = proyeccion.map((_, i) => {
    const totalMes = currentMonth + i
    const m = ((totalMes - 1) % 12) + 1
    const y = currentYear + Math.floor((totalMes - 1) / 12)
    return { m, y, label: monthName(m).slice(0, 3) + ' ' + y }
  })

  return (
    <div className="card">
      <div className="card-title">
        <div className="card-title-left">Proyección próximos meses</div>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>a medida que vencen cuotas</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text3)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}></th>
              {meses.map((m, i) => (
                <th key={i} style={{
                  textAlign: 'right', padding: '6px 8px',
                  color: i === 0 ? 'var(--accent3)' : 'var(--text3)',
                  fontWeight: i === 0 ? 700 : 600, fontSize: 11, textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>
                  {m.label}
                  {i === 0 && <span style={{ display: 'block', fontSize: 9, color: 'var(--accent3)' }}>actual</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Gastos fijos" data={proyeccion} field="gastosFijos" color="var(--red)" meses={meses} />
            <Row label="Presupuesto" data={proyeccion} field="presupuesto" color="var(--green)" meses={meses} />
            <Row label="% ahorro+libre" data={proyeccion} field="porcentaje" color="var(--text2)" meses={meses} isPercent />
            <Row label="Libre" data={proyeccion} field="libre" color="var(--accent3)" meses={meses} />
            <Row label="Ahorro" data={proyeccion} field="ahorro" color="var(--green)" meses={meses} />
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({ label, data, field, color, meses, isPercent }) {
  return (
    <tr style={{ borderTop: '1px solid var(--border)' }}>
      <td style={{ padding: '7px 8px', color: 'var(--text2)', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</td>
      {data.map((d, i) => {
        const val = field === 'porcentaje'
          ? (d.presupuesto > 0 && d.gastosFijos > 0 ? ((d.ahorro + d.libre) / (d.gastosFijos + d.ahorro + d.libre + d.presupuesto) * 100) : 0)
          : d[field]
        return (
          <td key={i} style={{
            textAlign: 'right', padding: '7px 8px',
            color: i === 0 ? color : 'var(--text2)',
            fontWeight: i === 0 ? 700 : 400,
          }}>
            {isPercent ? `${val.toFixed(1)}%` : fmtARS(val)}
          </td>
        )
      })}
    </tr>
  )
}
